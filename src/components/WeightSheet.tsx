import { useEffect, useState } from "react";
import { actions } from "@/lib/store";
import { cn, fromDateInput, isFutureDay, sheetDayLabel, toDateInput, weighIns } from "@/lib/utils";
import type { DayRecord } from "@/lib/types";
import { Button, Field, Sheet, inputCls } from "./ui";

/**
 * Write down a weigh-in.
 *
 * There is no daily streak and nothing goes red for a missed day — she steps on
 * the scales when she feels like it, and the graph just joins up whatever is
 * there.
 */
export function WeightSheet({
  open,
  onClose,
  days,
  unit,
  initialDate,
}: {
  open: boolean;
  onClose: () => void;
  days: Record<string, DayRecord>;
  unit: string;
  initialDate?: string;
}) {
  const [date, setDate] = useState(() => initialDate ?? toDateInput(Date.now()));
  const [kg, setKg] = useState("");

  useEffect(() => {
    if (!open) return;
    const d = initialDate ?? toDateInput(Date.now());
    setDate(d);
    // Editing a day that already has a weigh-in starts from that number; a new
    // one starts from the last weight she recorded, so it is a small nudge.
    const existing = days[d]?.weight;
    const list = weighIns(days);
    setKg(String(existing ?? list[list.length - 1]?.kg ?? ""));
  }, [open, initialDate]); // eslint-disable-line

  const ts = fromDateInput(date);
  const inFuture = ts != null && isFutureDay(ts);
  const value = parseFloat(kg.replace(/[^\d.]/g, ""));
  const valid = Number.isFinite(value) && value > 0 && value < 500;
  const existing = days[date]?.weight;

  const nudge = (by: number) => {
    const base = Number.isFinite(value) ? value : 0;
    setKg((Math.round((base + by) * 10) / 10).toFixed(1));
  };

  return (
    <Sheet open={open} onClose={onClose} title="Weigh-in">
      <div className="space-y-3">
        <Field label="Weight" hint={`In ${unit}. One decimal is plenty.`}>
          <input
            className={inputCls}
            inputMode="decimal"
            autoFocus
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder="e.g. 80.4"
            onKeyDown={(e) => { if (e.key === "Enter" && valid && !inFuture) { actions.setWeight(date, value); onClose(); } }}
          />
        </Field>
        <div className="flex gap-1.5">
          {[-0.5, -0.1, 0.1, 0.5].map((n) => (
            <button key={n} type="button" onClick={() => nudge(n)} className="tap flex-1 rounded-xl bg-sand py-2 text-sm font-extrabold text-ink-soft">
              {n > 0 ? `+${n}` : n}
            </button>
          ))}
        </div>

        <Field label="When?">
          <input type="date" className={inputCls} value={date} max={toDateInput(Date.now())} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="scroll-x -mx-5 flex gap-2 px-5">
          {Array.from({ length: 8 }).map((_, i) => {
            const day = Date.now() - i * 864e5;
            const v = toDateInput(day);
            return (
              <button
                key={v}
                type="button"
                onClick={() => setDate(v)}
                className={cn(
                  "tap shrink-0 rounded-full px-3 py-1.5 text-xs font-bold",
                  date === v ? "grad-teal text-white shadow-[var(--shadow-pop)]" : "bg-white text-ink-soft shadow-card",
                )}
              >
                {i === 0 ? "Today" : i === 1 ? "Yesterday" : sheetDayLabel(day)}
              </button>
            );
          })}
        </div>
        {inFuture && <p className="text-[11px] font-semibold text-coral-600">That day hasn't happened yet.</p>}

        <Button full size="lg" disabled={!valid || inFuture} onClick={() => { actions.setWeight(date, value); onClose(); }}>
          {existing != null ? "Save this weigh-in" : "Add this weigh-in"}
        </Button>
        {existing != null && (
          <Button full variant="ghost" onClick={() => { actions.clearWeight(date); onClose(); }}>
            Remove the weigh-in for this day
          </Button>
        )}
      </div>
    </Sheet>
  );
}
