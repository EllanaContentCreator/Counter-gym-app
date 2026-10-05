import type { DayRecord, FoodEntry, MealSlot } from "./types";
import { SLOT_ORDER } from "@/data/nutrition";
import { dayKey, foodTotals, fromDateInput } from "./utils";

/** A past day that has food on it, ready to copy from. */
export interface CopyDay {
  key: string;
  ts: number;
  entries: FoodEntry[];
  calories: number;
  protein: number;
}

/** The days she could copy from, newest first: days with food, not the one on screen, not the future. */
export function copyableDays(days: Record<string, DayRecord>, exceptKey: string, now = Date.now(), maxBack = 60): CopyDay[] {
  const todayKey = dayKey(now);
  const out: CopyDay[] = [];
  for (const [key, rec] of Object.entries(days)) {
    if (key === exceptKey || key > todayKey || rec.food.length === 0) continue;
    const ts = fromDateInput(key);
    if (ts === null) continue;
    if ((now - ts) / 864e5 > maxBack + 1) continue;
    const t = foodTotals(rec.food);
    out.push({ key, ts, entries: rec.food, calories: Math.round(t.calories), protein: Math.round(t.protein) });
  }
  return out.sort((a, b) => (a.key < b.key ? 1 : -1));
}

export interface Meal {
  slot: MealSlot;
  entries: FoodEntry[];
  calories: number;
}

/** A day's food split into its meals, breakfast to extras, empty meals left out. */
export function mealsOf(entries: FoodEntry[]): Meal[] {
  return SLOT_ORDER.map((slot) => {
    const list = entries.filter((f) => f.slot === slot).sort((a, b) => a.loggedAt - b.loggedAt);
    return { slot, entries: list, calories: Math.round(list.reduce((a, f) => a + (f.calories || 0), 0)) };
  }).filter((m) => m.entries.length > 0);
}

/**
 * Fresh copies to log on another day: new ids, logged now (a millisecond apart so the order
 * holds), and no link back to the meal plan, so a copy never ticks off a plan meal by accident.
 */
export function copiesOf(entries: FoodEntry[], newId: () => string, now = Date.now()): FoodEntry[] {
  return [...entries]
    .sort((a, b) => a.loggedAt - b.loggedAt)
    .map((e, i) => ({ ...e, id: newId(), loggedAt: now + i, planMealId: undefined }));
}
