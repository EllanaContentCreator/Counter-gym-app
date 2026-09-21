import { useMemo, useState } from "react";
import { useAppData, actions, uid } from "@/lib/store";
import type { FoodEntry, FoodFavourite, MealSlot, PlanMeal } from "@/lib/types";
import { DAY_TYPE_LABEL, SLOT_LABEL, SLOT_ORDER } from "@/data/nutrition";
import {
  bandState,
  cn,
  dayKey,
  dayTypeFor,
  foodTotals,
  formatDate,
  planForDay,
  targetFor,
} from "@/lib/utils";
import { Header, TimerButton } from "@/components/Header";
import { Button, Card, Empty, Pill } from "@/components/ui";
import { FoodSheet, draftFrom, emptyDraft, entryFromDraft, type FoodDraft } from "@/components/FoodSheet";
import { WaterCard } from "@/components/Water";
import { IconBack, IconCheck, IconNext, IconPlus, IconStar, IconTrash } from "@/components/Icons";

/**
 * A total against its band. The band is drawn as a lighter stretch of the
 * track, so landing anywhere inside it reads as a good day rather than a near
 * miss of one exact number.
 */
function TargetBar({ label, value, band, unit, tone }: { label: string; value: number; band: [number, number]; unit: string; tone: "teal" | "coral" }) {
  const state = bandState(value, band);
  // The track runs to a little past the top of the band, so a normal day fills most of it.
  const max = Math.max(band[1] * 1.15, value * 1.02, 1);
  const pct = (n: number) => `${Math.min(100, (n / max) * 100)}%`;
  const fill = tone === "teal" ? "grad-teal" : "grad-coral";
  const left = Math.max(0, band[0] - value);
  return (
    <Card className="p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">{label}</span>
        <span className="text-[11px] font-semibold text-ink-soft">{band[0]}–{band[1]}{unit}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn("display text-[30px] leading-none", tone === "teal" ? "text-teal-700" : "text-coral-500")}>{Math.round(value)}</span>
        <span className="text-sm font-bold text-ink-mute">{unit}</span>
      </div>
      <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-sand">
        {/* The band itself */}
        <span className="absolute inset-y-0 rounded-full bg-white/90" style={{ left: pct(band[0]), width: `calc(${pct(band[1])} - ${pct(band[0])})` }} />
        <span className={cn("absolute inset-y-0 left-0 rounded-full", fill)} style={{ width: pct(value) }} />
      </div>
      <div className="mt-1.5 text-[11px] font-semibold text-ink-soft">
        {state === "inside" ? "In the band 👌" : state === "under" ? `${Math.round(left)}${unit} to go` : `${Math.round(value - band[1])}${unit} past the band`}
      </div>
    </Card>
  );
}

