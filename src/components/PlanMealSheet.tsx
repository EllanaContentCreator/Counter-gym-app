import { useEffect, useState } from "react";
import type { MealSlot, PlanMeal } from "@/lib/types";
import { SLOT_LABEL, SLOT_ORDER } from "@/data/nutrition";
import { itemsText, parseItems } from "@/lib/mealplan";
import { cn } from "@/lib/utils";
import { Button, Field, Sheet, inputCls } from "./ui";

/** Numbers come off a phone keypad, so a blank field means zero rather than NaN. */
function num(v: string) {
  const n = parseFloat(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

interface Draft {
  slot: MealSlot;
  title: string;
  items: string;
  calories: string;
  protein: string;
  optional: boolean;
}

const blank = (slot: MealSlot): Draft => ({ slot, title: "", items: "", calories: "", protein: "", optional: false });
const fromMeal = (m: PlanMeal): Draft => ({
  slot: m.slot,
  title: m.title,
  items: itemsText(m.items),
  calories: String(m.calories || ""),
  protein: String(m.protein || ""),
  optional: !!m.optional,
});

/** Add a meal to a day of the plan, or change one. Keeping the same id means "already eaten" ticks survive an edit. */
export function PlanMealSheet({
  open,
  onClose,
  meal,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  /** The meal being changed, or null to add a new one. */
  meal: PlanMeal | null;
  onSave: (draft: Omit<PlanMeal, "id">) => void;
  onDelete?: () => void;
}) {
  const [d, setD] = useState<Draft>(blank("lunch"));
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (open) {
      setD(meal ? fromMeal(meal) : blank("lunch"));
      setConfirmDelete(false);
    }
  }, [open, meal]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const canSave = d.title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const out: Omit<PlanMeal, "id"> = {
      slot: d.slot,
      title: d.title.trim(),
      items: parseItems(d.items),
      calories: num(d.calories),
      protein: num(d.protein),
    };
    if (d.optional) out.optional = true;
    onSave(out);
  };

  return (
    <Sheet open={open} onClose={onClose} title={meal ? "Change this meal" : "Add a meal"} tall>
      <div className="space-y-4">
        <Field label="Which meal">
          <div className="flex flex-wrap gap-2">
            {SLOT_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("slot", s)}
                className={cn("tap rounded-full px-3.5 py-2 text-sm font-bold", d.slot === s ? "grad-teal text-white shadow-[var(--shadow-pop)]" : "bg-sand text-ink-soft")}
              >
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Name">
          <input className={inputCls} value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Chicken salad bowl" />
        </Field>
        <Field label="What's in it" hint="One thing per line.">
          <textarea className={inputCls + " min-h-[96px]"} value={d.items} onChange={(e) => set("items", e.target.value)} placeholder={"150 g chicken\nMixed salad\nAvocado"} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories">
            <input className={inputCls} inputMode="numeric" value={d.calories} onChange={(e) => set("calories", e.target.value)} placeholder="560" />
          </Field>
          <Field label="Protein (g)">
            <input className={inputCls} inputMode="numeric" value={d.protein} onChange={(e) => set("protein", e.target.value)} placeholder="45" />
          </Field>
        </div>
        <label className="flex items-center justify-between rounded-xl bg-sand px-3 py-3">
          <span>
            <span className="block font-bold">Optional</span>
            <span className="block text-xs text-ink-soft">Eaten some days and not others. It isn't counted in the day's total.</span>
          </span>
          <input type="checkbox" checked={d.optional} onChange={(e) => set("optional", e.target.checked)} className="h-6 w-6 shrink-0 accent-teal-700" />
        </label>

        <Button full size="lg" onClick={save} disabled={!canSave}>Save meal</Button>

        {onDelete &&
          (confirmDelete ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Keep it</Button>
              <Button variant="danger" onClick={onDelete}>Yes, delete it</Button>
            </div>
          ) : (
            <Button full variant="danger" onClick={() => setConfirmDelete(true)}>Delete this meal</Button>
          ))}
      </div>
    </Sheet>
  );
}
