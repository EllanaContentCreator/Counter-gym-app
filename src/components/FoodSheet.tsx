import { useEffect, useState } from "react";
import type { FoodEntry, MealSlot } from "@/lib/types";
import { SLOT_LABEL, SLOT_ORDER } from "@/data/nutrition";
import { cn } from "@/lib/utils";
import { Button, Field, Sheet, inputCls } from "./ui";

/** Numbers come off a phone keypad, so a blank field means zero rather than NaN. */
function num(v: string) {
  const n = parseFloat(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export interface FoodDraft {
  id?: string;
  slot: MealSlot;
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
}

export function draftFrom(entry: FoodEntry): FoodDraft {
  return {
    id: entry.id,
    slot: entry.slot,
    name: entry.name,
    quantity: entry.quantity,
    calories: String(entry.calories ?? ""),
    protein: String(entry.protein ?? ""),
    carbs: entry.carbs == null ? "" : String(entry.carbs),
    fat: entry.fat == null ? "" : String(entry.fat),
    notes: entry.notes ?? "",
  };
}

export function emptyDraft(slot: MealSlot): FoodDraft {
  return { slot, name: "", quantity: "", calories: "", protein: "", carbs: "", fat: "", notes: "" };
}

/**
 * Add or edit one food.
 *
 * Calories and protein are the only two numbers on show. Carbohydrate, fat and
 * a note sit behind "Add more detail", because every extra box on the screen is
 * another reason not to bother logging at all.
 */
export function FoodSheet({
  open,
  draft,
  onClose,
  onSave,
  onDelete,
  onSaveFavourite,
  isFavourite,
}: {
  open: boolean;
  draft: FoodDraft | null;
  onClose: () => void;
  onSave: (d: FoodDraft) => void;
  onDelete?: () => void;
  onSaveFavourite?: (d: FoodDraft) => void;
  isFavourite?: boolean;
}) {
  const [d, setD] = useState<FoodDraft>(draft ?? emptyDraft("lunch"));
  const [more, setMore] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (draft) setD(draft);
    if (open) {
      setSaved(false);
      setMore(!!draft && (!!draft.carbs || !!draft.fat || !!draft.notes));
    }
  }, [draft, open]);

  const set = (p: Partial<FoodDraft>) => setD((cur) => ({ ...cur, ...p }));
  const canSave = d.name.trim().length > 0;

  return (
    <Sheet open={open} onClose={onClose} title={d.id ? "Edit food" : "Add food"} tall>
      <div className="space-y-4">
        <Field label="Which meal?">
          <div className="flex flex-wrap gap-1.5">
            {SLOT_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ slot: s })}
                className={cn(
                  "tap rounded-xl px-3 py-1.5 text-sm font-bold",
                  d.slot === s ? "grad-teal text-white shadow-[var(--shadow-pop)]" : "bg-white text-ink-soft shadow-card",
                )}
              >
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="What was it?">
          <input className={inputCls} value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Chicken salad bowl" />
        </Field>

        <Field label="How much?" hint="However you think of it — 150 g, 2 eggs, 1 bowl">
          <input className={inputCls} value={d.quantity} onChange={(e) => set({ quantity: e.target.value })} placeholder="e.g. 150 g" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Calories">
            <input className={inputCls} inputMode="numeric" value={d.calories} onChange={(e) => set({ calories: e.target.value })} placeholder="e.g. 560" />
          </Field>
          <Field label="Protein (g)">
            <input className={inputCls} inputMode="numeric" value={d.protein} onChange={(e) => set({ protein: e.target.value })} placeholder="e.g. 50" />
          </Field>
        </div>

        {more ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Carbs (g)">
                <input className={inputCls} inputMode="numeric" value={d.carbs} onChange={(e) => set({ carbs: e.target.value })} placeholder="optional" />
              </Field>
              <Field label="Fat (g)">
                <input className={inputCls} inputMode="numeric" value={d.fat} onChange={(e) => set({ fat: e.target.value })} placeholder="optional" />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className={inputCls} rows={2} value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="optional" />
            </Field>
          </div>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="tap text-[13px] font-extrabold text-teal-700">
            + Add more detail (carbs, fat, a note)
          </button>
        )}

        <Button full size="lg" disabled={!canSave} onClick={() => onSave(d)}>
          {d.id ? "Save changes" : "Add to today"}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {onSaveFavourite && (
            <Button
              variant="secondary"
              disabled={!canSave || saved || isFavourite}
              onClick={() => { onSaveFavourite(d); setSaved(true); }}
            >
              {isFavourite ? "★ Already a favourite" : saved ? "★ Saved" : "☆ Save as favourite"}
            </Button>
          )}
          {onDelete && <Button variant="danger" onClick={onDelete}>Delete</Button>}
        </div>
      </div>
    </Sheet>
  );
}

/** Turn what she typed into a stored entry. */
export function entryFromDraft(d: FoodDraft, id: string): FoodEntry {
  return {
    id,
    slot: d.slot,
    name: d.name.trim(),
    quantity: d.quantity.trim(),
    calories: num(d.calories),
    protein: num(d.protein),
    carbs: d.carbs.trim() ? num(d.carbs) : undefined,
    fat: d.fat.trim() ? num(d.fat) : undefined,
    notes: d.notes.trim() || undefined,
    loggedAt: Date.now(),
  };
}

export { num as parseFoodNumber };
