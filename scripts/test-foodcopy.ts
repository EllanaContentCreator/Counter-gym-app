import { copiesOf, copyableDays, mealsOf } from "../src/lib/foodcopy";
import type { DayRecord, FoodEntry } from "../src/lib/types";

let failed = 0;
const ok = (cond: boolean, what: string) => {
  console.log((cond ? "PASS  " : "FAIL  ") + what);
  if (!cond) failed++;
};

const now = new Date(2026, 9, 5, 12).getTime(); // Mon 5 Oct 2026
const e = (id: string, slot: FoodEntry["slot"], cal: number, protein: number, at: number, planMealId?: string): FoodEntry => ({ id, slot, name: id, quantity: "1", calories: cal, protein, loggedAt: at, planMealId });
const day = (date: string, food: FoodEntry[], rest: Partial<DayRecord> = {}): DayRecord => ({ date, food, ...rest });

const days: Record<string, DayRecord> = {
  "2026-10-05": day("2026-10-05", [e("today", "lunch", 500, 30, 5)]),
  "2026-10-04": day("2026-10-04", [e("dinner", "dinner", 900, 70, 40, "plan-d"), e("brek", "breakfast", 400, 30, 10, "plan-b"), e("brek2", "breakfast", 200, 10, 20), e("snack", "snack", 150, 5, 30)], { water: 2000, weight: 80 }),
  "2026-10-03": day("2026-10-03", [e("old", "lunch", 600, 40, 1)]),
  "2026-10-02": day("2026-10-02", [], { water: 500, weight: 79 }), // no food
  "2026-10-06": day("2026-10-06", [e("future", "lunch", 100, 1, 1)]), // tomorrow
  "2026-06-01": day("2026-06-01", [e("ancient", "lunch", 100, 1, 1)]), // months ago
  "2026-08-10": day("2026-08-10", [e("august", "lunch", 100, 1, 1)]), // 56 days ago
};

const list = copyableDays(days, "2026-10-05", now);
ok(list.map((d) => d.key).join() === "2026-10-04,2026-10-03,2026-08-10", "copyable days: newest first, with food, not today, not the future, not months ago");
ok(!list.some((d) => d.key === "2026-10-02"), "a day with only water and a weigh-in has no food to copy");
ok(list[0].calories === 1650 && list[0].protein === 115, "each day shows its calories and protein");
const fromYesterday = copyableDays(days, "2026-10-04", now);
ok(!fromYesterday.some((d) => d.key === "2026-10-04") && fromYesterday[0].key === "2026-10-05", "the day on screen is left out, but today can be copied from when viewing another day");
ok(copyableDays({}, "2026-10-05", now).length === 0, "no days gives an empty list");

const meals = mealsOf(days["2026-10-04"].food);
ok(meals.map((m) => m.slot).join() === "breakfast,snack,dinner", "meals come breakfast first, empty ones left out");
ok(meals[0].entries.map((x) => x.id).join() === "brek,brek2" && meals[0].calories === 600, "a meal's foods stay in the order eaten and add up");

let n = 0;
const copies = copiesOf(days["2026-10-04"].food, () => "new" + ++n, 1000);
ok(copies.length === 4 && new Set(copies.map((c) => c.id)).size === 4 && copies.every((c) => c.id.startsWith("new")), "every copy gets its own new id");
ok(copies.every((c) => c.planMealId === undefined), "copies aren't linked to the meal plan");
ok(copies.map((c) => c.loggedAt).join() === "1000,1001,1002,1003", "copies are logged now, one millisecond apart");
ok(copies.map((c) => c.name).join() === "brek,brek2,snack,dinner", "copies keep the order the originals were eaten in");
ok(copies[0].calories === 400 && copies[0].protein === 30 && copies[0].slot === "breakfast", "copies keep their calories, protein and meal");
ok(days["2026-10-04"].food[0].id === "dinner" && days["2026-10-04"].food[0].planMealId === "plan-d", "the originals are not touched");

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
