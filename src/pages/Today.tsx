import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAppData } from "@/lib/store";
import { greeting, quoteOfTheDay, nextProgram, sessionsThisWeek, weekStreak, programSummary, formatDate, formatDuration, findExercise, rowName, programsThisWeek, programDate } from "@/lib/utils";
import { Header, TimerButton } from "@/components/Header";
import { Button, Card, GoalRing, Pill, SectionTitle, Stat } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";
import { PhotoThumb } from "@/components/SheetPhotos";
import { AddSheetFlow } from "@/components/AddSheet";
import { IconCamera, IconCheck, IconDumbbell, IconFlame, IconNext, IconPlay, IconSheet, IconTimer, IconTrophy } from "@/components/Icons";
import { startSession } from "@/lib/session";

export default function Today() {
  const data = useAppData();
  const [, nav] = useLocation();
  const [adding, setAdding] = useState(false);
  const next = nextProgram(data.programs, data.sessions);
  const week = sessionsThisWeek(data.sessions);
  const streak = weekStreak(data.sessions);
  const recent = [...data.sessions].filter((s) => s.finishedAt).sort((a, b) => b.startedAt - a.startedAt).slice(0, 3);
  const goal = data.profile.weeklyGoal;
  const sheetsThisWeek = programsThisWeek(data.programs);
  const sheetsGoal = Math.max(2, goal);
  const totalDone = data.sessions.filter((s) => s.finishedAt).length;

  const begin = (mode: "free" | "guided45") => {
    if (!next) return;
    startSession(next, mode);
    nav("/workout");
  };

  return (
    <div className="safe-bottom">
      <Header title={<span className="grad-text">Counter</span>} sub={formatDate(Date.now(), { weekday: "long", day: "numeric", month: "long" })} right={<TimerButton />} />
      <div className="stagger space-y-5 px-4 pt-2">
        {/* Hero */}
        <section className="noise-ring dots relative overflow-hidden rounded-[28px] grad-teal-deep p-5 text-white shadow-[var(--shadow-pop)]">
          <div className="relative flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="display text-[34px] leading-none">{greeting(data.profile.name)}</h2>
              <p className="mt-1.5 text-[13px] italic text-white/80">"{quoteOfTheDay()}"</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide"><IconFlame size={13} /> {streak} week{streak === 1 ? "" : "s"} streak</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide"><IconTrophy size={13} /> {totalDone} workouts</span>
              </div>
            </div>
            <GoalRing value={week.length} max={goal} size={98} stroke={10}>
              <div className="text-center leading-none">
                <div className="display text-[30px]">{week.length}<span className="text-white/60">/{goal}</span></div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/70">this week</div>
              </div>
            </GoalRing>
          </div>
        </section>

        {/* This week's sheets */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-ink-mute"><IconSheet size={14} /> Carolyn's sheets · this week</div>
              <div className="display mt-0.5 text-[24px] leading-none">{sheetsThisWeek.length} of {sheetsGoal} added</div>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: Math.max(sheetsGoal, sheetsThisWeek.length) }).map((_, i) => (
                <span key={i} className={i < sheetsThisWeek.length ? "grid h-7 w-7 place-items-center rounded-full grad-teal text-white shadow-sm" : "grid h-7 w-7 place-items-center rounded-full border-2 border-dashed border-sand-deep text-xs font-extrabold text-ink-mute"}>
                  {i < sheetsThisWeek.length ? <IconCheck size={14} /> : i + 1}
                </span>
              ))}
            </div>
          </div>
          {sheetsThisWeek.length > 0 && (
            <div className="scroll-x -mx-4 mt-3 flex gap-2 px-4">
              {sheetsThisWeek.map((p) => (
                <Link key={p.id} href={`/programs/${p.id}`} className="tap flex w-[120px] shrink-0 flex-col">
                  {p.photoIds?.[0] ? (
                    <PhotoThumb id={p.photoIds[0]} className="h-24 w-full pointer-events-none" />
                  ) : (
                    <div className="grid h-24 w-full place-items-center rounded-2xl illo-bg text-teal-700"><IconSheet size={28} /></div>
                  )}
                  <span className="mt-1 truncate text-xs font-bold">{p.name}</span>
                  <span className="truncate text-[10px] text-ink-mute">{p.dayLabel || formatDate(programDate(p))}</span>
                </Link>
              ))}
            </div>
          )}
          <Button full variant={sheetsThisWeek.length < sheetsGoal ? "coral" : "secondary"} className="mt-3" onClick={() => setAdding(true)}>
            <IconCamera size={18} /> {sheetsThisWeek.length < sheetsGoal ? "Add this week's sheet" : "Add another sheet"}
          </Button>
        </Card>

        {next && (
          <Card className="relative overflow-hidden border-2 border-teal-100 p-5">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-teal-50" />
            <div className="absolute -right-4 top-12 h-16 w-16 rounded-full bg-coral-100/70" />
            <div className="relative">
              <Pill tone="teal">Up next</Pill>
              <h3 className="display mt-2 text-[30px] leading-none">{next.name}</h3>
              <p className="mt-1 text-sm text-ink-soft">
                {next.dayLabel} · {programSummary(next).stations} stations · {programSummary(next).tabatas} tabata
              </p>
              <div className="scroll-x mt-3 -mx-1 flex gap-2 px-1">
                {next.rows.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex w-[84px] shrink-0 flex-col items-center">
                    <ExerciseImage exercise={findExercise(r.exerciseId, data.customExercises)} size="md" className="shadow-card" />
                    <span className="mt-1 line-clamp-2 text-center text-[10px] font-semibold leading-tight text-ink-soft">{rowName(r, data.customExercises)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="coral" onClick={() => begin("guided45")}><IconTimer size={18} /> 45-min guided</Button>
                <Button onClick={() => begin("free")}><IconPlay size={16} /> Start & log</Button>
              </div>
              <Link href={`/programs/${next.id}`} className="mt-3 flex items-center justify-center gap-1 text-sm font-bold text-teal-700">
                View or edit the sheet <IconNext size={14} />
              </Link>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Stat value={`${week.length}/${goal}`} label="This week" tone={week.length >= goal ? "teal" : "ink"} icon={<IconCheck size={16} />} />
          <Stat value={streak} label={streak === 1 ? "Week streak" : "Weeks streak"} tone="coral" icon={<IconFlame size={16} />} />
          <Stat value={totalDone} label="Workouts" tone="mustard" icon={<IconTrophy size={16} />} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/programs" className="card tap flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl grad-sky text-white shadow-sm"><IconSheet size={22} /></span>
            <div>
              <div className="font-bold">Sheets</div>
              <div className="text-xs text-ink-soft">{data.programs.length} programs</div>
            </div>
          </Link>
          <Link href="/library" className="card tap flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl grad-plum text-white shadow-sm"><IconDumbbell size={22} /></span>
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
                  <span className="text-ink-mute"><IconNext size={18} /></span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <p className="pb-2 text-center text-[11px] text-ink-mute">Built on Carolyn Counter's programs. Stay accountable. 💪</p>
      </div>
      <AddSheetFlow open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
