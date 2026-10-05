import type { AppData } from "./types";
import { bandState, dayKey, foodTotals, fromDateInput, targetFor, weekStart } from "./utils";

/** How far back the summary looks. */
export type Range = 7 | 30 | "all";

export interface ChartPoint {
  label: string;
  /** Average calories for the day (or week), or null when nothing was logged. */
  calories: number | null;
  /** Where that sits against the day's band. */
  state: "under" | "inside" | "over" | null;
}

export interface Summary {
  /** Days the range covers, today included. */
  totalDays: number;
  workouts: number;
  /** Workouts per week over the range. */
  perWeek: number;
  /** Days with anything at all logged: food, water, a weigh-in or a workout. */
  daysTracked: number;
  /** Complete days with food logged (today is left out until it's over). */
  foodDays: number;
  avgCalories: number | null;
  avgProtein: number | null;
  calorieDaysInside: number;
  proteinDaysInside: number;
  waterDays: number;
  avgWater: number | null;
  waterDaysHit: number;
  /** Change between the first and last weigh-in in the range, or null with fewer than two. */
  weightChange: number | null;
  weighIns: { date: string; ts: number; kg: number }[];
  chart: ChartPoint[];
  /** True when the chart shows weekly averages rather than single days. */
  chartIsWeekly: boolean;
}

/** Midday on the day `back` days before `today`, so a DST change can't tip it into the wrong date. */
function dayAt(today: Date, back: number) {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - back, 12).getTime();
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function summarise(
  data: Pick<AppData, "days" | "sessions" | "mealPlan" | "nutrition">,
  range: Range,
  now = Date.now(),
): Summary {
  const today = new Date(now);
  const todayKey = dayKey(now);

  let totalDays: number;
  if (range === "all") {
    const stamps: number[] = [];
    for (const key of Object.keys(data.days)) {
      const d = data.days[key];
      if (d.food.length || d.water || typeof d.weight === "number") {
        const ts = fromDateInput(key);
        if (ts !== null) stamps.push(ts);
      }
    }
    for (const s of data.sessions) if (s.finishedAt) stamps.push(s.startedAt);
    const first = stamps.length ? Math.min(...stamps) : now;
    const firstDay = new Date(first);
    const start = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate()).getTime();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    totalDays = Math.max(1, Math.round((end - start) / 864e5) + 1);
  } else {
    totalDays = range;
  }

  const keys: { key: string; ts: number }[] = [];
  for (let back = totalDays - 1; back >= 0; back--) {
    const ts = dayAt(today, back);
    keys.push({ key: dayKey(ts), ts });
  }
  const inRange = new Set(keys.map((k) => k.key));

  const finished = data.sessions.filter((s) => s.finishedAt && inRange.has(dayKey(s.startedAt)));
  const workoutDays = new Set(finished.map((s) => dayKey(s.startedAt)));

  const calories: number[] = [];
  const protein: number[] = [];
  const water: number[] = [];
  let calorieDaysInside = 0;
  let proteinDaysInside = 0;
  let waterDaysHit = 0;
  let daysTracked = 0;
  const perDay = new Map<string, ChartPoint>();

  for (const { key, ts } of keys) {
    const day = data.days[key];
    const hasFood = !!day && day.food.length > 0;
    const hasWater = !!day && (day.water ?? 0) > 0;
    const hasWeight = !!day && typeof day.weight === "number";
    if (hasFood || hasWater || hasWeight || workoutDays.has(key)) daysTracked++;

    const complete = key !== todayKey; // today is still being eaten
    let point: ChartPoint = { label: key, calories: null, state: null };
    if (hasFood) {
      const totals = foodTotals(day!.food);
      const band = targetFor(data, ts);
      point = { label: key, calories: Math.round(totals.calories), state: bandState(totals.calories, band.calories) };
      if (complete) {
        calories.push(totals.calories);
        protein.push(totals.protein);
        if (bandState(totals.calories, band.calories) === "inside") calorieDaysInside++;
        if (bandState(totals.protein, band.protein) === "inside") proteinDaysInside++;
      }
    }
    if (hasWater && complete) {
      water.push(day!.water!);
      if (day!.water! >= data.nutrition.waterTarget) waterDaysHit++;
    }
    perDay.set(key, point);
  }

  const weighIns = keys
    .map(({ key, ts }) => ({ date: key, ts, kg: data.days[key]?.weight }))
    .filter((w): w is { date: string; ts: number; kg: number } => typeof w.kg === "number");
  const weightChange = weighIns.length >= 2 ? round1(weighIns[weighIns.length - 1].kg - weighIns[0].kg) : null;

  // Up to a month shows each day; longer shows a weekly average so the bars stay readable.
  const chartIsWeekly = totalDays > 31;
  let chart: ChartPoint[];
  if (!chartIsWeekly) {
    chart = keys.map(({ key, ts }) => {
      const p = perDay.get(key)!;
      return { ...p, label: new Date(ts).toLocaleDateString("en-AU", totalDays <= 7 ? { weekday: "short" } : { day: "numeric" }) };
    });
  } else {
    const weeks = new Map<number, number[]>();
    const states = new Map<number, ("under" | "inside" | "over")[]>();
    for (const { key, ts } of keys) {
      const p = perDay.get(key)!;
      if (p.calories === null) continue;
      const w = weekStart(ts);
      weeks.set(w, [...(weeks.get(w) ?? []), p.calories]);
      states.set(w, [...(states.get(w) ?? []), p.state!]);
    }
    chart = [...weeks.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([w, cals]) => {
        const avg = mean(cals)!;
        const ts = new Date(w).getTime();
        // A week reads as "inside" when most of its logged days landed in their band.
        const insideShare = states.get(w)!.filter((s) => s === "inside").length / cals.length;
        return {
          label: new Date(ts).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
          calories: Math.round(avg),
          state: insideShare >= 0.5 ? ("inside" as const) : null,
        };
      });
  }

  return {
    totalDays,
    workouts: finished.length,
    perWeek: round1(finished.length / (totalDays / 7)),
    daysTracked,
    foodDays: calories.length,
    avgCalories: calories.length ? Math.round(mean(calories)!) : null,
    avgProtein: protein.length ? Math.round(mean(protein)!) : null,
    calorieDaysInside,
    proteinDaysInside,
    waterDays: water.length,
    avgWater: water.length ? Math.round(mean(water)!) : null,
    waterDaysHit,
    weightChange,
    weighIns,
    chart,
    chartIsWeekly,
  };
}
