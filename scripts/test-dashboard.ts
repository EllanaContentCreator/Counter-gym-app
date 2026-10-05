import { DEFAULT_MEAL_PLAN, DEFAULT_NUTRITION } from "../src/data/nutrition";
import { summarise } from "../src/lib/dashboard";
import type { DayRecord, FoodEntry, WorkoutSession } from "../src/lib/types";

let failed = 0;
const ok = (cond: boolean, what: string) => {
  console.log((cond ? "PASS  " : "FAIL  ") + what);
  if (!cond) failed++;
};

// Monday 5 Oct 2026, midday. Sunday 4th is a fasting day (1550–1650 cal, 130–145 protein);
// Saturday 3rd is a strength day (1700–1750 cal, 140–150 protein).
const now = new Date(2026, 9, 5, 12).getTime();
const at = (d: number, h = 9) => new Date(2026, 9, d, h).getTime();
const food = (id: string, calories: number, protein: number, when: number): FoodEntry => ({ id, slot: "lunch", name: id, quantity: "1", calories, protein, loggedAt: when });
const day = (date: string, rest: Partial<DayRecord>): DayRecord => ({ date, food: [], ...rest });
const session = (id: string, when: number): WorkoutSession => ({ id, programId: null, programName: "T", mode: "free", startedAt: when, finishedAt: when + 1, durationSec: 60, entries: [], notes: "" });

const days: Record<string, DayRecord> = {
  "2026-10-05": day("2026-10-05", { food: [food("t", 500, 20, at(5))] }), // today, still in progress
  "2026-10-04": day("2026-10-04", { food: [food("a", 1000, 80, at(4)), food("b", 600, 60, at(4, 13))], water: 2000 }), // inside both
  "2026-10-03": day("2026-10-03", { food: [food("c", 1900, 100, at(3))], water: 1000, weight: 80 }), // over, protein under
  "2026-10-01": day("2026-10-01", { weight: 79 }),
  "2026-08-01": day("2026-08-01", { food: [food("old", 1600, 135, at(1))] }),
};
const data = {
  days,
  sessions: [session("w1", at(1)), session("w2", new Date(2026, 7, 1, 9).getTime()), { ...session("unfinished", at(2)), finishedAt: null }],
  mealPlan: DEFAULT_MEAL_PLAN,
  nutrition: DEFAULT_NUTRITION,
};

const w = summarise(data, 7, now);
ok(w.totalDays === 7, "7-day range covers 7 days");
ok(w.workouts === 1, "counts only finished workouts inside the range (not the unfinished one, not August's)");
ok(w.perWeek === 1, "one workout in a week is 1 a week");
ok(w.daysTracked === 4, "days tracked = today, 4th, 3rd and 1st (1st has a weigh-in and a workout)");
ok(w.foodDays === 2, "today is left out of the food averages");
ok(w.avgCalories === 1750, "average calories over the two complete days is 1750");
ok(w.avgProtein === 120, "average protein over the two complete days is 120");
ok(w.calorieDaysInside === 1, "one day landed inside its calorie band (Sunday 1600 in 1550-1650)");
ok(w.proteinDaysInside === 1, "one day landed inside its protein band (Sunday 140 in 130-145)");
ok(w.waterDays === 2 && w.avgWater === 1500, "water: two days logged, average 1500");
ok(w.waterDaysHit === 1, "one day hit the 2000 water target");
ok(w.weightChange === 1, "weight change is the last weigh-in minus the first in range (79 then 80 = +1)");
ok(w.weighIns.length === 2, "two weigh-ins in range");
ok(w.chart.length === 7 && !w.chartIsWeekly, "7-day chart has one bar slot per day");
ok(w.chart[6].calories === 500 && w.chart[5].calories === 1600 && w.chart[4].calories === 1900 && w.chart[3].calories === null, "chart bars hold each day's calories, gaps are null");
ok(w.chart[5].state === "inside" && w.chart[4].state === "over", "chart states sit against each day's own band");

const m = summarise(data, 30, now);
ok(m.totalDays === 30 && m.workouts === 1 && !m.chartIsWeekly, "30-day range still excludes August");

const all = summarise(data, "all", now);
ok(all.totalDays === 66, "all-time runs from the first logged day (1 Aug) to today");
ok(all.workouts === 2, "all-time counts both finished workouts");
ok(all.chartIsWeekly && all.chart.length >= 2, "all-time chart switches to weekly averages");
ok(all.foodDays === 3, "all-time food days = 1 Aug, 3rd, 4th (today left out)");

const empty = summarise({ days: {}, sessions: [], mealPlan: DEFAULT_MEAL_PLAN, nutrition: DEFAULT_NUTRITION }, 7, now);
ok(empty.workouts === 0 && empty.daysTracked === 0 && empty.avgCalories === null && empty.weightChange === null, "an empty app shows zeros and blanks, not errors");
const emptyAll = summarise({ days: {}, sessions: [], mealPlan: DEFAULT_MEAL_PLAN, nutrition: DEFAULT_NUTRITION }, "all", now);
ok(emptyAll.totalDays === 1 && emptyAll.chart.every((p) => p.calories === null), "all-time on an empty app is one day with nothing in the chart");

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
