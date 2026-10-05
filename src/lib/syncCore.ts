import type { AppData, DayRecord, FoodEntry } from "./types";

/**
 * The merging half of sync, with no network in it so it can be tested on its own.
 *
 * The app's data is cut into small documents — one per sheet, workout, meal, weigh-in day and
 * so on — so two devices can each add things without one overwriting the other. Each document
 * carries the time it last changed. When both devices have changed the same document, the newer
 * change wins; everything else just merges.
 */

export interface KeyMeta {
  /** Fingerprint of the document as last agreed with the cloud. */
  h: string;
  /** When this document last changed (ms). */
  ts: number;
  /** True once it has been deleted. */
  del?: boolean;
  /** Changed here and not yet confirmed as saved in the cloud. */
  dirty?: boolean;
}

export interface SyncMeta {
  uid: string;
  keys: Record<string, KeyMeta>;
  /** The first merge with the cloud has happened on this device. */
  first: boolean;
}

export interface RemoteDoc {
  key: string;
  ts: number;
  deleted?: boolean;
  /** The document as a JSON string. */
  data?: string;
}

// ───────────── Canonical JSON + fingerprint ─────────────

/** JSON with sorted keys and no undefined, so the same data always gives the same string. */
export function stable(v: unknown): string {
  if (v === undefined) return "null";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map((x) => stable(x)).join(",") + "]";
  const o = v as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of Object.keys(o).sort()) if (o[k] !== undefined) parts.push(JSON.stringify(k) + ":" + stable(o[k]));
  return "{" + parts.join(",") + "}";
}

/** cyrb53 — a small, well-spread 53-bit hash. */
export function hash(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + ":" + s.length;
}

/** Remember the string for an object, so an unchanged sheet isn't re-serialised on every tap. */
const strCache = new WeakMap<object, string>();
function cached(o: object): string {
  let s = strCache.get(o);
  if (s === undefined) {
    s = stable(o);
    strCache.set(o, s);
  }
  return s;
}

// ───────────── Cutting the app's data into documents ─────────────

const K = {
  profile: "profile",
  nutrition: "nutrition",
  mealPlan: "mealPlan",
  lastWeights: "lastWeights",
  favourites: "favourites",
};

/** Sheet readers are per-device settings, so they stay out of the cloud. */
function syncedProfile(p: AppData["profile"]) {
  const { readerUrl: _u, readerPasscode: _p, ...rest } = p;
  return rest;
}

/** Every document in the app, as key → canonical JSON string. */
export function explode(s: AppData): Map<string, string> {
  const m = new Map<string, string>();
  m.set(K.profile, stable(syncedProfile(s.profile)));
  m.set(K.nutrition, cached(s.nutrition));
  m.set(K.mealPlan, cached(s.mealPlan));
  m.set(K.lastWeights, cached(s.lastWeights));
  m.set(K.favourites, cached(s.favourites));
  for (const p of s.programs) m.set(`program:${p.id}`, cached(p));
  for (const x of s.sessions) m.set(`session:${x.id}`, cached(x));
  for (const x of s.customExercises) m.set(`exercise:${x.id}`, cached(x));
  for (const x of s.foodFavourites) m.set(`foodfav:${x.id}`, cached(x));
  for (const [date, day] of Object.entries(s.days)) {
    if (day.water !== undefined || day.weight !== undefined) {
      m.set(`day:${date}`, stable({ date, water: day.water, weight: day.weight }));
    }
    for (const f of day.food) m.set(`food:${date}:${f.id}`, cached({ date, entry: f }));
  }
  return m;
}

/** When a document was last meaningfully touched, if it says so itself. */
function stampOf(key: string, str: string | undefined): number | undefined {
  if (!str) return undefined;
  try {
    const v = JSON.parse(str);
    if (key.startsWith("program:")) return v.updatedAt;
    if (key.startsWith("session:")) return v.finishedAt ?? v.startedAt;
    if (key.startsWith("food:")) return v.entry?.loggedAt;
  } catch {
    /* fall through */
  }
  return undefined;
}

const parse = <T>(s: string | undefined): T | undefined => {
  if (s === undefined) return undefined;
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
};

