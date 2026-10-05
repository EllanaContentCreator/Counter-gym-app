import { useEffect, useMemo, useState } from "react";
import type { DayRecord, FoodEntry } from "@/lib/types";
import { copyableDays, mealsOf } from "@/lib/foodcopy";
import { dayKey, formatDate } from "@/lib/utils";
import { SLOT_LABEL } from "@/data/nutrition";
import { Button, Sheet } from "@/components/ui";

/**
 * "Same as Tuesday": pick a day you've already logged, then copy all of it or just one meal
 * onto the day on screen. What's copied is fresh entries, so editing them leaves the original alone.
 */
export function CopyFoodSheet({
  open,
  onClose,
  days,
  exceptKey,
  targetLabel,
  onCopy,
}: {
  open: boolean;
  onClose: () => void;
  days: Record<string, DayRecord>;
  exceptKey: string;
  /** Where the copies are going, in words: "today", "Monday 5 Oct". */
  targetLabel: string;
  onCopy: (entries: FoodEntry[], what: string) => void;
}) {
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!open) setPickedKey(null);
  }, [open]);

  const options = useMemo(() => copyableDays(days, exceptKey), [days, exceptKey]);
  const picked = options.find((d) => d.key === pickedKey) ?? null;
  const yesterday = dayKey(Date.now() - 864e5);
  const label = (ts: number, key: string) => (key === yesterday ? "Yesterday" : formatDate(ts, { weekday: "long", day: "numeric", month: "short" }));

  const copy = (entries: FoodEntry[], what: string) => {
    onCopy(entries, what);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={picked ? label(picked.ts, picked.key) : "Copy from another day"}>
      {!picked ? (
        options.length === 0 ? (
          <p className="text-sm text-ink-soft">There's no other day with food on it to copy from yet.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-ink-soft">Pick a day. You'll choose what to copy onto {targetLabel} next.</p>
            {options.map((d) => (
              <button key={d.key} onClick={() => setPickedKey(d.key)} className="card tap flex w-full items-center gap-3 p-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{label(d.ts, d.key)}</div>
                  <div className="truncate text-[11px] text-ink-mute">{d.entries.length} food{d.entries.length === 1 ? "" : "s"} · {d.calories} cal · {d.protein}g protein</div>
                </div>
                <span className="text-ink-mute">→</span>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <button onClick={() => setPickedKey(null)} className="tap text-[13px] font-extrabold text-teal-700">← Pick a different day</button>
          <Button full variant="coral" onClick={() => copy(picked.entries, `${label(picked.ts, picked.key)}'s food`)}>
            Copy the whole day · {picked.entries.length} food{picked.entries.length === 1 ? "" : "s"}
          </Button>
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-ink-mute">or just one meal</p>
          {mealsOf(picked.entries).map((m) => (
            <div key={m.slot} className="card p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-extrabold">{SLOT_LABEL[m.slot]}</span>
                <span className="text-[11px] font-semibold text-ink-soft">{m.calories} cal</span>
              </div>
              <ul className="mt-1 space-y-0.5 text-[13px] text-ink-soft">
                {m.entries.map((f) => (
                  <li key={f.id} className="truncate">{f.name}{f.quantity ? ` · ${f.quantity}` : ""}</li>
                ))}
              </ul>
              <Button full size="sm" variant="secondary" className="mt-2" onClick={() => copy(m.entries, `${SLOT_LABEL[m.slot]} from ${label(picked.ts, picked.key)}`)}>
                Copy {SLOT_LABEL[m.slot].toLowerCase()}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