export default function Food() {
  const data = useAppData();
  // Which day is on screen. Logging yesterday's dinner this morning is normal.
  const [offset, setOffset] = useState(0);
  const ts = Date.now() + offset * 864e5;
  const key = dayKey(ts);
  const day = data.days[key] ?? { date: key, food: [] };
  const target = targetFor(data, ts);
  const totals = useMemo(() => foodTotals(day.food), [day.food]);
  const plan = planForDay(data.mealPlan, ts);
  const dayType = dayTypeFor(data.mealPlan, ts);

  const [draft, setDraft] = useState<FoodDraft | null>(null);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [undo, setUndo] = useState<{ label: string; run: () => void } | null>(null);

  const showUndo = (label: string, run: () => void) => {
    setUndo({ label, run });
    window.setTimeout(() => setUndo((u) => (u && u.label === label ? null : u)), 6000);
  };

  const openAdd = (slot: MealSlot) => { setEditing(null); setDraft(emptyDraft(slot)); };
  const openEdit = (entry: FoodEntry) => { setEditing(entry); setDraft(draftFrom(entry)); };

  const saveDraft = (d: FoodDraft) => {
    if (editing) {
      actions.updateFood(key, { ...entryFromDraft(d, editing.id), loggedAt: editing.loggedAt, planMealId: editing.planMealId });
    } else {
      actions.addFood(key, entryFromDraft(d, uid()));
    }
    setDraft(null);
    setEditing(null);
  };

  const duplicate = (entry: FoodEntry) => {
    const copy: FoodEntry = { ...entry, id: uid(), loggedAt: Date.now(), planMealId: undefined };
    actions.addFood(key, copy);
    showUndo(`${entry.name} added again`, () => actions.deleteFood(key, copy.id));
  };

  const remove = (entry: FoodEntry) => {
    actions.deleteFood(key, entry.id);
    setDraft(null);
    setEditing(null);
    showUndo(`${entry.name} removed`, () => actions.addFood(key, entry));
  };

  const saveFavourite = (d: FoodDraft) => {
    const fav: FoodFavourite = {
      id: uid(),
      name: d.name.trim(),
      quantity: d.quantity.trim(),
      calories: entryFromDraft(d, "x").calories,
      protein: entryFromDraft(d, "x").protein,
      slot: d.slot,
      uses: 0,
    };
    actions.addFoodFavourite(fav);
  };

  const tapFavourite = (f: FoodFavourite) => {
    const entry: FoodEntry = {
      id: uid(),
      slot: f.slot ?? "snack",
      name: f.name,
      quantity: f.quantity,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      loggedAt: Date.now(),
    };
    actions.addFood(key, entry);
    actions.bumpFoodFavourite(f.id);
    showUndo(`${f.name} added`, () => actions.deleteFood(key, entry.id));
  };

  const eatPlanMeal = (meal: PlanMeal) => {
    const entry = actions.logPlanMeal(key, meal);
    showUndo(`${meal.title} logged`, () => actions.deleteFood(key, entry.id));
  };

  const favourites = useMemo(
    () => [...data.foodFavourites].sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name)),
    [data.foodFavourites],
  );
  const loggedPlanIds = new Set(day.food.map((f) => f.planMealId).filter(Boolean) as string[]);
  const bySlot = SLOT_ORDER.map((slot) => ({ slot, items: day.food.filter((f) => f.slot === slot) })).filter((g) => g.items.length);
  const isFav = (name: string) => data.foodFavourites.some((f) => f.name.toLowerCase() === name.trim().toLowerCase());

  return (
    <div className="safe-bottom">
      <Header title="Food" sub={offset === 0 ? "Today" : formatDate(ts, { weekday: "long", day: "numeric", month: "long" })} right={<TimerButton />} />
      <div className="space-y-4 px-4 pt-1">
        {/* Step back through the week to fill in a day you missed. */}
        <div className="flex items-center justify-between">
          <button onClick={() => setOffset((o) => o - 1)} aria-label="Day before" className="tap grid h-11 w-14 place-items-center rounded-xl border-2 border-teal-100 bg-white text-teal-700"><IconBack size={20} /></button>
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-mute">{formatDate(ts, { weekday: "long", day: "numeric", month: "short" })}</div>
            <div className="mt-0.5 flex items-center justify-center gap-1.5">
              <Pill tone={dayType === "strength" ? "coral" : dayType === "fasting" ? "ink" : "teal"}>{DAY_TYPE_LABEL[dayType]}</Pill>
              {plan?.fastingMorning && <Pill tone="mustard">Fasting till ~12–1</Pill>}
            </div>
          </div>
          <button
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            aria-label="Day after"
            className={cn("tap grid h-11 w-14 place-items-center rounded-xl border-2 border-teal-100 bg-white text-teal-700", offset === 0 && "opacity-30")}
          >
            <IconNext size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <TargetBar label="Calories" value={totals.calories} band={target.calories} unit="" tone="teal" />
          <TargetBar label="Protein" value={totals.protein} band={target.protein} unit="g" tone="coral" />
        </div>
        <WaterCard date={key} ml={day.water ?? 0} target={data.nutrition.waterTarget} />

        {(totals.carbs > 0 || totals.fat > 0) && (
          <div className="flex justify-center gap-4 text-[11px] font-bold uppercase tracking-wide text-ink-mute">
            <span>Carbs {Math.round(totals.carbs)}g</span>
            <span>Fat {Math.round(totals.fat)}g</span>
          </div>
        )}

        {/* One tap for the meals she eats on this day of the week. */}
        {plan && plan.meals.length > 0 && (
          <div>
            <h3 className="display mb-2 text-[20px]">{offset === 0 ? "Today's plan" : "The plan for this day"}</h3>
            <div className="space-y-2">
              {plan.meals.map((m) => {
                const done = loggedPlanIds.has(m.id);
                return (
                  <Card key={m.id} className={cn("p-3", done && "bg-lime-50")}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 rounded-md bg-sand px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-soft">{SLOT_LABEL[m.slot]}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-bold leading-tight">
                          {m.title}
                          {m.optional && <span className="ml-1.5 text-[10px] font-extrabold uppercase text-ink-mute">optional</span>}
                        </div>
                        <div className="mt-0.5 text-[11px] leading-snug text-ink-soft">{m.items.join(" · ")}</div>
                        <div className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">{m.calories} cal · {m.protein}g protein</div>
                      </div>
                    </div>
                    {done ? (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-lime-100 py-2.5 text-[13px] font-extrabold text-[#3f6f18]">
                          <IconCheck size={15} /> Eaten
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => { actions.unlogPlanMeal(key, m.id); showUndo(`${m.title} taken back off`, () => eatPlanMeal(m)); }}>
                          Undo
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <Button full size="lg" variant="coral" onClick={() => eatPlanMeal(m)}>I ATE THIS</Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { setEditing(null); setDraft({ ...emptyDraft(m.slot), name: m.title, quantity: "1 serving", calories: String(m.calories), protein: String(m.protein), notes: m.items.join(", ") }); }}
                        >
                          Tweak
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* The foods she has over and over. */}
        {favourites.length > 0 && (
          <div>
            <h3 className="display mb-2 text-[20px]">Favourites</h3>
            <div className="scroll-x -mx-4 flex gap-2 px-4">
              {favourites.map((f) => (
                <button key={f.id} type="button" onClick={() => tapFavourite(f)} className="card tap w-[132px] shrink-0 p-2.5 text-left">
                  <div className="truncate text-[13px] font-bold leading-tight">{f.name}</div>
                  <div className="truncate text-[11px] text-ink-mute">{f.quantity}</div>
                  <div className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-teal-700">{f.calories} cal · {f.protein}g</div>
                </button>
              ))}
            </div>
            <p className="mt-1 text-center text-[11px] text-ink-mute">Tap one to add it straight to {offset === 0 ? "today" : "this day"}.</p>
          </div>
        )}

        {/* What has actually been eaten. */}
        <div>
          <h3 className="display mb-2 text-[20px]">Eaten</h3>
          {bySlot.length === 0 ? (
            <Empty icon="🍽️" title="Nothing logged yet" body="Tap a meal above, tap a favourite, or add something of your own." />
          ) : (
            <div className="space-y-3">
              {bySlot.map(({ slot, items }) => (
                <div key={slot}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-ink-mute">{SLOT_LABEL[slot]}</span>
                    <span className="text-[11px] font-bold text-ink-soft">
                      {Math.round(foodTotals(items).calories)} cal · {Math.round(foodTotals(items).protein)}g
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-card">
                    {items.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 border-t border-sand px-3 py-2.5 first:border-t-0">
                        <button type="button" onClick={() => openEdit(f)} className="tap min-w-0 flex-1 text-left">
                          <div className="truncate text-[13px] font-bold leading-tight">{f.name}</div>
                          <div className="truncate text-[11px] text-ink-mute">
                            {f.quantity}
                            {f.quantity && " · "}
                            {Math.round(f.calories)} cal · {Math.round(f.protein)}g protein
                          </div>
                        </button>
                        <button type="button" onClick={() => duplicate(f)} aria-label={`Add ${f.name} again`} className="tap grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sand text-ink-soft"><IconPlus size={15} /></button>
                        <button type="button" onClick={() => remove(f)} aria-label={`Remove ${f.name}`} className="tap grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sand text-ink-soft"><IconTrash size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pb-2">
          <Button size="lg" onClick={() => openAdd("lunch")}><IconPlus size={16} /> Add food</Button>
          <Button size="lg" variant="secondary" onClick={() => openAdd("snack")}><IconStar size={16} /> Add a snack</Button>
        </div>
      </div>

      {/* Anything that can be undone says so, right where the thumb already is. */}
      {undo && (
        <div className="fixed inset-x-0 z-40 flex justify-center px-4" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 86px)" }}>
          <div className="flex w-full max-w-[488px] items-center justify-between rounded-2xl bg-ink px-4 py-3 text-white shadow-[var(--shadow-pop)]">
            <span className="min-w-0 truncate text-[13px] font-bold">{undo.label}</span>
            <button type="button" onClick={() => { undo.run(); setUndo(null); }} className="tap shrink-0 text-[13px] font-extrabold text-mustard-300">Undo</button>
          </div>
        </div>
      )}

      <FoodSheet
        open={!!draft}
        draft={draft}
        onClose={() => { setDraft(null); setEditing(null); }}
        onSave={saveDraft}
        onDelete={editing ? () => remove(editing) : undefined}
        onSaveFavourite={saveFavourite}
        isFavourite={!!draft && isFav(draft.name)}
      />
    </div>
  );
}
