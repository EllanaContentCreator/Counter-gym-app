import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useAppData, actions, uid } from "@/lib/store";
import {
  cn,
  findExercise,
  dayAnchor,
  fromDateInput,
  isFutureDay,
  isTabata,
  parseReps,
  parseWeight,
  rowName,
  sheetDayLabel,
  toDateInput,
} from "@/lib/utils";
import type { Exercise, ProgramRow, SetEntry, WorkoutSession } from "@/lib/types";
import { Header } from "@/components/Header";
import { Button, Card, Field, inputCls } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";
import { ExercisePicker } from "@/components/ExercisePicker";
import { SlotBadge } from "./ProgramDetail";
import { IconPlus } from "@/components/Icons";

const FACES = [
  [1, "😮‍💨", "Rough"],
  [2, "😐", "Meh"],
  [3, "🙂", "OK"],
  [4, "😄", "Good"],
  [5, "🔥", "On fire"],
] as const;

/** What she types for one exercise: the weight, the reps, and how many rounds of it. */
interface Line {
  row: ProgramRow;
  weight: string;
  reps: string;
  rounds: number;
  skipped: boolean;
}

function lineFor(row: ProgramRow, lastWeights: Record<string, string>, defaultRounds: number): Line {
  return {
    row,
    weight: row.weight || lastWeights[row.exerciseId] || "",
    reps: row.reps || "",
    rounds: isTabata(row) ? 1 : defaultRounds,
    skipped: false,
  };
}

/**
 * "Log a workout I've already done".
 *
 * Carolyn's ladies train first and write it up after, sometimes days after, so a
 * workout can be filed against the day it actually happened rather than the day
 * it gets typed in. Everything here is typed — no timers, no stopwatch — and it
 * saves as a finished session exactly like one logged live.
 */
