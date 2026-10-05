import type { AppData, DayType, FoodEntry, MealSlot, TargetBand, WorkoutSession } from "./types";
import { SLOT_ORDER } from "@/data/nutrition";
import { bandState, dayKey, dayTypeFor, foodTotals, fromDateInput, targetFor } from "./utils";

/** What was logged on a day, enough to draw the dots on the grid. */
export interface Marks {
  workout: boolean;
  food: boolean;
  water: boolean;
  weight: boolean;
}

export interface Cell {
  /** YYYY-MM-DD */
  key: string;
  day: number;
  /** False for the padding days before the 1st and after the last day. */
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  marks: Marks;
}

type CalData = Pick<AppData, "days" | "sessions">;

/** Which days have a finished workout on them, as a set of YYYY-MM-DD. */
export function workoutDays(sessions: WorkoutSession[]): Set<string> {
  return new Set(sessions.filter((s) => s.finishedAt).map((s) => dayKey(s.startedAt)));
}

/** A month as rows of seven, Monday first, padded with days from the neighbouring months. */
export function monthGrid(data: CalData, year: number, month: number, now = Date.now()): Cell[][] {
  const first = new Date(year, month, 1, 12);
  const lead = (first.getDay() + 6) % 7;
  const inMonthDays = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((lead + inMonthDays) / 7) * 7;
  const todayKey = dayKey(now);
  const worked = workoutDays(data.sessions);
  const rows: Cell[][] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(year, month, 1 - lead + i, 12);
    const key = dayKey(d.getTime());
    const rec = data.days[key];
    const cell: Cell = {
      key,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: key === todayKey,
      isFuture: key > todayKey,
      marks: {
        workout: worked.has(key),
        food: !!rec && rec.food.length > 0,
        water: !!rec && (rec.water ?? 0) > 0,
        weight: !!rec && typeof rec.weight === "number",
      },
    };
    if (i % 7 === 0) rows.push([]);
    rows[rows.length - 1].push(cell);
  }
  return rows;
}

export interface MealGroup {
  slot: MealSlot;
  entries: FoodEntry[];
  calories: number;
}

export interface DayDetail {
  key: string;
  ts: number;
  sessions: WorkoutSession[];
  meals: MealGroup[];
  totals: { calories: number; protein: number };
  dayType: DayType;
  band: TargetBand;
  calorieState: "under" | "inside" | "over" | null;
  proteinState: "under" | "inside" | "over" | null;
  water: number;
  weight: number | null;
  /** Nothing at all was logged. */
  empty: boolean;
}

/** Everything that happened on one day, ready to show. */
export function dayDetail(data: Pick<AppData, "days" | "sessions" | "mealPlan" | "nutrition">, key: string): DayDetail {
  const ts = fromDateInput(key) ?? Date.now();
  const rec = data.days[key];
  const food = rec?.food ?? [];
  const sessions = data.sessions.filter((s) => s.finishedAt && dayKey(s.startedAt) === key).sort((a, b) => a.startedAt - b.startedAt);
  const meals: MealGroup[] = SLOT_ORDER.map((slot) => {
    const entries = food.filter((f) => f.slot === slot).sort((a, b) => a.loggedAt - b.loggedAt);
    return { slot, entries, calories: Math.round(entries.reduce((a, f) => a + (f.calories || 0), 0)) };
  }).filter((g) => g.entries.length > 0);
  const t = foodTotals(food);
  const band = targetFor(data, ts);
  const hasFood = food.length > 0;
  const water = rec?.water ?? 0;
  const weight = typeof rec?.weight === "number" ? rec.weight : null;
  return {
    key,
    ts,
    sessions,
    meals,
    totals: { calories: Math.round(t.calories), protein: Math.round(t.protein) },
    dayType: dayTypeFor(data.mealPlan, ts),
    band,
    calorieState: hasFood ? bandState(t.calories, band.calories) : null,
    proteinState: hasFood ? bandState(t.protein, band.protein) : null,
    water,
    weight,
    empty: !sessions.length && !hasFood && !water && weight === null,
  };
}

/** Days from today to the given day (negative for the past), for the Food screen's day offset. */
export function dayOffset(key: string, now = Date.now()): number {
  const ts = fromDateInput(key);
  if (ts === null) return 0;
  const a = new Date(ts);
  const b = new Date(now);
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ua - ub) / 864e5);
}
