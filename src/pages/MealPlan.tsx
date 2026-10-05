import { useState } from "react";
import { Link } from "wouter";
import { actions, uid, useAppData } from "@/lib/store";
import { cn, bandState, weekdayIndex } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Button, Card, Empty, Sheet } from "@/components/ui";
import { PlanMealSheet } from "@/components/PlanMealSheet";
import { DAY_TYPE_LABEL, SLOT_LABEL } from "@/data/nutrition";
import { WEEKDAY_NAMES, copyDayMeals, dayOf, moveMeal, originalPlan, plannedTotals, removeMeal, saveMeal, setDayType, setFastingMorning } from "@/lib/mealplan";
import type { DayType, PlanMeal } from "@/lib/types";

const DAY_TYPES: DayType[] = ["strength", "cardio", "normal", "fasting"];

/** The regular week, editable: what she plans to eat each day, and what kind of day it is. */
export default function MealPlan() {
  const data = useAppData();
  const [weekday, setWeekday] = useState(() => weekdayIndex(Date.now()));
  const [editing, setEditing] = useState<PlanMeal | null>(null);
  const [sheet, setSheet] = useState<"meal" | "copy" | "reset" | null>(null);
  const [copyTo, setCopyTo] = useState<number[]>([]);
  const [note, setNote] = useState("");

  const plan = data.mealPlan;
  const day = dayOf(plan, weekday);
  const totals = plannedTotals(day);
  const band = data.nutrition.targets[day.dayType];
  const calState = bandState(totals.calories, band.calories);
  const proState = bandState(totals.protein, band.protein);

  const change = (next: typeof plan) => actions.updateMealPlan(next);
  const flash = (text: string) => {
    setNote(text);
    window.setTimeout(() => setNote((n) => (n === text ? "" : n)), 4000);
  };

  const openAdd = () => { setEditing(null); setSheet("meal"); };
  const openEdit = (m: PlanMeal) => { setEditing(m); setSheet("meal"); };
  const closeSheet = () => { setSheet(null); setEditing(null); };

  const saveMealDraft = (draft: Omit<PlanMeal, "id">) => {
    change(saveMeal(plan, weekday, { ...draft, id: editing?.id ?? uid() }));
    closeSheet();
  };

  const toggleCopy = (w: number) => setCopyTo((c) => (c.includes(w) ? c.filter((x) => x !== w) : [...c, w]));
  const doCopy = () => {
    change(copyDayMeals(plan, weekday, copyTo, uid));
    flash(`Copied ${WEEKDAY_NAMES[weekday]}'s meals to ${copyTo.length} day${copyTo.length === 1 ? "" : "s"}.`);
    setCopyTo([]);
    setSheet(null);
  };

  const stateText = (s: "under" | "inside" | "over", range: [number, number], unit: string) =>
    s === "inside" ? "In the band 👌" : `Band ${range[0]}–${range[1]}${unit}`;

  return (
    <div className="safe-bottom">
      <Header title="Weekly plan" sub="The meals you plan for each day" />
      <div className="space-y-4 px-4 pt-1">
        <Link href="/food" className="tap inline-block text-[13px] font-extrabold text-teal-700">← Back to Food</Link>

        <div className="scroll-x -mx-4 flex gap-2 px-4">
          {WEEKDAY_NAMES.map((name, i) => (
            <button
              key={name}
              onClick={() => setWeekday(i)}
              className={cn("tap shrink-0 rounded-full px-4 py-2 text-sm font-bold", weekday === i ? "grad-teal text-white shadow-[var(--shadow-pop)]" : "bg-white text-ink-soft shadow-card")}
            >
              {name.slice(0, 3)}
            </button>
          ))}
        </div>

        <Card className="space-y-3">
          <h3 className="display text-[22px]">{WEEKDAY_NAMES[weekday]}</h3>
          <div className="grid grid-cols-4 gap-1.5">
            {DAY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => change(setDayType(plan, weekday, t))}
                className={cn("tap h-11 rounded-xl text-[13px] font-extrabold", day.dayType === t ? "bg-teal-700 text-white" : "bg-sand text-ink-soft")}
              >
                {DAY_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between rounded-xl bg-sand px-3 py-3">
            <span>
              <span className="block text-sm font-bold">Fasting until about midday</span>
              <span className="block text-xs text-ink-soft">Shows a reminder on this day.</span>
            </span>
            <input type="checkbox" checked={!!day.fastingMorning} onChange={(e) => change(setFastingMorning(plan, weekday, e.target.checked))} className="h-6 w-6 shrink-0 accent-teal-700" />
          </label>
          <div className="rounded-xl border-2 border-sand px-3 py-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-ink-mute">Planned</span>
              <span className="text-[11px] font-semibold text-ink-soft">{DAY_TYPE_LABEL[day.dayType]} day</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="display text-[24px] text-teal-700">{totals.calories} <span className="text-sm">cal</span></span>
              <span className="display text-[24px] text-teal-700">{totals.protein}<span className="text-sm">g protein</span></span>
            </div>
            <div className="flex justify-between text-[11px] font-semibold text-ink-soft">
              <span>{stateText(calState, band.calories, "")}</span>
              <span>{stateText(proState, band.protein, "g")}</span>
            </div>
            {totals.optionalCalories > 0 && (
              <div className="mt-1 text-[11px] text-ink-mute">Plus {totals.optionalCalories} cal and {totals.optionalProtein}g protein if you have the optional ones.</div>
            )}
          </div>
        </Card>

        {day.meals.length === 0 ? (
          <Empty icon="🍽️" title="No meals planned" body={`Add what you plan to eat on ${WEEKDAY_NAMES[weekday]}, and it shows up with an "I ate this" button.`} />
        ) : (
          <div className="space-y-2">
            {day.meals.map((m, i) => (
              <Card key={m.id} className="p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 rounded-md bg-sand px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-soft">{SLOT_LABEL[m.slot]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold leading-tight">
                      {m.title}
                      {m.optional && <span className="ml-1.5 text-[10px] font-extrabold uppercase text-ink-mute">optional</span>}
                    </div>
                    {m.items.length > 0 && <div className="mt-0.5 text-[11px] leading-snug text-ink-soft">{m.items.join(" · ")}</div>}
                    <div className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">{m.calories} cal · {m.protein}g protein</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(m)}>Change</Button>
                  <div className="flex-1" />
                  <button aria-label="Move up" disabled={i === 0} onClick={() => change(moveMeal(plan, weekday, m.id, -1))} className="tap grid h-9 w-9 place-items-center rounded-full bg-sand text-ink-soft disabled:opacity-30">↑</button>
                  <button aria-label="Move down" disabled={i === day.meals.length - 1} onClick={() => change(moveMeal(plan, weekday, m.id, 1))} className="tap grid h-9 w-9 place-items-center rounded-full bg-sand text-ink-soft disabled:opacity-30">↓</button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Button full size="lg" onClick={openAdd}>＋ Add a meal to {WEEKDAY_NAMES[weekday]}</Button>
        {day.meals.length > 0 && (
          <Button full variant="secondary" onClick={() => { setCopyTo([]); setSheet("copy"); }}>Copy these meals to other days</Button>
        )}
        {note && <p className="text-center text-sm font-bold text-teal-700">{note}</p>}

        <button onClick={() => setSheet("reset")} className="tap block w-full pt-2 text-center text-[12px] font-extrabold text-ink-mute">Put the plan back to the original</button>
      </div>

      <PlanMealSheet
        open={sheet === "meal"}
        onClose={closeSheet}
        meal={editing}
        onSave={saveMealDraft}
        onDelete={editing ? () => { change(removeMeal(plan, weekday, editing.id)); closeSheet(); } : undefined}
      />

      <Sheet open={sheet === "copy"} onClose={() => setSheet(null)} title={`Copy ${WEEKDAY_NAMES[weekday]}'s meals`}>
        <p className="text-sm text-ink-soft">Pick the days that should have the same meals. <b>Their current meals are replaced.</b> Each day keeps its own type (strength, fasting and so on).</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {WEEKDAY_NAMES.map((name, i) =>
            i === weekday ? null : (
              <button
                key={name}
                onClick={() => toggleCopy(i)}
                className={cn("tap h-11 rounded-xl text-sm font-extrabold", copyTo.includes(i) ? "bg-teal-700 text-white" : "bg-sand text-ink-soft")}
              >
                {name}
              </button>
            ),
          )}
        </div>
        <Button full className="mt-4" disabled={copyTo.length === 0} onClick={doCopy}>
          Copy to {copyTo.length || "…"} day{copyTo.length === 1 ? "" : "s"}
        </Button>
      </Sheet>

      <Sheet open={sheet === "reset"} onClose={() => setSheet(null)} title="Back to the original?">
        <p className="text-sm text-ink-soft">This puts all seven days back to the plan the app started with. <b>Every meal you've added or changed is lost.</b> What you've already eaten and logged is not touched.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setSheet(null)}>Keep my plan</Button>
          <Button variant="danger" onClick={() => { change(originalPlan()); setSheet(null); flash("The plan is back to the original."); }}>Reset the plan</Button>
        </div>
      </Sheet>
    </div>
  );
}
