import type { Exercise, ProgramRow } from "./types";
import { EXERCISES } from "@/data/exercises";
import { EQUIPMENT } from "@/data/equipment";
import { uid } from "./store";

/** One row exactly as the reader transcribed it from the photo. */
export interface ScannedRow {
  slot: string;
  exercise: string;
  weight: string;
  sets: string;
  reps: string;
  rest: string;
}
export interface ScannedSheet {
  personName: string;
  dayLabel: string;
  title: string;
  notes: string;
  rows: ScannedRow[];
  confidence: "high" | "medium" | "low";
}

/**
 * A reader address baked in when the app is built (VITE_READER_URL), so the
 * group never has to set one up. Nobody but the person who deploys Counter
 * should ever see a settings screen for this.
 */
const BUILT_IN_READER = (import.meta.env.VITE_READER_URL ?? "").trim();
const BUILT_IN_PASSCODE = (import.meta.env.VITE_READER_PASSCODE ?? "").trim();

/**
 * Where the reader lives, most specific first:
 *   1. an address typed into Me → Sheet reader
 *   2. one baked in at build time
 *   3. the same site the app is served from (a Netlify deploy needs nothing)
 */
export function readerEndpoint(configured?: string) {
  const trimmed = configured?.trim();
  if (trimmed) return trimmed.replace(/\/+$/, "");
  if (BUILT_IN_READER) return BUILT_IN_READER.replace(/\/+$/, "");
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/.netlify/functions/scan-sheet`;
}

/** The passcode to send: whatever she typed, else one baked in at build time. */
export function readerPasscode(configured?: string) {
  return configured?.trim() || BUILT_IN_PASSCODE;
}

/** True when the app already knows where its reader is, so nobody need do a thing. */
export function readerIsPreconfigured() {
  return BUILT_IN_READER.length > 0;
}

/**
 * Another reader function sitting beside the sheet reader, e.g. read-food next
 * to scan-sheet. Derived from the one address she already typed in — asking her
 * to find and paste a second one is exactly how this goes wrong.
 */
export function readerSibling(fn: string, configured?: string) {
  const base = readerEndpoint(configured);
  return base ? base.replace(/\/[^/]*$/, `/${fn}`) : "";
}

/**
 * Some places can only hand out files — GitHub Pages is one — so the reader can
 * never live at the same address as the app there. Worth saying out loud rather
 * than letting it fail as a bare 404.
 */
export function hostCanRunReader() {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return !(h.endsWith("github.io") || h.endsWith("pages.dev") || h.endsWith("surge.sh"));
}

const SET_UP_HINT =
  "Open Me → Sheet reader and paste the address of your reader, e.g. https://your-site.netlify.app/.netlify/functions/scan-sheet";

export function fileToBase64(file: Blob): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      const m = s.match(/^data:([^;]+);base64,(.*)$/);
      if (!m) return reject(new Error("Could not read that image."));
      resolve({ mediaType: m[1], data: m[2] });
    };
    r.onerror = () => reject(r.error ?? new Error("Could not read that image."));
    r.readAsDataURL(file);
  });
}

export async function scanSheet(file: Blob, opts: { endpoint?: string; passcode?: string } = {}): Promise<ScannedSheet> {
  const url = readerEndpoint(opts.endpoint);
  if (!url) throw new Error("No sheet reader is set up yet. Add its address in Me → Sheet reader.");
  // Nothing to be gained from posting a photo to an address that cannot answer.
  if (!opts.endpoint?.trim() && !BUILT_IN_READER && !hostCanRunReader()) {
    throw new Error(
      `This copy of Counter is on ${window.location.hostname}, which can only serve files — it can't run the sheet reader itself. ${SET_UP_HINT}`,
    );
  }
  const { data, mediaType } = await fileToBase64(file);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(readerPasscode(opts.passcode) ? { "x-counter-passcode": readerPasscode(opts.passcode) } : {}),
      },
      body: JSON.stringify({ image: data, mediaType }),
    });
  } catch {
    throw new Error("Couldn't reach the sheet reader. Check you're online, and the address in Me → Sheet reader.");
  }
  const body = (await res.json().catch(() => ({}))) as { sheet?: ScannedSheet; error?: string };
  if (!res.ok || !body.sheet) {
    // A status on its own tells her nothing she can act on.
    if (res.status === 404) throw new Error(`There's no sheet reader at ${url}. ${SET_UP_HINT}`);
    if (res.status === 401 || res.status === 403) {
      throw new Error("The sheet reader turned that away — check the group passcode in Me → Sheet reader.");
    }
    if (res.status === 402 || /credit|balance|quota/i.test(body.error ?? "")) {
      throw new Error("The reader's Anthropic account is out of credit. Top it up and try again.");
    }
    if (res.status >= 500) {
      throw new Error(body.error || "The sheet reader hit a problem at its end. Try again in a moment.");
    }
    throw new Error(body.error || `The reader answered with an error (${res.status}).`);
  }
  return body.sheet;
}

