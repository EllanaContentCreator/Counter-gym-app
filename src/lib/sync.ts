import { useSyncExternalStore } from "react";
import { applyRemoteData, getState, seed, setChangeHandler } from "./store";
import { buildPush, dirtyKeys, explode, markPushed, onLocalChange, onRemote, type RemoteDoc, type SyncMeta } from "./syncCore";
import { hasPhoto, photoForCloud, putPhoto } from "./photos";
import { FIREBASE_CONFIG, syncConfigured } from "./firebaseConfig";

/**
 * Keeps the app's data the same on every device you sign in on.
 *
 * Nothing here runs until somebody taps "Sign in with Google" in Me. Until then the app is
 * exactly what it always was: everything on this device. Signed in, every change is saved to
 * a private area that only that Google account can read, and other devices pick it up.
 * It keeps working offline — changes queue up and go when the connection comes back.
 */

export type Phase = "off" | "starting" | "syncing" | "synced" | "offline" | "error";
export interface SyncStatus {
  configured: boolean;
  phase: Phase;
  email: string | null;
  lastSynced: number | null;
  message: string;
}

let status: SyncStatus = { configured: syncConfigured, phase: "off", email: null, lastSynced: null, message: "" };
const listeners = new Set<() => void>();
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status
  );
}

const ON_KEY = "counter.sync.on";
const META_KEY = "counter.sync.v1";
const PHOTOS_KEY = "counter.sync.photos.v1";

const safe = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage full or blocked — sync carries on from memory */
    }
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

// ───────────── Firebase, loaded only when needed ─────────────

type Fb = Awaited<ReturnType<typeof loadFirebase>>;
let fbPromise: Promise<Fb> | null = null;

function loadFirebase() {
  return (async () => {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([import("firebase/app"), import("firebase/auth"), import("firebase/firestore")]);
    const app = initializeApp(FIREBASE_CONFIG);
    const auth = authMod.getAuth(app);
    const db = fsMod.initializeFirestore(app, {
      localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }),
    });
    return { auth, db, authMod, fsMod };
  })();
}
const fb = () => (fbPromise ??= loadFirebase());

// ───────────── State kept between visits ─────────────

let meta: SyncMeta | null = null;
let uid: string | null = null;
let unsubscribe: (() => void) | null = null;

function loadMeta(forUid: string): SyncMeta {
  try {
    const raw = safe.get(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as SyncMeta;
      if (m.uid === forUid) return m;
    }
  } catch {
    /* start fresh */
  }
  return { uid: forUid, keys: {}, first: false };
}
const saveMeta = () => meta && safe.set(META_KEY, JSON.stringify(meta));

// ───────────── A copy of everything, taken before the first sync ─────────────

