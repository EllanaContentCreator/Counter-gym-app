import { useState } from "react";
import { actions } from "@/lib/store";
import { WATER_STEPS } from "@/data/nutrition";
import { cn } from "@/lib/utils";
import { Button, Card, Field, Sheet, inputCls } from "./ui";

/** How many glasses the bar draws, so a number turns into something you can see. */
const GLASS = 250;

function Glasses({ ml, target }: { ml: number; target: number }) {
  const count = Math.max(6, Math.ceil(target / GLASS));
  const full = Math.floor(ml / GLASS);
  const part = (ml % GLASS) / GLASS;
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="relative h-7 w-5 overflow-hidden rounded-b-md rounded-t-sm border-2 border-sky-100 bg-white">
          <span
            className="absolute inset-x-0 bottom-0 grad-sky"
            style={{ height: i < full ? "100%" : i === full ? `${Math.round(part * 100)}%` : "0%" }}
          />
        </span>
      ))}
    </div>
  );
}

/**
 * Water for one day.
 *
 * Two taps cover nearly every drink, and anything unusual goes in by hand. The
 * glasses are there so a number like 1,750 ml reads as an amount rather than as
 * arithmetic.
 */
export function WaterCard({ date, ml, target }: { date: string; ml: number; target: number }) {
  const [custom, setCustom] = useState(false);
  const [amount, setAmount] = useState("");
  const pct = Math.min(100, target > 0 ? (ml / target) * 100 : 0);
  const done = ml >= target;

  const addCustom = () => {
    const n = parseFloat(amount.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n) && n !== 0) actions.addWater(date, n);
    setAmount("");
    setCustom(false);
  };

  return (
    <Card className="p-3.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">Water</span>
        <span className="text-[11px] font-semibold text-ink-soft">{(target / 1000).toFixed(1)} L target</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="display text-[30px] leading-none text-sky-600">{(ml / 1000).toFixed(2)}</span>
        <span className="text-sm font-bold text-ink-mute">L</span>
        {done && <span className="ml-auto text-[11px] font-extrabold uppercase tracking-wide text-sky-600">Target met 💧</span>}
      </div>

      <div className="mt-2.5"><Glasses ml={ml} target={target} /></div>

      <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-sand">
        <span className="absolute inset-y-0 left-0 rounded-full grad-sky" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {WATER_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => actions.addWater(date, step)}
            className="tap flex-1 rounded-2xl bg-sky-100 py-2.5 text-[13px] font-extrabold text-sky-600 shadow-card active:brightness-95"
          >
            +{step} ml
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(true)}
          className="tap rounded-2xl bg-white px-3 py-2.5 text-[13px] font-extrabold text-ink-soft shadow-card"
        >
          Custom
        </button>
      </div>

      {ml > 0 && (
        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-ink-mute">
          <button type="button" onClick={() => actions.addWater(date, -GLASS)} className="tap font-extrabold text-ink-soft">
            − One glass (mis-tap)
          </button>
          <button type="button" onClick={() => actions.setWater(date, 0)} className="tap font-extrabold text-ink-soft">
            Start again
          </button>
        </div>
      )}

      <Sheet open={custom} onClose={() => setCustom(false)} title="How much water?">
        <div className="space-y-3">
          <Field label="Millilitres" hint="A mug is about 250, a big bottle about 750">
            <input
              className={cn(inputCls)}
              inputMode="numeric"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 750"
              onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {[100, 330, 750, 1000].map((n) => (
              <button key={n} type="button" onClick={() => setAmount(String(n))} className="tap rounded-xl bg-sky-100 px-3 py-1.5 text-sm font-bold text-sky-600">
                {n} ml
              </button>
            ))}
          </div>
          <Button full size="lg" onClick={addCustom}>Add it</Button>
        </div>
      </Sheet>
    </Card>
  );
}
