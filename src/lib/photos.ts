import { useEffect, useState } from "react";
import type { SheetPhoto } from "./types";

/**
 * Sheet photos live in IndexedDB (localStorage tops out around 5 MB, which is two or three
 * phone photos). Each photo is shrunk to max 1600px on its long edge and re-encoded as JPEG
 * before it is stored, so a season of sheets stays well under a few tens of MB.
 */
const DB = "counter-photos";
const STORE = "photos";
const MAX_EDGE = 1600;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export const photoId = () => "ph_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** Downscale + re-encode a picked file. Falls back to the original bytes if decoding fails. */
export async function compressImage(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.86));
    if (!blob) throw new Error("encode failed");
    return { blob, width: w, height: h };
  } catch {
    return { blob: file, width: 0, height: 0 };
  }
}

export async function savePhoto(file: Blob): Promise<SheetPhoto> {
  const { blob, width, height } = await compressImage(file);
  const photo: SheetPhoto = { id: photoId(), blob, width, height, createdAt: Date.now() };
  await tx("readwrite", (s) => s.put(photo));
  return photo;
}

export async function putPhoto(photo: SheetPhoto) {
  await tx("readwrite", (s) => s.put(photo));
}

export function getPhoto(id: string): Promise<SheetPhoto | undefined> {
  return tx<SheetPhoto | undefined>("readonly", (s) => s.get(id)).catch(() => undefined);
}

export async function deletePhoto(id: string) {
  revoke(id);
  await tx("readwrite", (s) => s.delete(id)).catch(() => undefined);
}

export function allPhotos(): Promise<SheetPhoto[]> {
  return tx<SheetPhoto[]>("readonly", (s) => s.getAll()).catch(() => []);
}

export async function clearPhotos() {
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls.clear();
  await tx("readwrite", (s) => s.clear()).catch(() => undefined);
}

// ── Object URL cache so thumbnails don't re-read the DB on every render ──
const urls = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

function revoke(id: string) {
  const u = urls.get(id);
  if (u) URL.revokeObjectURL(u);
  urls.delete(id);
}

export function photoUrl(id: string): Promise<string | null> {
  const cached = urls.get(id);
  if (cached) return Promise.resolve(cached);
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const p = getPhoto(id)
    .then((ph) => {
      if (!ph) return null;
      const u = URL.createObjectURL(ph.blob);
      urls.set(id, u);
      return u;
    })
    .finally(() => pending.delete(id));
  pending.set(id, p);
  return p;
}

/** React hook: object URL for a stored photo (null while loading or if missing). */
export function usePhotoUrl(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(id ? urls.get(id) ?? null : null);
  useEffect(() => {
    let alive = true;
    if (!id) {
      setUrl(null);
      return;
    }
    photoUrl(id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

// ── Backup helpers ──
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

export async function exportPhotos(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const id of ids) {
    const ph = await getPhoto(id);
    if (ph) out[id] = await blobToDataUrl(ph.blob);
  }
  return out;
}

export async function importPhotos(map: Record<string, string> | undefined) {
  if (!map) return;
  for (const [id, dataUrl] of Object.entries(map)) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await putPhoto({ id, blob, width: 0, height: 0, createdAt: Date.now() });
    } catch {
      /* skip a broken entry rather than failing the whole restore */
    }
  }
}
