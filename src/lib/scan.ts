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

/** Where the reader lives. Same-origin by default, so a Netlify deploy needs no setup at all. */
export function readerEndpoint(configured?: string) {
  const trimmed = configured?.trim();
  if (trimmed) return trimmed.replace(/\/+$/, "");
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/.netlify/functions/scan-sheet`;
}

function fileToBase64(file: Blob): Promise<{ data: string; mediaType: string }> {
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
  const { data, mediaType } = await fileToBase64(file);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(opts.passcode ? { "x-counter-passcode": opts.passcode } : {}) },
      body: JSON.stringify({ image: data, mediaType }),
    });
  } catch {
    throw new Error("Couldn't reach the sheet reader. Check you're online, and the address in Me → Sheet reader.");
  }
  const body = (await res.json().catch(() => ({}))) as { sheet?: ScannedSheet; error?: string };
  if (!res.ok || !body.sheet) throw new Error(body.error || `The reader answered with an error (${res.status}).`);
  return body.sheet;
}

// ───────────── Matching read names to the exercise library ─────────────

const STOP = new Set(["the", "a", "an", "and", "with", "to", "of", "on", "in", "for", "or", "each", "side", "left", "right", "l", "r", "x"]);

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

/** Score 0-1 for how well a read name matches a library exercise. */
function score(readName: string, ex: Exercise) {
  const a = tokens(readName);
  const b = tokens(ex.name);
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const hits = a.filter((t) => setB.has(t)).length;
  const coverage = hits / a.length;
  const precision = hits / b.length;
  let s = (coverage * 2 + precision) / 3;
  const na = readName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nb = ex.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (na === nb) s = 1;
  else if (nb.includes(na) || na.includes(nb)) s = Math.max(s, 0.85);
  return s;
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

/** Turn what the reader saw into program rows, matching each name to the library. */
export function matchRows(scanned: ScannedRow[], custom: Exercise[]): MatchedRow[] {
  const library = [...EXERCISES, ...custom];
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
    const good = best && bestScore >= 0.55;
    const exercise = good ? best! : makeExercise(name, slot === "TABATA");
    if (!good) created.push(exercise);
    const row: ProgramRow = {
      id: uid(),
      exerciseId: exercise.id,
      // Keep Carolyn's exact wording when it differs from the library name.
      label: good && tokens(name).join(" ") !== tokens(exercise.name).join(" ") ? name : undefined,
      slot,
      weight: (r.weight ?? "").trim(),
      sets: (r.sets ?? "").trim(),
      reps: (r.reps ?? "").trim(),
      rest: (r.rest ?? "").trim(),
    };
    return { row, exercise, isNew: !good, confidence: good ? bestScore : 0, readName: name };
  });
}
