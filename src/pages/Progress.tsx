import { useMemo, useState } from "react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { useAppData } from "@/lib/store";
import { formatDate, formatDuration, sessionsThisWeek, weekStreak, weekStart, sessionVolume, bestWeightFor, allExercises, cn } from "@/lib/utils";
import { Header, TimerButton } from "@/components/Header";
import { Card, Empty, SectionTitle, Stat } from "@/components/ui";

const FACE = { 1: "😮‍💨", 2: "😐", 3: "🙂", 4: "😄", 5: "🔥" } as const;

export default function Progress() {
  const data = useAppData();
  const done = useMemo(() => [...data.sessions].filter((s) => s.finishedAt).sort((a, b) => b.startedAt - a.startedAt), [data.sessions]);
  const [tab, setTab] = useState<"history" | "pbs">("history");
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

        <div className="flex gap-2">
          {(["history", "pbs"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("tap rounded-full px-4 py-2 text-sm font-bold", tab === t ? "grad-teal text-white shadow-[var(--shadow-pop)]" : "bg-white text-ink-soft shadow-card")}>{t === "history" ? "History" : "Personal bests"}</button>
          ))}
        </div>

        {tab === "history" && (done.length === 0 ? (
          <Empty icon="📓" title="Nothing logged yet" body="Start a program from Today and your workouts will show up here." action={<Link href="/programs" className="font-bold text-teal-700">Go to programs →</Link>} />
        ) : (
          <div className="space-y-2">
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
    </div>
  );
}
