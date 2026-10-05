import { useMemo, useState } from "react";
import { BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { useAppData } from "@/lib/store";
import { summarise, type Range } from "@/lib/dashboard";
import { cn, formatDate } from "@/lib/utils";
import { Card, Empty, Stat } from "@/components/ui";

const RANGES: { value: Range; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: "all", label: "All time" },
];

const tip = { borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 };

/** "5 of 7 days" with a bar. Landing inside is the good news; everything else is just not-yet. */
function Landed({ label, hit, of }: { label: string; hit: number; of: number }) {
  const pct = of ? Math.round((hit / of) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-bold">{label}</span>
        <span className="text-ink-soft">{of ? `${hit} of ${of} day${of === 1 ? "" : "s"}` : "nothing logged yet"}</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sand">
        <span className="block h-full rounded-full grad-teal" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** The whole picture in one place: workouts, weight, food and water over 7 days, 30 days or ever. */
export function Summary() {
  const data = useAppData();
  const [range, setRange] = useState<Range>(7);
  const s = useMemo(() => summarise(data, range), [data, range]);
  const unit = data.profile.unit;
  const span = range === "all" ? "since you started" : `in the last ${range} days`;
  const waterL = (ml: number) => `${(ml / 1000).toFixed(1)}L`;
  const weightData = s.weighIns.map((w) => ({ label: formatDate(w.ts, { day: "numeric", month: "short" }), kg: w.kg }));
  const anything = s.daysTracked > 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={String(r.value)}
            onClick={() => setRange(r.value)}
            className={cn("tap h-10 flex-1 rounded-xl text-sm font-extrabold", range === r.value ? "bg-teal-700 text-white" : "bg-sand text-ink-soft")}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!anything ? (
        <Empty icon="📊" title="Nothing here yet" body={`Log a workout, a meal, some water or a weigh-in and your summary ${span} fills in.`} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat value={s.workouts} label="Workouts" tone="mustard" />
            <Stat value={s.daysTracked} label={`of ${s.totalDays} days`} />
            <Stat
              value={s.weightChange === null ? "—" : `${s.weightChange > 0 ? "+" : ""}${s.weightChange.toFixed(1)}`}
              label={`Weight (${unit})`}
              tone="coral"
            />
          </div>
          <p className="-mt-1 text-center text-[11px] text-ink-mute">
            {s.workouts} workout{s.workouts === 1 ? "" : "s"} {span}
            {s.workouts > 0 ? `, about ${s.perWeek} a week` : ""}. Days tracked counts any day with food, water, a weigh-in or a workout.
          </p>

          <Card className="space-y-3">
            <h3 className="display text-[20px]">Landing inside your bands</h3>
            <Landed label="Calories" hit={s.calorieDaysInside} of={s.foodDays} />
            <Landed label="Protein" hit={s.proteinDaysInside} of={s.foodDays} />
            <Landed label="Water target" hit={s.waterDaysHit} of={s.waterDays} />
            <p className="text-[11px] text-ink-mute">Today counts once it's over, so a half-eaten day never drags your average down.</p>
          </Card>

          <div className="grid grid-cols-3 gap-2">
            <Stat value={s.avgCalories ?? "—"} label="Avg calories" tone="plum" />
            <Stat value={s.avgProtein === null ? "—" : `${s.avgProtein}g`} label="Avg protein" tone="plum" />
            <Stat value={s.avgWater === null ? "—" : waterL(s.avgWater)} label="Avg water" tone="plum" />
          </div>

          {s.chart.some((p) => p.calories !== null) && (
            <Card>
              <h3 className="display text-[20px]">{s.chartIsWeekly ? "Calories, week by week" : "Calories each day"}</h3>
              <div className="mt-2 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.chart} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#efeafb" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8683a6" }} axisLine={false} tickLine={false} interval={s.chart.length > 14 ? "preserveStartEnd" : 0} />
                    <YAxis tick={{ fontSize: 10, fill: "#8683a6" }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "#f5f3ff" }} contentStyle={tip} formatter={(v: number) => [`${v} cal`, s.chartIsWeekly ? "Average" : "Eaten"]} />
                    <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                      {s.chart.map((p, i) => (
                        <Cell key={i} fill={p.state === "inside" ? "#7c3aed" : "#c4b5fd"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1 text-center text-[11px] text-ink-mute">Dark bars landed inside that day's band.</p>
            </Card>
          )}

          {weightData.length >= 2 && (
            <Card>
              <h3 className="display text-[20px]">Weight {span}</h3>
              <div className="mt-2 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#efeafb" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8683a6" }} axisLine={false} tickLine={false} />
                    <YAxis domain={["dataMin - 1", "dataMax + 1"]} tickFormatter={(v: number) => String(Math.round(v))} tick={{ fontSize: 10, fill: "#8683a6" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={tip} formatter={(v: number) => [`${v} ${unit}`, "Weight"]} />
                    <Line type="monotone" dataKey="kg" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3, fill: "#7c3aed" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
