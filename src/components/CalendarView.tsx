import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useAppData } from "@/lib/store";
import { dayDetail, monthGrid, type Marks } from "@/lib/calendar";
import { cn, formatDate, formatDuration } from "@/lib/utils";
import { DAY_TYPE_LABEL, SLOT_LABEL } from "@/data/nutrition";
import { Button, Card, Sheet } from "@/components/ui";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** One dot per kind of thing logged, so a glance at the month shows how it went. */
const DOTS: { key: keyof Marks; colour: string; label: string }[] = [
  { key: "workout", colour: "#ec4899", label: "Workout" },
  { key: "food", colour: "#7c3aed", label: "Food" },
  { key: "water", colour: "#38bdf8", label: "Water" },
  { key: "weight", colour: "#f59e0b", label: "Weigh-in" },
];

const todayParts = () => {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() };
};

/** A month at a glance. Tap any day to see everything from it. */
export function CalendarView() {
  const data = useAppData();
  const [{ y, m }, setMonth] = useState(todayParts);
  const [picked, setPicked] = useState<string | null>(null);
  const rows = useMemo(() => monthGrid(data, y, m), [data, y, m]);
  const detail = useMemo(() => (picked ? dayDetail(data, picked) : null), [data, picked]);
  const unit = data.profile.unit;
  const now = todayParts();
  const isThisMonth = now.y === y && now.m === m;

  const step = (by: number) => {
    const d = new Date(y, m + by, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };
  const title = new Date(y, m, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  const waterL = (ml: number) => `${(ml / 1000).toFixed(1)}L`;

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <button onClick={() => step(-1)} aria-label="Previous month" className="tap grid h-10 w-10 place-items-center rounded-full bg-sand text-lg text-ink-soft">‹</button>
          <div className="text-center">
            <h3 className="display text-[22px] leading-none">{title}</h3>
            {!isThisMonth && (
              <button onClick={() => setMonth(todayParts())} className="tap mt-1 text-[12px] font-extrabold text-teal-700">Back to this month</button>
            )}
          </div>
          <button onClick={() => step(1)} aria-label="Next month" className="tap grid h-10 w-10 place-items-center rounded-full bg-sand text-lg text-ink-soft">›</button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold uppercase text-ink-mute">
          {WEEKDAYS.map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {rows.flat().map((c) => (
            <button
              key={c.key}
              disabled={!c.inMonth || c.isFuture}
              onClick={() => setPicked(c.key)}
              aria-label={formatDate(new Date(c.key + "T12:00:00").getTime(), { weekday: "long", day: "numeric", month: "long" })}
              className={cn(
                "flex h-12 flex-col items-center justify-center rounded-xl text-sm font-bold transition",
                !c.inMonth && "invisible",
                c.inMonth && !c.isFuture && "tap bg-white shadow-card",
                c.isFuture && "text-ink-mute/50",
                c.isToday && "ring-2 ring-teal-700",
                picked === c.key && "bg-sand",
              )}
            >
              <span className={cn(c.isToday && "text-teal-700")}>{c.day}</span>
              <span className="mt-0.5 flex h-1.5 gap-[3px]">
                {DOTS.filter((d) => c.marks[d.key]).map((d) => (
                  <i key={d.key} className="block h-1.5 w-1.5 rounded-full" style={{ background: d.colour }} />
                ))}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-ink-soft">
          {DOTS.map((d) => (
            <span key={d.key} className="flex items-center gap-1.5">
              <i className="block h-2 w-2 rounded-full" style={{ background: d.colour }} />
              {d.label}
            </span>
          ))}
        </div>
      </Card>

      <Sheet open={!!detail} onClose={() => setPicked(null)} title={detail ? formatDate(detail.ts, { weekday: "long", day: "numeric", month: "long" }) : ""}>
        {detail && (
          <div className="space-y-4">
            {detail.empty && <p className="text-sm text-ink-soft">Nothing was logged on this day.</p>}

            {detail.sessions.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-ink-mute">Workout{detail.sessions.length > 1 ? "s" : ""}</h4>
                {detail.sessions.map((s) => (
                  <Link key={s.id} href={`/progress/${s.id}`} className="card tap flex items-center gap-3 p-3">
                    <span className="text-xl">💪</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{s.programName}</div>
                      <div className="text-[11px] text-ink-mute">{formatDuration(s.durationSec)} · {s.entries.length} sets</div>
                    </div>
                    <span className="text-ink-mute">→</span>
                  </Link>
                ))}
              </section>
            )}

            {detail.meals.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-ink-mute">Food</h4>
                  <span className="text-[11px] font-semibold text-ink-soft">{DAY_TYPE_LABEL[detail.dayType]} day</span>
                </div>
                <div className="card p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="display text-[24px] text-teal-700">{detail.totals.calories} <span className="text-sm">cal</span></span>
                    <span className="display text-[24px] text-teal-700">{detail.totals.protein}<span className="text-sm">g protein</span></span>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] font-semibold text-ink-soft">
                    <span>{detail.calorieState === "inside" ? "In the band 👌" : `Band ${detail.band.calories[0]}–${detail.band.calories[1]}`}</span>
                    <span>{detail.proteinState === "inside" ? "In the band 👌" : `Band ${detail.band.protein[0]}–${detail.band.protein[1]}g`}</span>
                  </div>
                </div>
                {detail.meals.map((g) => (
                  <div key={g.slot} className="card p-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-extrabold">{SLOT_LABEL[g.slot]}</span>
                      <span className="text-[11px] font-semibold text-ink-soft">{g.calories} cal</span>
                    </div>
                    <ul className="mt-1 space-y-0.5 text-[13px] text-ink-soft">
                      {g.entries.map((f) => (
                        <li key={f.id} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate">{f.name}{f.quantity ? ` · ${f.quantity}` : ""}</span>
                          <span className="shrink-0">{Math.round(f.calories)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {(detail.water > 0 || detail.weight !== null) && (
              <section className="grid grid-cols-2 gap-2">
                {detail.water > 0 && (
                  <div className="card p-3 text-center">
                    <div className="display text-[24px] text-sky-600">{waterL(detail.water)}</div>
                    <div className="text-[10px] font-bold uppercase text-ink-mute">Water · aim {waterL(data.nutrition.waterTarget)}</div>
                  </div>
                )}
                {detail.weight !== null && (
                  <div className="card p-3 text-center">
                    <div className="display text-[24px] text-[#b58200]">{detail.weight.toFixed(1)}</div>
                    <div className="text-[10px] font-bold uppercase text-ink-mute">Weigh-in ({unit})</div>
                  </div>
                )}
              </section>
            )}

            <div className="space-y-2 pt-1">
              <Link href={`/food/${detail.key}`}>
                <Button full variant="secondary">{detail.meals.length || detail.water ? "Edit food and water for this day" : "Add food or water for this day"}</Button>
              </Link>
              <Link href="/log-past">
                <Button full variant="secondary">Log a workout you've already done</Button>
              </Link>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
