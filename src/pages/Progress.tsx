import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { useAppData } from "@/lib/store";
import { formatDate, formatDuration, sessionsThisWeek, weekStreak, weekStart, sessionVolume, bestWeightFor, allExercises, cn, weightProgress } from "@/lib/utils";
import { Header, TimerButton } from "@/components/Header";
import { Button, Card, Empty, SectionTitle, Stat } from "@/components/ui";
import { WeightSheet } from "@/components/WeightSheet";

const FACE = { 1: "😮‍💨", 2: "😐", 3: "🙂", 4: "😄", 5: "🔥" } as const;

export default function Progress() {
  const data = useAppData();
  const done = useMemo(() => [...data.sessions].filter((s) => s.finishedAt).sort((a, b) => b.startedAt - a.startedAt), [data.sessions]);
  // Today links straight to /progress/weight, so open on that tab.
  const [loc] = useLocation();
  const [tab, setTab] = useState<"history" | "weight" | "pbs">(loc.endsWith("/weight") ? "weight" : "history");
  const [weighing, setWeighing] = useState(false);
  const [weighDate, setWeighDate] = useState<string | undefined>(undefined);
  const unit = data.profile.unit;
  const wp = useMemo(
    () => weightProgress(data.days, data.nutrition.startWeight, data.nutrition.goalWeight),
    [data.days, data.nutrition.startWeight, data.nutrition.goalWeight],
  );
  const weightChart = useMemo(
    () => wp.list.map((w) => ({ label: formatDate(w.ts, { day: "2-digit", month: "short" }), kg: w.kg, date: w.date })),
    [wp.list],
  );
  /**
   * The scale hugs the weigh-ins so a half-kilo actually shows. The goal line is
   * only drawn once it comes into that range — pinned to the edge from 7 kg away
   * it says nothing, and stretching the scale to reach it would flatten the
   * trend into a straight line.
   */
  const weightAxis = useMemo(() => {
    if (!weightChart.length) return { domain: [0, 1] as [number, number], goalInView: false };
    const kgs = weightChart.map((w) => w.kg);
    const domain: [number, number] = [Math.floor(Math.min(...kgs) - 1), Math.ceil(Math.max(...kgs) + 1)];
    const goal = data.nutrition.goalWeight;
    return { domain, goalInView: goal >= domain[0] && goal <= domain[1] };
  }, [weightChart, data.nutrition.goalWeight]);
  const weekly = useMemo(() => {
    const out: { label: string; count: number; key: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const ws = weekStart() - i * 7 * 864e5;
      out.push({ key: ws, label: formatDate(ws, { day: "2-digit", month: "short" }), count: done.filter((s) => weekStart(s.startedAt) === ws).length });
    }
    return out;
  }, [done]);
  const totalVolume = done.reduce((a, s) => a + sessionVolume(s), 0);
  const pbs = useMemo(() => {
    const list = allExercises(data.customExercises);
    return list.map((e) => ({ e, best: bestWeightFor(done, e.id) })).filter((x) => x.best?.weight != null && x.best.weight > 0).sort((a, b) => (b.best!.weight ?? 0) - (a.best!.weight ?? 0));
  }, [done, data.customExercises]);

  return (
    <div className="safe-bottom">
      <Header title="Progress" sub="Your numbers, your proof" right={<TimerButton />} />
      <div className="space-y-4 px-4 pt-1">
        <div className="grid grid-cols-3 gap-2">
          <Stat value={`${sessionsThisWeek(done).length}/${data.profile.weeklyGoal}`} label="This week" />
          <Stat value={weekStreak(done)} label="Week streak" tone="coral" />
          <Stat value={done.length} label="Workouts" tone="mustard" />
        </div>
        <Card>
          <div className="flex items-baseline justify-between">
            <h3 className="display text-[20px]">Workouts per week</h3>
            <span className="text-xs text-ink-soft">{Math.round(totalVolume).toLocaleString()} {data.profile.unit} lifted all-time</span>
          </div>
          <div className="mt-2 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
                <CartesianGrid stroke="#efeafb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8683a6" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8683a6" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f5f3ff" }} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }} />
                <defs>
                  <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#a855f7" />
                    <stop offset="1" stopColor="#4c1d95" />
                  </linearGradient>
                </defs>
                <Bar dataKey="count" name="Workouts" fill="url(#bar-grad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="scroll-x -mx-4 flex gap-2 px-4">
          {(["history", "weight", "pbs"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("tap shrink-0 rounded-full px-4 py-2 text-sm font-bold", tab === t ? "grad-teal text-white shadow-[var(--shadow-pop)]" : "bg-white text-ink-soft shadow-card")}>
              {t === "history" ? "History" : t === "weight" ? "Weight" : "Personal bests"}
            </button>
          ))}
        </div>

        {tab === "weight" && (
          <div className="space-y-3">
            {/* Where she is, in one line, without any tutting about missed days. */}
            <Card>
              <div className="flex items-baseline justify-between">
                <h3 className="display text-[20px]">{wp.latest ? "Where you're at" : "Ready when you are"}</h3>
                <span className="text-xs text-ink-soft">{wp.latest ? `Last weighed ${formatDate(wp.latest.ts)}` : "No weigh-ins yet"}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="display text-[26px] leading-none text-teal-700">{wp.current.toFixed(1)}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase text-ink-mute">Now ({unit})</div>
                </div>
                <div className="text-center">
                  <div className={cn("display text-[26px] leading-none", wp.lost > 0 ? "text-coral-500" : "text-ink-mute")}>{wp.lost > 0 ? wp.lost.toFixed(1) : "—"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase text-ink-mute">Lost ({unit})</div>
                </div>
                <div className="text-center">
                  <div className="display text-[26px] leading-none">{Math.max(0, wp.toGo).toFixed(1)}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase text-ink-mute">To go ({unit})</div>
                </div>
              </div>
              <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-sand">
                <span className="absolute inset-y-0 left-0 rounded-full grad-teal" style={{ width: `${wp.fraction * 100}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-ink-mute">
                <span>{data.nutrition.startWeight}{unit} start</span>
                <span>{data.nutrition.goalWeight}{unit} goal</span>
              </div>
              <Button full className="mt-3" onClick={() => { setWeighDate(undefined); setWeighing(true); }}>＋ Add a weigh-in</Button>
            </Card>

            {weightChart.length >= 2 ? (
              <Card>
                <h3 className="display text-[20px]">Weight trend</h3>
                <div className="mt-2 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightChart} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#efeafb" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8683a6" }} axisLine={false} tickLine={false} />
                      <YAxis domain={weightAxis.domain} allowDecimals tick={{ fontSize: 10, fill: "#8683a6" }} axisLine={false} tickLine={false} width={34} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }} formatter={(v: number) => [`${v} ${unit}`, "Weight"]} />
                      {weightAxis.goalInView && <ReferenceLine y={data.nutrition.goalWeight} stroke="#f472b6" strokeDasharray="4 4" />}
                      <Line type="monotone" dataKey="kg" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3, fill: "#7c3aed" }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-1 text-center text-[11px] text-ink-mute">
                  {weightAxis.goalInView
                    ? "The dashed line is your goal."
                    : `${Math.max(0, wp.toGo).toFixed(1)}${unit} to go — the goal line appears as it comes into range.`}
                </p>
              </Card>
            ) : (
              <Empty
                icon="⚖️"
                title={weightChart.length === 1 ? "One weigh-in down" : "No weigh-ins yet"}
                body={weightChart.length === 1 ? "Add another whenever you like and the trend line starts drawing itself." : "Step on the scales whenever it suits — there's no streak to keep up."}
              />
            )}

            {wp.list.length > 0 && (
              <div className="space-y-2">
                <SectionTitle>Every weigh-in</SectionTitle>
                {[...wp.list].reverse().map((w, i, arr) => {
                  const prev = arr[i + 1];
                  const change = prev ? w.kg - prev.kg : null;
                  return (
                    <button
                      key={w.date}
                      onClick={() => { setWeighDate(w.date); setWeighing(true); }}
                      className="card tap flex w-full items-center justify-between p-3 text-left"
                    >
                      <div>
                        <div className="text-sm font-bold">{w.kg.toFixed(1)} {unit}</div>
                        <div className="text-[11px] text-ink-mute">{formatDate(w.ts, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</div>
                      </div>
                      {change != null && (
                        <span className={cn("text-xs font-bold", change < 0 ? "text-teal-700" : change > 0 ? "text-ink-soft" : "text-ink-mute")}>
                          {change > 0 ? "+" : ""}{change.toFixed(1)} {unit}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "history" && (done.length === 0 ? (
          <Empty
            icon="📓"
            title="Nothing logged yet"
            body="Start a program from Today, or write up a session you've already done."
            action={<Link href="/log-past" className="font-bold text-teal-700">Log a past workout →</Link>}
          />
        ) : (
          <div className="space-y-2">
            <Link href="/log-past" className="card tap flex items-center gap-3 border-2 border-dashed border-teal-200 bg-white/70 p-3 text-sm font-bold text-teal-700">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-50 text-lg">📅</span>
              Log a workout you've already done
            </Link>
            {done.map((s) => (
              <Link key={s.id} href={`/progress/${s.id}`} className="card tap flex items-center gap-3 p-4">
                <span className="text-2xl">{s.feeling ? FACE[s.feeling] : "💪"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{s.programName}</div>
                  <div className="text-xs text-ink-soft">{formatDate(s.startedAt, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })} · {formatDuration(s.durationSec)} · {s.entries.length} sets · {Math.round(sessionVolume(s))}{data.profile.unit}</div>
                </div>
                <span className="text-ink-mute">→</span>
              </Link>
            ))}
          </div>
        ))}

        {tab === "pbs" && (pbs.length === 0 ? (
          <Empty icon="🏆" title="No PBs yet" body="Log a weight on any exercise and it'll be tracked here." />
        ) : (
          <div className="space-y-2">
            {pbs.map(({ e, best }) => (
              <Link key={e.id} href={`/library/${e.id}`} className="card tap flex items-center justify-between p-3">
                <div className="min-w-0"><div className="truncate text-sm font-bold">{e.name}</div><div className="text-[11px] text-ink-mute">{formatDate(best!.completedAt)}</div></div>
                <div className="display text-[24px] text-teal-700">{best!.weight}{data.profile.unit}</div>
              </Link>
            ))}
          </div>
        ))}
      </div>

      <WeightSheet open={weighing} onClose={() => setWeighing(false)} days={data.days} unit={unit} initialDate={weighDate} />
    </div>
  );
}