/** Keep the order the device already has; anything new goes on the end. */
function inOrder<T extends { id: string }>(local: T[], fresh: T[]): T[] {
  const byId = new Map(fresh.map((x) => [x.id, x]));
  const out: T[] = [];
  for (const l of local) {
    const f = byId.get(l.id);
    if (f) {
      out.push(f);
      byId.delete(l.id);
    }
  }
  for (const f of byId.values()) out.push(f);
  return out;
}

/** Put the documents back together into the app's data. Unchanged things keep their identity. */
export function implode(local: AppData, docs: Map<string, string>): AppData {
  const localStr = explode(local);
  /** Re-use the device's own object when the document hasn't changed. */
  const reuse = <T extends object>(key: string, localObj: T | undefined): T | undefined => {
    const d = docs.get(key);
    if (d === undefined) return undefined;
    if (localObj !== undefined && localStr.get(key) === d) return localObj;
    return parse<T>(d);
  };
  const collect = <T extends { id: string }>(prefix: string, localList: T[]): T[] => {
    const localById = new Map(localList.map((x) => [x.id, x]));
    const fresh: T[] = [];
    for (const key of docs.keys()) {
      if (!key.startsWith(prefix)) continue;
      const id = key.slice(prefix.length);
      const v = reuse<T>(key, localById.get(id));
      if (v) fresh.push(v);
    }
    return inOrder(localList, fresh);
  };

  const profileDoc = parse<Partial<AppData["profile"]>>(docs.get(K.profile));
  const days: Record<string, DayRecord> = {};
  const food = new Map<string, FoodEntry[]>();
  for (const [key, str] of docs) {
    if (key.startsWith("food:")) {
      const v = parse<{ date: string; entry: FoodEntry }>(str);
      if (!v) continue;
      const list = food.get(v.date) ?? [];
      list.push(v.entry);
      food.set(v.date, list);
    }
  }
  const dates = new Set<string>(food.keys());
  for (const key of docs.keys()) if (key.startsWith("day:")) dates.add(key.slice(4));
  for (const date of dates) {
    const dayDoc = parse<{ water?: number; weight?: number }>(docs.get(`day:${date}`));
    const localDay = local.days[date];
    const entries = inOrder(localDay?.food ?? [], food.get(date) ?? []);
    const sameFood =
      localDay !== undefined &&
      localDay.food.length === entries.length &&
      localDay.food.every((f, i) => f === entries[i]);
    const next: DayRecord = { date, food: sameFood ? localDay!.food : entries };
    if (dayDoc?.water !== undefined) next.water = dayDoc.water;
    if (dayDoc?.weight !== undefined) next.weight = dayDoc.weight;
    days[date] = next;
  }

  return {
    ...local,
    profile: { ...local.profile, ...(profileDoc ?? {}) },
    programs: collect("program:", local.programs),
    sessions: collect("session:", local.sessions),
    customExercises: collect("exercise:", local.customExercises),
    foodFavourites: collect("foodfav:", local.foodFavourites),
    nutrition: reuse(K.nutrition, local.nutrition) ?? local.nutrition,
    mealPlan: reuse(K.mealPlan, local.mealPlan) ?? local.mealPlan,
    lastWeights: reuse(K.lastWeights, local.lastWeights) ?? local.lastWeights,
    favourites: reuse(K.favourites, local.favourites) ?? local.favourites,
    days,
  };
}

// ───────────── Noticing changes made on this device ─────────────

/**
 * Compare what's in the app now with what we last agreed with the cloud, and mark anything
 * that changed (or disappeared) with the time it happened. Returns the keys now waiting to be saved.
 */
export function stampChanges(meta: SyncMeta, cur: Map<string, string>, now: number): string[] {
  const dirty: string[] = [];
  for (const [key, str] of cur) {
    const h = hash(str);
    const m = meta.keys[key];
    if (!m || m.del || m.h !== h) {
      meta.keys[key] = { h, ts: now, dirty: true };
      dirty.push(key);
    }
  }
  for (const key of Object.keys(meta.keys)) {
    const m = meta.keys[key];
    if (!cur.has(key) && !m.del) {
      meta.keys[key] = { h: "", ts: now, del: true, dirty: true };
      dirty.push(key);
    }
  }
  return dirty;
}

