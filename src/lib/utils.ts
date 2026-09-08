import type { Exercise, Program, ProgramRow, SetEntry, WorkoutSession } from "./types";
import { EXERCISES, EXERCISE_BY_ID } from "@/data/exercises";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatClock(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function formatDuration(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function formatDate(ts: number, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "2-digit", month: "short" }) {
  return new Date(ts).toLocaleDateString("en-AU", opts);
}

export function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

/** "39+2" → 41, "5 P" → 5, "12.5" → 12.5, "" → null */
export function parseWeight(text: string): number | null {
  if (!text) return null;
  const nums = text.match(/\d+(?:\.\d+)?/g);
  if (!nums) return null;
  return nums.reduce((a, b) => a + parseFloat(b), 0);
}

/** "10+10" → 20, "8 each" → 8, "left + right" → null */
export function parseReps(text: string): number | null {
  if (!text) return null;
  const nums = text.match(/\d+/g);
  if (!nums) return null;
  return nums.reduce((a, b) => a + parseInt(b, 10), 0);
}

export function allExercises(custom: Exercise[]): Exercise[] {
  return [...EXERCISES, ...custom];
}

export function findExercise(id: string, custom: Exercise[] = []): Exercise | undefined {
  return EXERCISE_BY_ID[id] ?? custom.find((e) => e.id === id);
}

export function rowName(row: ProgramRow, custom: Exercise[] = []) {
  return row.label || findExercise(row.exerciseId, custom)?.name || "Exercise";
}

export function isTabata(row: ProgramRow) {
  return row.slot.toUpperCase() === "TABATA";
}
export function isAll(row: ProgramRow) {
  return row.slot.toUpperCase() === "ALL";
}
export function isSuperset(row: ProgramRow) {
  return row.slot.endsWith("+");
}
export function stationNumber(row: ProgramRow): number | null {
  const m = row.slot.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Split a program into blocks: main stations, ALL rows, tabata finishers, in sheet order. */
export function programSummary(p: Program) {
  const stations = new Set<number>();
  let tabatas = 0;
  for (const r of p.rows) {
    if (isTabata(r)) tabatas++;
    const n = stationNumber(r);
    if (n) stations.add(n);
  }
  return { stations: stations.size, tabatas, exercises: p.rows.length };
}

export function sessionVolume(s: WorkoutSession) {
  return s.entries.reduce((sum, e) => sum + (e.weight ?? 0) * (e.reps ?? 0), 0);
}

export function bestWeightFor(sessions: WorkoutSession[], exerciseId: string): SetEntry | null {
  let best: SetEntry | null = null;
  for (const s of sessions)
    for (const e of s.entries)
      if (e.exerciseId === exerciseId && e.weight != null && (best == null || e.weight > (best.weight ?? 0))) best = e;
  return best;
}

export function historyFor(sessions: WorkoutSession[], exerciseId: string) {
  return sessions
    .filter((s) => s.finishedAt && s.entries.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => {
      const entries = s.entries.filter((e) => e.exerciseId === exerciseId);
      const top = Math.max(...entries.map((e) => e.weight ?? 0));
      const reps = entries.reduce((a, e) => a + (e.reps ?? 0), 0);
      return { date: s.startedAt, top, sets: entries.length, reps, session: s };
    });
}

export function weekStart(ts = Date.now()) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function sessionsThisWeek(sessions: WorkoutSession[]) {
  const start = weekStart();
  return sessions.filter((s) => s.finishedAt && s.startedAt >= start);
}

/** Consecutive weeks (ending this week or last week) with at least one finished session. */
export function weekStreak(sessions: WorkoutSession[]) {
  const done = new Set(sessions.filter((s) => s.finishedAt).map((s) => weekStart(s.startedAt)));
  let streak = 0;
  let cursor = weekStart();
  if (!done.has(cursor)) cursor -= 7 * 864e5;
  while (done.has(cursor)) {
    streak++;
    cursor -= 7 * 864e5;
  }
  return streak;
}

export function nextProgram(programs: Program[], sessions: WorkoutSession[]): Program | null {
  if (!programs.length) return null;
  const ordered = [...programs].sort((a, b) => a.number - b.number);
  const last = [...sessions].filter((s) => s.finishedAt && s.programId).sort((a, b) => b.startedAt - a.startedAt)[0];
  if (!last) return ordered[0];
  const idx = ordered.findIndex((p) => p.id === last.programId);
  return ordered[(idx + 1) % ordered.length] ?? ordered[0];
}

export function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}

export const QUOTES = [
  "Count it. Own it. Stay accountable.",
  "The weight you lift today is the strength you keep tomorrow.",
  "Show up. Log it. That's the whole secret.",
  "Strong women count on each other.",
  "Every rep counts. Every set is a promise kept.",
  "You don't have to be extreme, just consistent.",
  "Train like Carolyn is watching.",
  "Small numbers, written down, become big changes.",
];
export function quoteOfTheDay() {
  const d = Math.floor(Date.now() / 864e5);
  return QUOTES[d % QUOTES.length];
}
