import type { AppData, DayRecord, DayType, Exercise, FoodEntry, PlanDay, Program, ProgramRow, SetEntry, TargetBand, WorkoutSession } from "./types";
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

/** The date a sheet belongs to: its training day, or when it was created. */
export function programDate(p: Program) {
  return p.date ?? p.createdAt;
}

export function programsThisWeek(programs: Program[]) {
  const start = weekStart();
  const end = start + 7 * 864e5;
  return programs.filter((p) => programDate(p) >= start && programDate(p) < end).sort((a, b) => programDate(a) - programDate(b));
}

/** Group sheets by (Monday-based) week, newest week first, sheets in date order inside a week. */
export function programsByWeek(programs: Program[]): { start: number; programs: Program[] }[] {
  const map = new Map<number, Program[]>();
  for (const p of programs) {
    const k = weekStart(programDate(p));
    map.set(k, [...(map.get(k) ?? []), p]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([start, list]) => ({ start, programs: list.sort((a, b) => programDate(a) - programDate(b) || a.number - b.number) }));
}

export function weekLabel(start: number) {
  const now = weekStart();
  if (start === now) return "This week";
  if (start === now - 7 * 864e5) return "Last week";
  const end = start + 6 * 864e5;
  const a = new Date(start), b = new Date(end);
  const sameMonth = a.getMonth() === b.getMonth();
  return `${a.getDate()}${sameMonth ? "" : " " + a.toLocaleDateString("en-AU", { month: "short" })} – ${b.getDate()} ${b.toLocaleDateString("en-AU", { month: "short" })}`;
}

/** "Tues 15 Sept" — the way Carolyn writes the day on her sheets. */
export function sheetDayLabel(ts: number) {
  const d = new Date(ts);
  const wd = ["Sun", "Mon", "Tues", "Wed", "Thur", "Fri", "Sat"][d.getDay()];
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"][d.getMonth()];
  return `${wd} ${d.getDate().toString().padStart(2, "0")} ${mo}`;
}

/** Local YYYY-MM-DD ⇄ ms, for <input type="date"> */
export function toDateInput(ts: number) {
  return dayKey(ts);
}
export function fromDateInput(v: string): number | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], 12).getTime();
}

/**
 * Move a whole workout to another day, keeping its shape. The sets slide by the
 * same amount as the start, so the order they were logged in — and the dates on
 * any personal bests — stay true to the session.
 */
export function retimeSession(session: WorkoutSession, ts: number): WorkoutSession {
  const delta = ts - session.startedAt;
  if (!delta) return session;
  return {
    ...session,
    startedAt: ts,
    finishedAt: session.finishedAt == null ? null : session.finishedAt + delta,
    entries: session.entries.map((e) => ({ ...e, completedAt: e.completedAt + delta })),
  };
}

/** True only when the chosen day is after today — noon on today is not "the future". */
export function isFutureDay(ts: number) {
  return dayKey(ts) > dayKey(Date.now());
}

/**
 * A believable clock time for a workout filed against a day. Dates from a date
 * picker land at midday, which for today can still be hours away, so a session
 * on today is pulled back far enough to have finished by now without ever
 * sliding into the day before.
 */
export function dayAnchor(ts: number, durationSec: number) {
  const dayStart = new Date(ts).setHours(0, 0, 0, 0);
  return Math.min(ts, Math.max(dayStart, Date.now() - durationSec * 1000));
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

// ───────────── Food ─────────────

/** Monday is 0, to match the plan and the Monday-based week helpers above. */
export function weekdayIndex(ts: number) {
  return (new Date(ts).getDay() + 6) % 7;
}

/** The plan for a given day, or undefined if that weekday has no plan. */
export function planForDay(mealPlan: PlanDay[], ts: number): PlanDay | undefined {
  return mealPlan.find((d) => d.weekday === weekdayIndex(ts));
}

/** What kind of day this is. Falls back to a normal day when nothing says otherwise. */
export function dayTypeFor(mealPlan: PlanDay[], ts: number): DayType {
  return planForDay(mealPlan, ts)?.dayType ?? "normal";
}

export function targetFor(data: Pick<AppData, "mealPlan" | "nutrition">, ts: number): TargetBand {
  return data.nutrition.targets[dayTypeFor(data.mealPlan, ts)];
}

/** Everything eaten on a day, added up. */
export function foodTotals(food: FoodEntry[]) {
  return food.reduce(
    (a, f) => ({
      calories: a.calories + (f.calories || 0),
      protein: a.protein + (f.protein || 0),
      carbs: a.carbs + (f.carbs || 0),
      fat: a.fat + (f.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function dayRecord(days: Record<string, DayRecord>, ts: number): DayRecord {
  const key = dayKey(ts);
  return days[key] ?? { date: key, food: [] };
}

/**
 * How a total sits against its band: below it, inside it, or past the top.
 * "over" is only ever a colour, never a telling-off.
 */
export function bandState(value: number, band: [number, number]): "under" | "inside" | "over" {
  if (value < band[0]) return "under";
  if (value > band[1]) return "over";
  return "inside";
}

// ───────────── Weight ─────────────

export interface WeighIn {
  /** YYYY-MM-DD */
  date: string;
  ts: number;
  kg: number;
}

/** Every weigh-in, oldest first. Days without one simply aren't there. */
export function weighIns(days: Record<string, DayRecord>): WeighIn[] {
  return Object.values(days)
    .filter((d): d is DayRecord & { weight: number } => typeof d.weight === "number")
    .map((d) => ({ date: d.date, ts: fromDateInput(d.date) ?? 0, kg: d.weight }))
    .sort((a, b) => a.ts - b.ts);
}

/**
 * Where she is against the goal.
 *
 * With no weigh-ins yet, the starting weight stands in as "current", so the
 * screen shows the whole journey ahead rather than a row of dashes.
 */
export function weightProgress(days: Record<string, DayRecord>, start: number, goal: number) {
  const list = weighIns(days);
  const latest = list.length ? list[list.length - 1] : undefined;
  const current = latest?.kg ?? start;
  const lost = start - current;
  const toGo = current - goal;
  const total = start - goal;
  return {
    list,
    latest,
    current,
    lost,
    toGo,
    total,
    /** 0-1 of the way from start to goal, clamped. */
    fraction: total === 0 ? 1 : Math.max(0, Math.min(1, lost / total)),
  };
}