// ───────────── Matching read names to the exercise library ─────────────

const STOP = new Set([
  "the", "a", "an", "and", "with", "to", "of", "on", "in", "for", "or", "each", "side", "left", "right", "l", "r", "x",
  // Units and rep-scheme words Carolyn writes into the name itself.
  "kg", "kgs", "lb", "lbs", "rep", "set", "sec", "secs", "second", "min", "mins", "minute",
]);

function tokens(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.endsWith("s") && t.length > 3 ? t.slice(0, -1) : t));
}

/** Words that strongly imply a piece of equipment, used to pick equipment for a new exercise. */
const EQUIP_HINTS: Array<[string, string]> = [
  ["dumbbell", "dumbbell"], ["db", "dumbbell"], ["kettlebell", "kettlebell"], ["kb", "kettlebell"],
  ["barbell", "barbell"], ["bar", "barbell"], ["hex", "hex-bar"], ["plate", "plate"], ["cable", "cable"],
  ["trx", "trx"], ["bosu", "bosu"], ["medicine", "medicine-ball"], ["med", "medicine-ball"], ["box", "box"],
  ["bench", "bench"], ["slider", "slider"], ["band", "resistance-band"], ["leg press", "leg-press"],
  ["pulldown", "lat-pulldown"], ["row machine", "seated-row"], ["seated row", "seated-row"],
  ["squat machine", "squat-machine"], ["smith", "smith-machine"], ["rower", "rower"], ["rowing", "rower"],
  ["bike", "bike"], ["treadmill", "treadmill"], ["skip", "skipping-rope"], ["swiss", "swiss-ball"],
  ["roller", "foam-roller"], ["mat", "mat"], ["sled", "bodyweight"],
];

const MUSCLE_HINTS: Array<[string, string]> = [
  ["squat", "quads"], ["lunge", "quads"], ["leg press", "quads"], ["deadlift", "hamstrings"], ["rdl", "hamstrings"],
  ["hip thrust", "glutes"], ["glute", "glutes"], ["bridge", "glutes"], ["calf", "calves"],
  ["row", "back"], ["pulldown", "lats"], ["pull up", "lats"], ["pullup", "lats"],
  ["press", "chest"], ["push up", "chest"], ["push-up", "chest"], ["fly", "chest"],
  ["shoulder", "shoulders"], ["lateral raise", "shoulders"], ["face pull", "shoulders"], ["overhead", "shoulders"],
  ["curl", "biceps"], ["tricep", "triceps"], ["dip", "triceps"], ["pushdown", "triceps"],
  ["plank", "core"], ["sit up", "core"], ["crunch", "core"], ["dead bug", "core"], ["woodchop", "obliques"],
  ["twist", "obliques"], ["swing", "glutes"], ["burpee", "full-body"], ["slam", "full-body"], ["get up", "full-body"],
];

function guess<T extends string>(name: string, hints: Array<[string, string]>, fallback: T): T[] {
  const lower = ` ${name.toLowerCase()} `;
  const found = hints.filter(([word]) => lower.includes(` ${word}`) || lower.includes(`${word} `) || lower.includes(word)).map(([, id]) => id);
  return (found.length ? [...new Set(found)].slice(0, 3) : [fallback]) as T[];
}

/**
 * Carolyn writes a whole coaching note as the exercise name, for example
 * "Torsinator : On One Knee : Above Shoulders To Opposite Knee : 15 Kg Bar".
 * Matching only the full string almost never finds the library entry, so each
 * read name is broken into several candidate forms and the best one wins.
 */
