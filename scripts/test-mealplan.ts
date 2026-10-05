import { copyDayMeals, dayOf, itemsText, moveMeal, originalPlan, parseItems, plannedTotals, removeMeal, saveMeal, setDayType, setFastingMorning } from "../src/lib/mealplan";
import { DEFAULT_MEAL_PLAN } from "../src/data/nutrition";
import type { PlanMeal } from "../src/lib/types";

let failed = 0;
const ok = (cond: boolean, what: string) => {
  console.log((cond ? "PASS  " : "FAIL  ") + what);
  if (!cond) failed++;
};

const plan = originalPlan();
const snapshot = JSON.stringify(plan);
const ids = (w: number, p = plan) => dayOf(p, w).meals.map((m) => m.id).join();

ok(plan.length === 7 && plan.every((d, i) => d.weekday === i), "the original plan has seven days, Monday first");
ok(JSON.stringify(DEFAULT_MEAL_PLAN) === JSON.stringify(originalPlan()), "a fresh copy matches the built-in plan");
const edited = originalPlan();
edited[0].meals[0].items.push("extra");
ok(!DEFAULT_MEAL_PLAN[0].meals[0].items.includes("extra"), "editing a copy never changes the built-in plan");

// ── Saving ──
const newMeal: PlanMeal = { id: "mon-new", slot: "snack", title: "Apple and peanut butter", items: ["Apple", "Peanut butter"], calories: 190, protein: 6 };
const added = saveMeal(plan, 0, newMeal);
ok(ids(0, added).endsWith(",mon-new") && dayOf(added, 0).meals.length === dayOf(plan, 0).meals.length + 1, "a new meal goes on the end of the day");
const tweaked = saveMeal(added, 0, { ...newMeal, title: "Apple and almond butter", calories: 200 });
ok(dayOf(tweaked, 0).meals.length === dayOf(added, 0).meals.length && dayOf(tweaked, 0).meals.at(-1)!.title === "Apple and almond butter", "saving a meal with the same id replaces it instead of adding another");
const mid = saveMeal(plan, 1, { ...dayOf(plan, 1).meals[1], title: "Changed" });
ok(ids(1, mid) === ids(1) && dayOf(mid, 1).meals[1].title === "Changed", "an edited meal keeps its place and its id");
ok(JSON.stringify(plan) === snapshot, "none of that changed the plan it started from");

// ── A weekday that isn't there yet ──
const gap = plan.filter((d) => d.weekday !== 2);
const filled = saveMeal(gap, 2, { ...newMeal, id: "wed-new" });
ok(filled.length === 7 && filled[2].weekday === 2 && filled[2].dayType === "normal" && filled[2].meals.length === 1, "saving onto a missing day creates it as a normal day, in the right order");

// ── Removing and moving ──
const gone = removeMeal(plan, 0, "mon-snack");
ok(!ids(0, gone).includes("mon-snack") && dayOf(gone, 0).meals.length === 3, "a meal can be removed");
ok(ids(0, removeMeal(plan, 0, "nope")) === ids(0), "removing a meal that isn't there changes nothing");
const down = moveMeal(plan, 0, "mon-lunch", 1);
ok(ids(0, down).startsWith("mon-snack,mon-lunch"), "a meal can move down");
const up = moveMeal(plan, 0, "mon-snack", -1);
ok(ids(0, up).startsWith("mon-snack,mon-lunch"), "a meal can move up");
ok(ids(0, moveMeal(plan, 0, "mon-lunch", -1)) === ids(0), "the first meal can't move up");
ok(ids(0, moveMeal(plan, 0, "mon-extra", 1)) === ids(0), "the last meal can't move down");

// ── Day settings ──
ok(dayOf(setDayType(plan, 3, "cardio"), 3).dayType === "cardio" && dayOf(plan, 3).dayType === "strength", "the day type changes for that day only");
ok(dayOf(setFastingMorning(plan, 1, true), 1).fastingMorning === true, "fasting morning can be switched on");
ok(!("fastingMorning" in dayOf(setFastingMorning(plan, 0, false), 0)), "and off, leaving no stray flag behind");

// ── Copying a day's meals ──
let n = 0;
const copied = copyDayMeals(plan, 1, [3, 4], () => "c" + ++n);
ok(dayOf(copied, 3).meals.length === dayOf(plan, 1).meals.length && dayOf(copied, 4).meals.length === dayOf(plan, 1).meals.length, "meals are copied onto the chosen days");
ok(new Set([...dayOf(copied, 3).meals, ...dayOf(copied, 4).meals].map((m) => m.id)).size === dayOf(plan, 1).meals.length * 2, "every copy has its own id");
ok(dayOf(copied, 3).dayType === "strength" && dayOf(copied, 4).dayType === "normal" && dayOf(plan, 4).dayType === "normal", "target days keep their own day type");
ok(dayOf(copied, 3).meals[0].title === dayOf(plan, 1).meals[0].title && dayOf(copied, 1).meals.map((m) => m.id).join() === ids(1), "copies read the same, and the source day is untouched");
copied[3].meals[0].items.push("changed");
ok(!dayOf(plan, 1).meals[0].items.includes("changed") && !dayOf(copied, 1).meals[0].items.includes("changed"), "copies don't share their ingredient lists with the original");
ok(ids(1, copyDayMeals(plan, 1, [1], () => "x")) === ids(1), "copying a day onto itself does nothing");

// ── Totals ──
const t = plannedTotals(dayOf(plan, 0));
ok(t.calories === 560 + 200 + 680 && t.protein === 50 + 20 + 45, "a day's total leaves out optional meals");
ok(t.optionalCalories === 160 && t.optionalProtein === 25, "optional meals add up on their own");
ok(plannedTotals({ weekday: 0, dayType: "normal", meals: [] }).calories === 0, "an empty day totals zero");

// ── Ingredient text ──
ok(parseItems("  Chicken \n\nSalad\n   \n Feta ").join("|") === "Chicken|Salad|Feta", "ingredient lines are trimmed and blanks dropped");
ok(parseItems(itemsText(["150–180 g chicken", "Salad, mixed"])).join("|") === "150–180 g chicken|Salad, mixed", "ingredients with commas survive a round trip");
ok(parseItems("").length === 0, "no text means no ingredients");

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
