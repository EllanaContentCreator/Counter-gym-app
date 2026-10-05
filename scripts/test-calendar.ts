import { DEFAULT_MEAL_PLAN, DEFAULT_NUTRITION } from "../src/data/nutrition";
import { dayDetail, dayOffset, monthGrid } from "../src/lib/calendar";
import type { DayRecord, FoodEntry, WorkoutSession } from "../src/lib/types";

let failed = 0;
const ok = (cond: boolean, what: string) => {
  console.log((cond ? "PASS  " : "FAIL  ") + what);
  if (!cond) failed++;
};

// Monday 5 Oct 2026, midday.
const now = new Date(2026, 9, 5, 12).getTime();
const at = (d: number, h = 9) => new Date(2026, 9, d, h).getTime();
const food = (id: string, slot: FoodEntry["slot"], cal: number, protein: number, when: number): FoodEntry => ({ id, slot, name: id, quantity: "1", calories: cal, protein, loggedAt: when });
const session = (id: string, when: number, finished = true): WorkoutSession => ({ id, programId: null, programName: id, mode: "free", startedAt: when, finishedAt: finished ? when + 1 : null, durationSec: 60, entries: [], notes: "" });
const day = (date: string, rest: Partial<DayRecord>): DayRecord => ({ date, food: [], ...rest });

const days: Record<string, DayRecord> = {
  "2026-10-04": day("2026-10-04", { food: [food("dinner1", "dinner", 900, 70, at(4, 18)), food("brek", "breakfast", 700, 60, at(4, 8))], water: 2000, weight: 80.5 }),
  "2026-10-02": day("2026-10-02", { water: 500 }),
};
const data = {
  days,
  sessions: [session("A", at(4)), session("B", at(4, 17)), session("running", at(3), false), session("C", new Date(2026, 8, 30, 9).getTime())],
  mealPlan: DEFAULT_MEAL_PLAN,
  nutrition: DEFAULT_NUTRITION,
};

// ── The grid ──
const oct = monthGrid(data, 2026, 9, now);
ok(oct.every((r) => r.length === 7), "every row has seven days");
ok(oct.length === 5, "October 2026 needs five rows");
ok(oct[0][0].key === "2026-09-28" && !oct[0][0].inMonth, "the grid starts on the Monday before the 1st");
ok(oct[0][3].key === "2026-10-01" && oct[0][3].inMonth, "1 Oct 2026 is a Thursday, in the fourth column");
ok(oct[4][6].key === "2026-11-01" && !oct[4][6].inMonth, "it ends with days from November");
const cell = (key: string) => oct.flat().find((c) => c.key === key)!;
ok(cell("2026-10-05").isToday && !cell("2026-10-04").isToday, "only today is marked as today");
ok(cell("2026-10-06").isFuture && !cell("2026-10-05").isFuture, "tomorrow is the future, today isn't");
ok(cell("2026-10-04").marks.workout && cell("2026-10-04").marks.food && cell("2026-10-04").marks.water && cell("2026-10-04").marks.weight, "4 Oct has all four marks");
ok(!cell("2026-10-03").marks.workout, "an unfinished workout doesn't make a mark");
ok(cell("2026-10-02").marks.water && !cell("2026-10-02").marks.food && !cell("2026-10-02").marks.workout, "2 Oct has only water");
ok(cell("2026-09-30").marks.workout && !cell("2026-09-30").inMonth, "a padding day from September still shows its workout");
const feb = monthGrid(data, 2026, 1, now);
ok(feb.length === 5 && feb[0][6].key === "2026-02-01" && feb[0][6].inMonth, "1 Feb 2026 is a Sunday, so it sits at the end of the first row");
ok(feb.flat().filter((c) => c.inMonth).length === 28, "February 2026 has 28 days");
const leap = monthGrid(data, 2028, 1, now);
ok(leap.flat().filter((c) => c.inMonth).length === 29, "February 2028 has 29 days");
ok(monthGrid(data, 2026, 11, now).flat().some((c) => c.key === "2027-01-03"), "December runs into January");

// ── A day ──
const d4 = dayDetail(data, "2026-10-04");
ok(d4.sessions.length === 2 && d4.sessions[0].id === "A" && d4.sessions[1].id === "B", "two workouts, earliest first");
ok(d4.meals.map((m) => m.slot).join() === "breakfast,dinner", "meals come in breakfast-to-dinner order, empty meals left out");
ok(d4.meals[0].entries[0].id === "brek" && d4.meals[1].calories === 900, "meal totals add up");
ok(d4.totals.calories === 1600 && d4.totals.protein === 130, "day totals add up");
ok(d4.dayType === "fasting", "Sunday is a fasting day in the default plan");
ok(d4.calorieState === "inside" && d4.proteinState === "inside", "1600 cal and 130 g protein are inside a fasting day's bands");
ok(d4.water === 2000 && d4.weight === 80.5, "water and weight come through");
ok(!d4.empty, "a busy day isn't empty");
const d3 = dayDetail(data, "2026-10-03");
ok(d3.empty && d3.sessions.length === 0 && d3.calorieState === null, "a day with only an unfinished workout is empty");
const d2 = dayDetail(data, "2026-10-02");
ok(!d2.empty && d2.water === 500 && d2.weight === null, "a water-only day isn't empty");

// ── Jumping to the Food screen ──
ok(dayOffset("2026-10-05", now) === 0, "today is offset 0");
ok(dayOffset("2026-10-04", now) === -1, "yesterday is offset -1");
ok(dayOffset("2026-09-05", now) === -30, "30 days back");
ok(dayOffset("2026-10-07", now) === 2, "two days ahead");
ok(dayOffset("2025-10-05", now) === -365, "a year back");
ok(dayOffset("garbage", now) === 0, "a bad date falls back to today");

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