function candidates(raw: string): string[] {
  const out = new Set<string>();
  const add = (v: string) => {
    const t = v.replace(/\s+/g, " ").trim();
    if (t) out.add(t);
  };
  // Drop a leading slot word and anything in brackets.
  const base = raw.replace(/^\s*(tabata|all|everyone)\s*[:\-]?\s*/i, "").replace(/\([^)]*\)/g, " ");
  add(base);
  const parts = base.split(/[:/]|\s[-–—]\s/).map((x) => x.trim()).filter(Boolean);
  // A fragment that is only kit and numbers ("15 Kg Bar") says nothing about
  // the movement, and on its own it matches whatever library entry happens to
  // mention the same kit. Only the whole name keeps it.
  for (const part of parts) if (!allNoise(part)) add(part);
  if (parts.length > 1) add(parts.slice(0, 2).join(" "));
  // Numberless forms, so weights and rep schemes stop drowning the movement.
  for (const v of [...out]) add(v.replace(/\b\d+(\.\d+)?\s*(kg|kgs|lb|lbs|k|s)?\b/gi, " "));
  return [...out];
}

/** Words that name kit or a number rather than a movement. */
const NOISE = new Set(EQUIP_HINTS.flatMap(([word]) => word.split(" ")));

function allNoise(part: string) {
  const t = tokens(part);
  return t.length > 0 && t.every((w) => NOISE.has(w) || /^\d/.test(w));
}

/** The word that says what the body is actually doing. Shared ones count double. */
const MOVEMENT = [
  "squat", "lunge", "press", "row", "curl", "deadlift", "plank", "push", "pull", "swing",
  "thruster", "raise", "fly", "crunch", "twist", "woodchop", "chop", "bridge", "thrust",
  "extension", "kickback", "pulldown", "dip", "jump", "step", "carry", "walk", "clean",
  "snatch", "halo", "pike", "tuck", "climber", "burpee", "slam", "pulse", "kick", "roll",
  "stretch", "circle", "swings", "situp", "crawl", "skip",
];

/**
 * Names Carolyn uses that no amount of word matching will find, mapped to the
 * library entry they mean. Anything whose id is not in the library is ignored.
 */
const ALIAS: Array<[RegExp, string]> = [
  [/torsinator|landmine/i, "kneeling-plate-woodchop"],
  [/above shoulder.*opposite knee|opposite knee.*above shoulder/i, "kneeling-plate-woodchop"],
  [/floor to ceiling/i, "dumbbell-single-arm-floor-to-ceiling"],
  [/\bget ?up\b/i, "plate-get-up"],
  [/farmer/i, "kettlebell-farmers-walk"],
  [/three way/i, "cable-three-way"],
  [/\bv ?snap\b/i, "v-snap-toe-taps"],
  [/hybrid.*push|knee.*push ?up/i, "hybrid-knee-push-up"],
  [/ball slam/i, "bosu-medicine-ball-slam-single-leg"],
  [/face pull/i, "cable-kneeling-rope-face-pull"],
  [/split squat/i, "box-weighted-split-squat"],
  [/\bsumo\b/i, "kettlebell-sumo-squat"],
];

/**
 * A scored match this strong is trusted ahead of the alias list — in practice
 * only a name the library spells out almost exactly.
 */
const ALIAS_FLOOR = 0.99;

/** Equipment words present in a read name, used to prefer a same-kit match. */
function equipmentIn(name: string): Set<string> {
  const lower = ` ${name.toLowerCase()} `;
  const found = new Set<string>();
  for (const [word, id] of EQUIP_HINTS) if (lower.includes(word)) found.add(id);
  return found;
}

/** Score 0-1 for how well one candidate form matches a library exercise. */
function scoreOne(readName: string, ex: Exercise) {
  const a = tokens(readName);
  const b = tokens(ex.name);
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const hits = a.filter((t) => setB.has(t)).length;
  const na = readName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nb = ex.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (na === nb) return 1;
  let s = ((hits / a.length) * 2 + hits / b.length) / 3;
  if (nb.includes(na) || na.includes(nb)) s = Math.max(s, 0.85);
  // Two moves that share their verb are far likelier to be the same move.
  const moveA = MOVEMENT.filter((m) => a.includes(m));
  const moveB = MOVEMENT.filter((m) => b.includes(m));
  const sharedMove = moveA.some((m) => moveB.includes(m));
  if (sharedMove) s += 0.12;
  else if (moveA.length && moveB.length) {
    // Both name a movement and they disagree — a lunge is not a squat however
    // much of the rest of the name lines up, so the shared words count for far
    // less.
    s *= 0.55;
  } else if (s < 0.8) s -= 0.05;
  return Math.max(0, Math.min(1, s));
}

