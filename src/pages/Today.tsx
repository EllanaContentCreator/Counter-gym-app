import { Link, useLocation } from "wouter";
import { useAppData } from "@/lib/store";
import { greeting, quoteOfTheDay, nextProgram, sessionsThisWeek, weekStreak, programSummary, formatDate, formatDuration, findExercise, rowName } from "@/lib/utils";
import { Header, TimerButton } from "@/components/Header";
import { Button, Card, Pill, SectionTitle, Stat } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";
import { startSession } from "@/lib/session";

export default function Today() {
  const data = useAppData();
  const [, nav] = useLocation();
  const next = nextProgram(data.programs, data.sessions);
  const week = sessionsThisWeek(data.sessions);
  const streak = weekStreak(data.sessions);
  const recent = [...data.sessions].filter((s) => s.finishedAt).sort((a, b) => b.startedAt - a.startedAt).slice(0, 3);
  const goal = data.profile.weeklyGoal;

  const begin = (mode: "free" | "guided45") => {
    if (!next) return;
    startSession(next, mode);
    nav("/workout");
  };

  return (
    <div className="safe-bottom">
      <Header title={<span className="text-teal-700">Counter</span>} sub={formatDate(Date.now(), { weekday: "long", day: "numeric", month: "long" })} right={<TimerButton />} />
      <div className="space-y-5 px-4 pt-2">
        <div>
          <h2 className="display text-[34px] leading-none">{greeting(data.profile.name)}</h2>
          <p className="mt-1 text-sm italic text-ink-soft">"{quoteOfTheDay()}"</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat value={`${week.length}/${goal}`} label="This week" tone={week.length >= goal ? "teal" : "ink"} />
          <Stat value={streak} label={streak === 1 ? "Week streak" : "Weeks streak"} tone="coral" />
          <Stat value={data.sessions.filter((s) => s.finishedAt).length} label="Workouts" tone="mustard" />
        </div>

        {next && (
          <Card className="relative overflow-hidden border-2 border-teal-100 p-5">
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-teal-50" />
            <Pill tone="teal">Up next</Pill>
            <h3 className="display mt-2 text-[30px] leading-none">{next.name}</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {next.dayLabel} · {programSummary(next).stations} stations · {programSummary(next).tabatas} tabata
            </p>
            <div className="scroll-x mt-3 -mx-1 flex gap-2 px-1">
              {next.rows.slice(0, 6).map((r) => (
                <div key={r.id} className="flex w-[84px] shrink-0 flex-col items-center">
                  <ExerciseImage exercise={findExercise(r.exerciseId, data.customExercises)} size="md" />
                  <span className="mt-1 line-clamp-2 text-center text-[10px] font-semibold leading-tight text-ink-soft">{rowName(r, data.customExercises)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="coral" onClick={() => begin("guided45")}>⏱ 45-min guided</Button>
              <Button onClick={() => begin("free")}>Start & log</Button>
            </div>
            <Link href={`/programs/${next.id}`} className="mt-3 block text-center text-sm font-bold text-teal-700">
              View or edit the sheet →
            </Link>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link href="/programs" className="card tap flex items-center gap-3 p-4">
            <span className="text-2xl">📋</span>
            <div>
              <div className="font-bold">Programs</div>
              <div className="text-xs text-ink-soft">{data.programs.length} sheets</div>
            </div>
          </Link>
          <Link href="/library" className="card tap flex items-center gap-3 p-4">
            <span className="text-2xl">🏋️‍♀️</span>
            <div>
              <div className="font-bold">Exercises</div>
              <div className="text-xs text-ink-soft">Library & PBs</div>
            </div>
          </Link>
        </div>

        <div>
          <SectionTitle action={<Link href="/progress" className="text-sm font-bold text-teal-700">All →</Link>}>Recent workouts</SectionTitle>
          {recent.length === 0 ? (
            <Card className="text-center text-sm text-ink-soft">No workouts logged yet. Your first one is the hardest — and the most important.</Card>
          ) : (
            <div className="space-y-2">
              {recent.map((s) => (
                <Link key={s.id} href={`/progress/${s.id}`} className="card tap flex items-center justify-between p-4">
                  <div>
                    <div className="font-bold">{s.programName}</div>
                    <div className="text-xs text-ink-soft">
                      {formatDate(s.startedAt)} · {formatDuration(s.durationSec)} · {s.entries.length} sets
                    </div>
                  </div>
                  <span className="text-ink-mute">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <p className="pb-2 text-center text-[11px] text-ink-mute">Built on Carolyn Counter's programs. Stay accountable. 💪</p>
      </div>
    </div>
  );
}