// ───────────── Taking in what the cloud has ─────────────

export interface MergeResult {
  /** What the app's data should become, or null if nothing changed. */
  next: AppData | null;
  /** Keys that won a first-time conflict locally and need saving. */
  keepLocal: string[];
}

/**
 * Fold changed cloud documents into the app. Newer wins per document. The very first time a
 * device meets the cloud there is no history to compare, so: identical things are left alone,
 * things only one side has are kept, a deletion never beats data that's still here, and if both
 * sides edited the same thing the one that says it is newer wins (otherwise the cloud wins).
 */
export function mergeRemote(meta: SyncMeta, local: AppData, remote: RemoteDoc[], defaults?: Map<string, string>): MergeResult {
  const cur = explode(local);
  const merged = new Map(cur);
  const keepLocal: string[] = [];
  let changed = false;

  for (const r of remote) {
    const m = meta.keys[r.key];
    let rStr: string | undefined;
    if (!r.deleted) {
      const v = parse<unknown>(r.data);
      if (v === undefined) continue;
      rStr = stable(v);
    }
    const lStr = cur.get(r.key);

    if (m && m.ts >= r.ts) continue; // this device already has the same or a newer version

    if (!m && !meta.first) {
      if (rStr === lStr) {
        meta.keys[r.key] = { h: rStr === undefined ? "" : hash(rStr), ts: r.ts, del: r.deleted };
        continue;
      }
      if (rStr !== undefined && lStr !== undefined) {
        // An untouched factory default never beats something somebody changed.
        const dflt = defaults?.get(r.key);
        if (dflt !== undefined && rStr === dflt) {
          keepLocal.push(r.key);
          continue;
        }
        if (dflt !== undefined && lStr === dflt) {
          // fall through: take the cloud's version
        } else {
        const a = stampOf(r.key, lStr);
        const b = stampOf(r.key, rStr);
        if (a !== undefined && b !== undefined && a > b) {
          keepLocal.push(r.key);
          continue;
        }
        }
      } else if (rStr === undefined && lStr !== undefined) {
        keepLocal.push(r.key);
        continue;
      }
    }

    if (rStr === undefined) merged.delete(r.key);
    else merged.set(r.key, rStr);
    meta.keys[r.key] = { h: rStr === undefined ? "" : hash(rStr), ts: r.ts, del: r.deleted };
    changed = true;
  }

  return { next: changed ? implode(local, merged) : null, keepLocal };
}

// ───────────── The steps the app runs ─────────────

/** The app changed on this device. Returns what now needs saving to the cloud. */
export function onLocalChange(meta: SyncMeta, state: AppData, now: number): string[] {
  if (!meta.first) return []; // not met the cloud yet; the first merge will pick everything up
  return stampChanges(meta, explode(state), now);
}

/**
 * Cloud documents arrived. Returns the app's new data (or null) and what now needs saving:
 * anything this device has that the cloud doesn't, or that it kept in a first-time conflict.
 */
export function onRemote(meta: SyncMeta, state: AppData, remote: RemoteDoc[], now: number, defaults?: Map<string, string>): { next: AppData | null; dirty: string[] } {
  const { next } = mergeRemote(meta, state, remote, defaults);
  meta.first = true;
  const dirty = stampChanges(meta, explode(next ?? state), now);
  return { next, dirty };
}

/** The documents to write for these keys. */
export function buildPush(meta: SyncMeta, state: AppData, keys: string[]): RemoteDoc[] {
  const cur = explode(state);
  const out: RemoteDoc[] = [];
  for (const key of keys) {
    const m = meta.keys[key];
    if (!m) continue;
    if (m.del) out.push({ key, ts: m.ts, deleted: true });
    else {
      const data = cur.get(key);
      if (data !== undefined) out.push({ key, ts: m.ts, data });
    }
  }
  return out;
}

/** The cloud confirmed these were saved. */
export function markPushed(meta: SyncMeta, keys: string[]) {
  for (const k of keys) if (meta.keys[k]) delete meta.keys[k].dirty;
}

export const dirtyKeys = (meta: SyncMeta) => Object.keys(meta.keys).filter((k) => meta.keys[k].dirty);