/** Best score for a read name against one exercise, across all candidate forms. */
export function score(readName: string, ex: Exercise) {
  let best = 0;
  for (const c of candidates(readName)) {
    const s = scoreOne(c, ex);
    if (s > best) best = s;
  }
  const wanted = equipmentIn(readName);
  if (wanted.size) {
    const shares = ex.equipment.some((e) => wanted.has(e as string));
    best += shares ? 0.1 : -0.2;
  }
  return Math.max(0, Math.min(1, best));
}

export interface MatchedRow {
  row: ProgramRow;
  /** Exercise it was matched to, or a brand-new custom exercise to be created. */
  exercise: Exercise;
  isNew: boolean;
  confidence: number;
  readName: string;
}

const VALID_SLOTS = ["1", "1+", "2", "2+", "3", "3+", "4", "4+", "ALL", "TABATA"];

function cleanSlot(raw: string, index: number): string {
  const s = (raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (VALID_SLOTS.includes(s)) return s;
  if (s.startsWith("TAB")) return "TABATA";
  if (s === "ALL" || s === "EVERYONE") return "ALL";
  const m = s.match(/^(\d)\s*(\+)?/);
  if (m) return m[2] ? `${m[1]}+` : m[1];
  return String(Math.min(4, index + 1));
}

/**
 * The name a brand-new exercise is filed under. The slot word Carolyn writes in
 * front ("TABATA : ...") belongs to the row, not to the movement, so it is
 * dropped here — the row keeps her full wording as its label.
 */
function newExerciseName(raw: string) {
  const t = raw.replace(/^\s*(tabata|all|everyone)\s*[:\-]\s*/i, "").trim();
  return t || raw.trim();
}

function makeExercise(name: string, isTabata: boolean): Exercise {
  const equipment = guess(name, EQUIP_HINTS, "bodyweight");
  const muscles = guess(name, MUSCLE_HINTS, "full-body");
  const known = new Set(EQUIPMENT.map((e) => e.id as string));
  return {
    id: `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48)}-${uid().slice(0, 4)}`,
    name: name.trim(),
    equipment: (equipment.filter((e) => known.has(e)) as Exercise["equipment"]).length
      ? (equipment.filter((e) => known.has(e)) as Exercise["equipment"])
      : ["bodyweight"],
    muscles: muscles as Exercise["muscles"],
    category: isTabata ? "tabata" : /plank|crunch|sit up|dead bug|twist|woodchop/i.test(name) ? "core" : "strength",
    cues: ["Added from Carolyn's sheet — tap Edit to add your own coaching cues."],
    noWeight: /^0$|bodyweight/i.test(name),
    custom: true,
  };
}

/** How close a name must come before it is treated as a library exercise. */
const MATCH_THRESHOLD = 0.5;

/** Turn what the reader saw into program rows, matching each name to the library. */
export function matchRows(scanned: ScannedRow[], custom: Exercise[]): MatchedRow[] {
  const library = [...EXERCISES, ...custom];
  const byId = new Map(library.map((e) => [e.id, e]));
  const created: Exercise[] = [];
  return scanned.map((r, i) => {
    const slot = cleanSlot(r.slot, i);
    const name = (r.exercise || "Exercise").trim();

    let best: Exercise | undefined;
    let bestScore = 0;
    for (const ex of [...library, ...created]) {
      const s = score(name, ex);
      if (s > bestScore) {
        bestScore = s;
        best = ex;
      }
    }

    // A name Carolyn writes her own way goes straight to the entry it means —
    // but only when the words alone found nothing convincing, so an alias can
    // never hijack a name the library already spells out ("Seated Leg Press -
    // SUMO" is its own machine, not a kettlebell sumo squat).
    if (bestScore < ALIAS_FLOOR) {
      for (const [pattern, id] of ALIAS) {
        if (pattern.test(name) && byId.has(id)) {
          best = byId.get(id);
          bestScore = 0.9;
          break;
        }
      }
    }

    const good = !!best && bestScore >= MATCH_THRESHOLD;
    const exercise = good ? best! : makeExercise(newExerciseName(name), slot === "TABATA");
    if (!good) created.push(exercise);
    const row: ProgramRow = {
      id: uid(),
      exerciseId: exercise.id,
      // Keep Carolyn's exact wording when it differs from the exercise's name.
      label: tokens(name).join(" ") !== tokens(exercise.name).join(" ") ? name : undefined,
      slot,
      weight: (r.weight ?? "").trim(),
      sets: (r.sets ?? "").trim(),
      reps: (r.reps ?? "").trim(),
      rest: (r.rest ?? "").trim(),
    };
    return { row, exercise, isNew: !good, confidence: good ? bestScore : 0, readName: name };
  });
}