export default function LogPast() {
  const data = useAppData();
  const [, nav] = useLocation();
  // Arriving from a sheet's "I've already done this" preselects that sheet.
  const { program: presetProgram } = useParams<{ program?: string }>();

  const programs = useMemo(() => [...data.programs].sort((a, b) => b.number - a.number), [data.programs]);
  const yesterday = Date.now() - 864e5;

  const [date, setDate] = useState(() => toDateInput(yesterday));
  const [programId, setProgramId] = useState<string | null>(presetProgram ?? programs[0]?.id ?? null);
  const [defaultRounds, setDefaultRounds] = useState(3);
  const [minutes, setMinutes] = useState("45");
  const [feeling, setFeeling] = useState<WorkoutSession["feeling"]>(undefined);
  const [notes, setNotes] = useState("");
  const [picking, setPicking] = useState(false);
  const [extras, setExtras] = useState<ProgramRow[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<Line>>>({});
  const [saving, setSaving] = useState(false);

  const program = programs.find((p) => p.id === programId) ?? null;
  const rows = useMemo(() => [...(program?.rows ?? []), ...extras], [program, extras]);

  // The typed values, with anything she has changed laid over the sheet's own numbers.
  const lines: Line[] = useMemo(
    () => rows.map((r) => ({ ...lineFor(r, data.lastWeights, defaultRounds), ...edits[r.id] })),
    [rows, data.lastWeights, defaultRounds, edits],
  );
  const patch = (rowId: string, p: Partial<Line>) => setEdits((e) => ({ ...e, [rowId]: { ...e[rowId], ...p } }));

  const ts = fromDateInput(date) ?? yesterday;
  const inFuture = isFutureDay(ts);
  const counted = lines.filter((l) => !l.skipped && (l.weight.trim() || l.reps.trim()));
  const setCount = counted.reduce((a, l) => a + Math.max(1, l.rounds), 0);

  const save = () => {
    if (inFuture || !counted.length) return;
    setSaving(true);
    // Any exercise typed in that isn't in the library yet joins it.
    for (const r of extras) {
      const ex = findExercise(r.exerciseId, data.customExercises);
      if (ex?.custom && !data.customExercises.some((c) => c.id === ex.id)) actions.addCustomExercise(ex);
    }
    const durationSec = Math.max(0, Math.round((parseFloat(minutes) || 45) * 60));
    const startedAt = dayAnchor(ts, durationSec);
    const entries: SetEntry[] = [];
    counted.forEach((l, i) => {
      for (let round = 1; round <= Math.max(1, l.rounds); round++) {
        entries.push({
          id: uid(),
          rowId: l.row.id,
          exerciseId: l.row.exerciseId,
          exerciseName: rowName(l.row, data.customExercises),
          slot: l.row.slot,
          round,
          setIndex: round,
          weight: parseWeight(l.weight),
          weightText: l.weight.trim(),
          reps: parseReps(l.reps),
          repsText: l.reps.trim(),
          // Spread the sets across the session so they read in order afterwards.
          completedAt: startedAt + Math.round((i / Math.max(1, counted.length)) * durationSec * 1000),
        });
      }
    });
    const session: WorkoutSession = {
      id: uid(),
      programId: program?.id ?? null,
      programName: program?.name ?? "Free workout",
      mode: "free",
      startedAt,
      finishedAt: startedAt + durationSec * 1000,
      durationSec,
      entries,
      notes: notes.trim(),
      feeling,
      extraRows: extras.length ? extras : undefined,
    };
    actions.saveSession(session);
    nav(`/progress/${session.id}`);
  };

  const addExtra = (e: Exercise) => {
    setPicking(false);
    setExtras((cur) => [
      ...cur,
      {
        id: uid(),
        exerciseId: e.id,
        slot: e.category === "tabata" ? "TABATA" : "＋",
        weight: data.lastWeights[e.id] ?? (e.noWeight ? "0" : ""),
        sets: "",
        reps: "10",
        rest: "",
      },
    ]);
  };

  return (
    <div className="safe-bottom pb-8">
      <Header title="Log a past workout" back="/progress" sub="Write up a session you've already done" />
      <div className="space-y-5 px-4 pt-1">
        <div>
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">1 · When did you train?</div>
          <Field label="Date">
            <input type="date" className={inputCls} value={date} max={toDateInput(Date.now())} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div className="scroll-x -mx-4 mt-2 flex gap-2 px-4">
            {Array.from({ length: 10 }).map((_, i) => {
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
          {inFuture && <p className="mt-1.5 text-[11px] font-semibold text-coral-600">That day hasn't happened yet.</p>}
        </div>

        <div>
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">2 · Which sheet?</div>
          {programs.length === 0 ? (
            <Card className="text-sm text-ink-soft">
              No sheets yet — add one from <Link href="/programs" className="font-bold text-teal-700">Sheets</Link>, or just add the exercises below.
            </Card>
          ) : (
            <div className="scroll-x -mx-4 flex gap-2 px-4">
              {programs.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setProgramId(p.id); setEdits({}); }}
                  className={cn(
                    "tap shrink-0 rounded-2xl px-3 py-2 text-left text-xs font-bold",
                    programId === p.id ? "grad-teal text-white shadow-[var(--shadow-pop)]" : "bg-white text-ink-soft shadow-card",
                  )}
                >
                  <div className="truncate">{p.name}</div>
                  <div className={cn("text-[10px] font-semibold", programId === p.id ? "text-white/75" : "text-ink-mute")}>{p.dayLabel}</div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setProgramId(null); setEdits({}); }}
                className={cn(
                  "tap shrink-0 rounded-2xl px-3 py-2 text-xs font-bold",
                  programId === null ? "grad-teal text-white shadow-[var(--shadow-pop)]" : "bg-white text-ink-soft shadow-card",
                )}
              >
                Free workout
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-extrabold uppercase tracking-wide text-ink-soft">3 · What you lifted</div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-soft">
              Rounds
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setDefaultRounds(n); setEdits((e) => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, { ...v, rounds: undefined }]))); }}
                  className={cn("tap h-7 w-7 rounded-full text-xs font-extrabold", defaultRounds === n ? "grad-teal text-white" : "bg-white text-ink-soft shadow-card")}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {lines.map((l) => {
              const ex = findExercise(l.row.exerciseId, data.customExercises);
              const isExtra = extras.some((x) => x.id === l.row.id);
              return (
                <Card key={l.row.id} className={cn("p-3", l.skipped && "opacity-45")}>
                  {/* Carolyn's names run long, so the name gets the whole width and wraps. */}
                  <div className="flex items-start gap-2.5">
                    <div className="pt-0.5"><SlotBadge row={l.row} /></div>
                    <ExerciseImage exercise={ex} size="sm" />
                    <div className="min-w-0 flex-1 text-[13px] font-bold leading-tight">{rowName(l.row, data.customExercises)}</div>
                  </div>

                  {!l.skipped && (
                    <>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Field label={`Weight (${data.profile.unit})`}>
                          <input
                            className={inputCls}
                            inputMode="decimal"
                            value={l.weight}
                            onChange={(e) => patch(l.row.id, { weight: e.target.value })}
                            placeholder={ex?.noWeight ? "0" : "e.g. 12.5"}
                          />
                        </Field>
                        <Field label="Reps">
                          <input
                            className={inputCls}
                            inputMode="numeric"
                            value={l.reps}
                            onChange={(e) => patch(l.row.id, { reps: e.target.value })}
                            placeholder="e.g. 12"
                          />
                        </Field>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-ink-mute">
                          <button type="button" aria-label="Fewer rounds" onClick={() => patch(l.row.id, { rounds: Math.max(1, l.rounds - 1) })} className="tap grid h-7 w-7 place-items-center rounded-full bg-sand text-sm">−</button>
                          <span className="w-12 text-center text-ink">{l.rounds} round{l.rounds === 1 ? "" : "s"}</span>
                          <button type="button" aria-label="More rounds" onClick={() => patch(l.row.id, { rounds: Math.min(9, l.rounds + 1) })} className="tap grid h-7 w-7 place-items-center rounded-full bg-sand text-sm">+</button>
                        </div>
                        <button
                          type="button"
                          onClick={() => (isExtra ? setExtras((c) => c.filter((x) => x.id !== l.row.id)) : patch(l.row.id, { skipped: true }))}
                          className="tap text-[11px] font-extrabold text-ink-mute"
                        >
                          {isExtra ? "Remove" : "Didn't do this"}
                        </button>
                      </div>
                    </>
                  )}
                  {l.skipped && (
                    <button type="button" onClick={() => patch(l.row.id, { skipped: false })} className="tap mt-1.5 text-[11px] font-extrabold text-teal-700">
                      Skipped — put it back
                    </button>
                  )}
                </Card>
              );
            })}
            {lines.length === 0 && (
              <Card className="text-center text-sm text-ink-soft">Pick a sheet above, or add the exercises you did.</Card>
            )}
          </div>

          <Button full variant="secondary" className="mt-2" onClick={() => setPicking(true)}>
            <IconPlus size={16} /> Add an exercise
          </Button>
        </div>

        <div>
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">4 · How it went</div>
          <Field label="How long did it take?" hint="Minutes">
            <input className={inputCls} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="45" />
          </Field>
          <div className="mt-2 flex gap-1.5">
            {FACES.map(([v, face, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFeeling(feeling === v ? undefined : v)}
                className={cn(
                  "tap flex-1 rounded-2xl py-2 text-center text-[10px] font-bold",
                  feeling === v ? "grad-teal text-white shadow-[var(--shadow-pop)]" : "bg-white text-ink-soft shadow-card",
                )}
              >
                <div className="text-lg leading-none">{face}</div>
                {label}
              </button>
            ))}
          </div>
          <Field label="Notes">
            <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Shoulder felt good. Went up 2.5kg on the hex bar." />
          </Field>
        </div>

        <Button full size="lg" variant="coral" onClick={save} disabled={saving || inFuture || counted.length === 0}>
          {counted.length ? `Save ${sheetDayLabel(ts)} — ${setCount} set${setCount === 1 ? "" : "s"}` : "Fill in a weight or reps first"}
        </Button>
        <p className="text-center text-[11px] text-ink-mute">
          It saves as a finished workout on {sheetDayLabel(ts)}, and counts towards that week.
        </p>
      </div>

      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={addExtra} />
    </div>
  );
}
