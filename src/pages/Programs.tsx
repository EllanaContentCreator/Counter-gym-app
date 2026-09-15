import { Link } from "wouter";
import { useState } from "react";
import { useAppData } from "@/lib/store";
import { programSummary, formatDate, programsByWeek, weekLabel, weekStart, programDate, cn } from "@/lib/utils";
import { Header, TimerButton } from "@/components/Header";
import { Button, Pill } from "@/components/ui";
import { PhotoThumb } from "@/components/SheetPhotos";
import { AddSheetFlow } from "@/components/AddSheet";
import { IconCamera, IconCheck, IconImage, IconSheet } from "@/components/Icons";
import type { Program } from "@/lib/types";

export default function Programs() {
  const data = useAppData();
  const [adding, setAdding] = useState(false);
  const weeks = programsByWeek(data.programs);
  const thisWeek = weekStart();
  const hasThisWeek = weeks.some((w) => w.start === thisWeek);
  const goal = Math.max(2, data.profile.weeklyGoal);
  const lastDone = (id: string) => [...data.sessions].filter((s) => s.finishedAt && s.programId === id).sort((a, b) => b.startedAt - a.startedAt)[0];

  return (
    <div className="safe-bottom">
      <Header title="Sheets" sub={`${data.programs.length} workout sheets · ${weeks.length} weeks`} right={<TimerButton />} />
      <div className="stagger space-y-5 px-4 pt-2">
        <Button full variant="coral" size="lg" onClick={() => setAdding(true)}><IconCamera size={20} /> Add this week's sheet</Button>

        {!hasThisWeek && (
          <WeekBlock start={thisWeek} goal={goal} count={0}>
            <button onClick={() => setAdding(true)} className="tap card flex w-full items-center gap-3 border-2 border-dashed border-sand-deep bg-white/60 p-4 text-left">
              <span className="grid h-12 w-12 place-items-center rounded-2xl illo-bg text-teal-700"><IconImage size={24} /></span>
              <div>
                <div className="font-bold">No sheets yet this week</div>
                <div className="text-xs text-ink-soft">Snap Carolyn's sheet on Tuesday and Thursday and they'll be filed here.</div>
              </div>
            </button>
          </WeekBlock>
        )}

        {weeks.map((w) => (
          <WeekBlock key={w.start} start={w.start} goal={goal} count={w.programs.length}>
            {w.programs.map((p) => (
              <ProgramCard key={p.id} p={p} last={lastDone(p.id)} unit={data.profile.unit} />
            ))}
          </WeekBlock>
        ))}
      </div>
      <AddSheetFlow open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function WeekBlock({ start, goal, count, children }: { start: number; goal: number; count: number; children: React.ReactNode }) {
  const label = weekLabel(start);
  const current = start === weekStart();
  const end = start + 6 * 864e5;
  const range = `${formatDate(start, { day: "numeric", month: "short" })} – ${formatDate(end, { day: "numeric", month: "short" })}`;
  return (
    <section>
      <div className="mb-2 flex items-end justify-between px-1">
        <div>
          <h2 className={cn("display text-[24px] leading-none", current ? "text-teal-700" : "text-ink")}>{label}</h2>
          {(label === "This week" || label === "Last week") && <div className="text-[11px] font-semibold text-ink-mute">{range}</div>}
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.max(goal, count) }).map((_, i) => (
            <span key={i} className={i < count ? "grid h-5 w-5 place-items-center rounded-full grad-teal text-white" : "h-5 w-5 rounded-full border-2 border-dashed border-sand-deep"}>
              {i < count && <IconCheck size={11} />}
            </span>
          ))}
          <span className="ml-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-mute">{count}/{goal}</span>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const MEDALLION = ["grad-sky", "grad-plum", "grad-coral", "grad-lime", "grad-teal", "grad-sun"];

function ProgramCard({ p, last, unit }: { p: Program; last?: { startedAt: number }; unit: string }) {
  const s = programSummary(p);
  const photo = p.photoIds?.[0];
  void unit;
  return (
    <Link href={`/programs/${p.id}`} className="card tap block overflow-hidden">
      <div className="flex">
        {photo ? (
          <PhotoThumb id={photo} className="h-full min-h-[112px] w-[96px] rounded-none pointer-events-none" />
        ) : (
          <div className="grid min-h-[112px] w-[96px] shrink-0 place-items-center illo-bg text-teal-700/70"><IconSheet size={30} /></div>
        )}
        <div className="min-w-0 flex-1 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="display text-[24px] leading-none">{p.name}</span>
                {p.source === "carolyn" && <Pill tone="mustard">Carolyn</Pill>}
              </div>
              <div className="mt-1 text-sm font-semibold text-ink-soft">{p.dayLabel || formatDate(programDate(p))}</div>
            </div>
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-md", MEDALLION[(p.number - 1) % MEDALLION.length])}>
              <span className="display text-xl leading-none">{p.number.toString().padStart(2, "0")}</span>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-wide text-ink-mute">
            <span className="flex items-center gap-1">
              {Array.from({ length: Math.min(4, s.stations) }).map((_, i) => <span key={i} className={cn("h-2 w-2 rounded-full", ["bg-sky-500", "bg-plum-500", "bg-coral-500", "bg-lime-500"][i])} />)}
              {s.stations} station{s.stations === 1 ? "" : "s"}
            </span>
            <span>· {s.exercises} move{s.exercises === 1 ? "" : "s"}</span>
            {s.tabatas > 0 && <span className="rounded-md grad-sun px-1.5 py-0.5 text-ink">{s.tabatas} tabata</span>}
            {photo && <span className="flex items-center gap-1 text-teal-700"><IconImage size={12} /> {p.photoIds!.length}</span>}
            {last && <span className="text-teal-700">✓ {formatDate(last.startedAt)}</span>}
            {p.rows.length === 0 && <span className="text-coral-600">Needs typing up</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
