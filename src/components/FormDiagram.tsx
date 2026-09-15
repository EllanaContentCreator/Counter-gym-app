import type { Exercise } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEP_NAMES = ["Set up", "The move", "Finish"];
const TONES = ["station-1", "station-3", "station-4", "station-2", "station-x"];

/** Step-by-step form diagram built from the exercise's coaching cues. */
export function FormDiagram({ exercise, className }: { exercise: Exercise; className?: string }) {
  const cues = exercise.cues;
  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-[19px] top-5 bottom-5 w-0.5 border-l-2 border-dashed border-sand-deep" />
      <ol className="space-y-3">
        {cues.map((c, i) => (
          <li key={i} className="relative flex items-start gap-3">
            <span className={cn("relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-md ring-4 ring-white", TONES[i % TONES.length])}>
              <span className="display text-lg leading-none">{i + 1}</span>
            </span>
            <div className="min-w-0 flex-1 rounded-2xl bg-white/80 px-3 py-2.5 shadow-card">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-ink-mute">{cues.length <= 3 ? STEP_NAMES[i] ?? `Step ${i + 1}` : `Step ${i + 1}`}</div>
              <div className="text-sm font-semibold leading-snug">{c}</div>
            </div>
          </li>
        ))}
        {cues.length === 0 && <li className="text-sm text-ink-soft">No cues yet.</li>}
      </ol>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {exercise.category === "tabata" && <Chip tone="sun">20s on · 10s off · ×8</Chip>}
        {exercise.category === "strength" && <Chip tone="teal">3 rounds · 10 reps</Chip>}
        {exercise.category === "core" && <Chip tone="teal">Slow & controlled</Chip>}
        {exercise.category === "mobility" && <Chip tone="lime">45s each · easy pace</Chip>}
        {exercise.category === "cardio" && <Chip tone="coral">Steady breathing</Chip>}
        {exercise.unilateral && <Chip tone="coral">Left then right</Chip>}
        {exercise.noWeight && <Chip tone="grey">Bodyweight</Chip>}
      </div>
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone: "sun" | "teal" | "lime" | "coral" | "grey" }) {
  const tones = {
    sun: "bg-mustard-100 text-[#7a5a00]",
    teal: "bg-teal-100 text-teal-900",
    lime: "bg-lime-100 text-[#3f6f18]",
    coral: "bg-coral-100 text-coral-700",
    grey: "bg-sand text-ink-soft",
  };
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide", tones[tone])}>{children}</span>;
}
