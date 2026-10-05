import type { DayType, PlanDay, PlanMeal } from "./types";
import { DEFAULT_MEAL_PLAN } from "@/data/nutrition";

/** Monday is 0, to match the rest of the app. */
export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** The plan for one weekday, or an empty normal day if that weekday has none yet. */
export function dayOf(plan: PlanDay[], weekday: number): PlanDay {
  return plan.find((d) => d.weekday === weekday) ?? { weekday, dayType: "normal", meals: [] };
}

/** Change one weekday, making it first if it isn't there. Always returns the week in Monday-first order. */
function withDay(plan: PlanDay[], weekday: number, change: (d: PlanDay) => PlanDay): PlanDay[] {
  const rest = plan.filter((d) => d.weekday !== weekday);
  return [...rest, change(dayOf(plan, weekday))].sort((a, b) => a.weekday - b.weekday);
}

/** Save a meal: replace the one with the same id (keeping its place), or add it on the end. */
export function saveMeal(plan: PlanDay[], weekday: number, meal: PlanMeal): PlanDay[] {
  return withDay(plan, weekday, (d) => {
    const has = d.meals.some((m) => m.id === meal.id);
    return { ...d, meals: has ? d.meals.map((m) => (m.id === meal.id ? meal : m)) : [...d.meals, meal] };
  });
}

export function removeMeal(plan: PlanDay[], weekday: number, mealId: string): PlanDay[] {
  return withDay(plan, weekday, (d) => ({ ...d, meals: d.meals.filter((m) => m.id !== mealId) }));
}

/** Move a meal up (-1) or down (1) the day. At either end nothing happens. */
export function moveMeal(plan: PlanDay[], weekday: number, mealId: string, by: -1 | 1): PlanDay[] {
  return withDay(plan, weekday, (d) => {
    const i = d.meals.findIndex((m) => m.id === mealId);
    const j = i + by;
    if (i < 0 || j < 0 || j >= d.meals.length) return d;
    const meals = [...d.meals];
    [meals[i], meals[j]] = [meals[j], meals[i]];
    return { ...d, meals };
  });
}

export function setDayType(plan: PlanDay[], weekday: number, dayType: DayType): PlanDay[] {
  return withDay(plan, weekday, (d) => ({ ...d, dayType }));
}

export function setFastingMorning(plan: PlanDay[], weekday: number, on: boolean): PlanDay[] {
  return withDay(plan, weekday, (d) => {
    const { fastingMorning: _drop, ...rest } = d;
    return on ? { ...rest, fastingMorning: true } : rest;
  });
}

/**
 * Give other days the same meals as this one. Each copy gets its own id, so logging a meal on
 * Tuesday never ticks it off on Thursday. The target days' type and fasting setting are left alone.
 */
export function copyDayMeals(plan: PlanDay[], from: number, to: number[], newId: () => string): PlanDay[] {
  const source = dayOf(plan, from).meals;
  let out = plan;
  for (const weekday of to) {
    if (weekday === from) continue;
    out = withDay(out, weekday, (d) => ({ ...d, meals: source.map((m) => ({ ...m, items: [...m.items], id: newId() })) }));
  }
  return out;
}

/** What a day's plan adds up to. Optional meals are counted separately, so the total is the "must" part. */
export function plannedTotals(day: PlanDay) {
  const sum = (ms: PlanMeal[], k: "calories" | "protein") => ms.reduce((a, m) => a + (m[k] || 0), 0);
  const must = day.meals.filter((m) => !m.optional);
  const optional = day.meals.filter((m) => m.optional);
  return {
    calories: sum(must, "calories"),
    protein: sum(must, "protein"),
    optionalCalories: sum(optional, "calories"),
    optionalProtein: sum(optional, "protein"),
  };
}

/** One ingredient per line in the box; blank lines and stray spaces don't count. */
export function parseItems(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export const itemsText = (items: string[]) => items.join("\n");

/** The original plan, as fresh copies that can be edited freely. */
export function originalPlan(): PlanDay[] {
  return DEFAULT_MEAL_PLAN.map((d) => ({ ...d, meals: d.meals.map((m) => ({ ...m, items: [...m.items] })) }));
}