const COPY_DB = "counter-presync";
function openCopyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(COPY_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("copies", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function savePreSyncCopy() {
  try {
    const db = await openCopyDb();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("copies", "readwrite");
      t.objectStore("copies").put({ id: "before-first-sync", at: Date.now(), json: JSON.stringify(getState()) });
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    db.close();
  } catch {
    /* a missing safety copy must not stop sync, but it's rare */
  }
}
/** Hand back the copy saved before this device first synced, as a downloadable backup file. */
export async function downloadPreSyncCopy(): Promise<boolean> {
  try {
    const db = await openCopyDb();
    const rec = await new Promise<{ at: number; json: string } | undefined>((resolve, reject) => {
      const req = db.transaction("copies").objectStore("copies").get("before-first-sync");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!rec) return false;
    const url = URL.createObjectURL(new Blob([rec.json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `counter-before-sync-${new Date(rec.at).toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch {
    return false;
  }
}

// ───────────── Saving changes to the cloud ─────────────

let pushTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePush(ms: number) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void push(), ms);
}

async function push() {
  pushTimer = null;
  if (!meta || !uid) return;
  const keys = dirtyKeys(meta);
  if (!keys.length) return;
  const { db, fsMod } = await fb();
  const docs = buildPush(meta, getState(), keys);
  const currentUid = uid;
  for (let i = 0; i < docs.length; i += 400) {
    const chunk = docs.slice(i, i + 400);
    const batch = fsMod.writeBatch(db);
    for (const d of chunk) {
      batch.set(fsMod.doc(db, "users", currentUid, "items", d.key), { ts: d.ts, deleted: Boolean(d.deleted), data: d.data ?? null });
    }
    setStatus({ phase: navigator.onLine ? "syncing" : "offline" });
    batch
      .commit()
      .then(() => {
        if (!meta || uid !== currentUid) return;
        // Only clear the "waiting" mark if nothing changed again in the meantime.
        markPushed(
          meta,
          chunk.filter((d) => meta!.keys[d.key]?.ts === d.ts).map((d) => d.key)
        );
        saveMeta();
        setStatus({ phase: "synced", lastSynced: Date.now(), message: "" });
      })
      .catch((e) => setStatus({ phase: navigator.onLine ? "error" : "offline", message: friendly(e) }));
  }
}

function onChange(state: ReturnType<typeof getState>) {
  if (!meta) return;
  const dirty = onLocalChange(meta, state, Date.now());
  if (dirty.length) {
    saveMeta();
    schedulePush(800);
  }
  void syncPhotos();
}

// ───────────── Taking in changes from the cloud ─────────────

function handleRemote(docs: RemoteDoc[]) {
  if (!meta) return;
  const { next, dirty } = onRemote(meta, getState(), docs, Date.now(), explode(seed()));
  saveMeta();
  if (next) applyRemoteData(next);
  if (dirty.length) schedulePush(0);
  setStatus({ phase: navigator.onLine ? "synced" : "offline", lastSynced: Date.now(), message: "" });
  void syncPhotos();
}

// ───────────── Sheet photos ─────────────

let photosBusy = false;
let photosAgain = false;
function photoMemo(): { uid: string; ids: Record<string, 1> } {
  try {
    const m = JSON.parse(safe.get(PHOTOS_KEY) ?? "null");
    if (m && m.uid === uid) return m;
  } catch {
    /* fresh */
  }
  return { uid: uid ?? "", ids: {} };
}
const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

async function syncPhotos() {
  if (!meta?.first || !uid) return;
  if (photosBusy) {
    photosAgain = true;
    return;
  }
  photosBusy = true;
  try {
    const { db, fsMod } = await fb();
    const memo = photoMemo();
    const ids = new Set(getState().programs.flatMap((p) => p.photoIds ?? []));
    for (const id of ids) {
      const ref = fsMod.doc(db, "users", uid!, "photos", id);
      try {
        if (await hasPhoto(id)) {
          if (memo.ids[id]) continue;
          const dataUrl = await photoForCloud(id);
          if (dataUrl) {
            await withTimeout(fsMod.setDoc(ref, { dataUrl, createdAt: Date.now() }), 30000);
            memo.ids[id] = 1;
            safe.set(PHOTOS_KEY, JSON.stringify(memo));
          }
        } else {
          const snap = await fsMod.getDoc(ref);
          const url = snap.exists() ? (snap.data().dataUrl as string) : null;
          if (url) {
            const blob = await (await fetch(url)).blob();
            await putPhoto({ id, blob, width: 0, height: 0, createdAt: Date.now() });
            memo.ids[id] = 1;
            safe.set(PHOTOS_KEY, JSON.stringify(memo));
          }
        }
      } catch {
        /* offline or not there yet — tried again on the next change */
      }
    }
  } finally {
    photosBusy = false;
    if (photosAgain) {
      photosAgain = false;
      void syncPhotos();
    }
  }
}

// ───────────── Starting, stopping, signing in ─────────────

function friendly(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("permission-denied")) return "The cloud refused the save. Sign out and back in.";
  if (code.includes("unavailable") || code.includes("network")) return "Can't reach the cloud right now. Your changes are kept and will go up when you're back online.";
  return "Something went wrong saving to the cloud. Your data is safe on this device.";
}

async function start(user: { uid: string; email: string | null }) {
  const { db, fsMod } = await fb();
  uid = user.uid;
  meta = loadMeta(user.uid);
  safe.set(ON_KEY, "1");
  setStatus({ phase: "starting", email: user.email, message: "" });
  if (!meta.first) await savePreSyncCopy();
  unsubscribe?.();
  setChangeHandler(onChange);
  unsubscribe = fsMod.onSnapshot(
    fsMod.collection(db, "users", user.uid, "items"),
    (snap) => {
      // The first time, wait for the real cloud — not an empty offline cache — before merging.
      if (!meta!.first && snap.metadata.fromCache) return;
      const docs: RemoteDoc[] = [];
      snap.docChanges().forEach((ch) => {
        if (ch.doc.metadata.hasPendingWrites || ch.type === "removed") return;
        const d = ch.doc.data();
        docs.push({ key: ch.doc.id, ts: d.ts, deleted: d.deleted || undefined, data: d.data ?? undefined });
      });
      handleRemote(docs);
    },
    (e) => setStatus({ phase: navigator.onLine ? "error" : "offline", message: friendly(e) })
  );
}

function stop() {
  unsubscribe?.();
  unsubscribe = null;
  setChangeHandler(null);
  meta = null;
  uid = null;
}

/** Call once when the app opens. Picks up where it left off if this device was already signed in. */
export function initSync() {
  if (!syncConfigured) return;
  window.addEventListener("online", () => {
    if (meta) {
      setStatus({ phase: "syncing" });
      schedulePush(0);
      void syncPhotos();
    }
  });
  window.addEventListener("offline", () => meta && setStatus({ phase: "offline" }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && meta) void push();
  });
  if (safe.get(ON_KEY) !== "1") return;
  void watchAuth();
}

let watching = false;
async function watchAuth() {
  if (watching) return;
  watching = true;
  const { auth, authMod } = await fb();
  authMod.getRedirectResult(auth).catch((e) => setStatus({ phase: "error", message: signInMessage(e) }));
  authMod.onAuthStateChanged(auth, (user) => {
    if (user) void start({ uid: user.uid, email: user.email });
    else {
      stop();
      setStatus({ phase: "off", email: null });
    }
  });
}

function signInMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Sign-in was closed before it finished.";
  if (code === "auth/unauthorized-domain") return "This web address isn't allowed to sign in yet.";
  if (code === "auth/network-request-failed") return "No connection. Try again when you're online.";
  return "Couldn't sign in. Try again.";
}

export async function signInWithGoogle(opts: { redirect?: boolean } = {}) {
  if (!syncConfigured) return;
  setStatus({ phase: "starting", message: "" });
  try {
    const { auth, authMod } = await fb();
    await watchAuth();
    const provider = new authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    if (opts.redirect) {
      safe.set(ON_KEY, "1"); // so the page picks the sign-in up when it comes back
      await authMod.signInWithRedirect(auth, provider);
      return;
    }
    try {
      await authMod.signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        safe.set(ON_KEY, "1");
        await authMod.signInWithRedirect(auth, provider);
        return;
      }
      throw e;
    }
  } catch (e) {
    safe.del(ON_KEY);
    setStatus({ phase: "off", message: signInMessage(e) });
  }
}

export async function signOutOfSync() {
  safe.del(ON_KEY);
  try {
    const { auth, authMod } = await fb();
    await authMod.signOut(auth);
  } catch {
    /* already signed out */
  }
  stop();
  setStatus({ phase: "off", email: null, message: "" });
}

/** Save anything waiting and check the photos, right now. */
export async function syncNow() {
  if (!meta) return;
  setStatus({ phase: "syncing" });
  schedulePush(0);
  await syncPhotos();
}
