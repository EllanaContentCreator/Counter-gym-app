import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAppData, actions, loadActiveSession, saveActiveSession, uid } from "@/lib/store";
import { cn, findExercise, formatClock, isTabata, isAll, parseReps, rowName, stationNumber, bestWeightFor, parseWeight, sessionVolume } from "@/lib/utils";
import { beep, vibrate, useCountdown, useStopwatch, useWakeLock } from "@/lib/timer";
import { Button, Card, Field, Sheet, inputCls } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";
import { ExercisePicker } from "@/components/ExercisePicker";
import { TabataOverlay } from "@/components/Tabata";
import { SlotBadge } from "./ProgramDetail";
import { EXERCISES } from "@/data/exercises";
import type { Exercise, ProgramRow, SetEntry, WorkoutSession } from "@/lib/types";

// ───────────── 45-minute guided plan ─────────────
interface Phase { key: string; label: string; seconds: number; kind: "warm" | "round" | "tabata" | "cool"; round?: number; rowId?: string }

function buildPlan(rows: ProgramRow[]): Phase[] {
  const tabatas = rows.filter(isTabata);
  const warm = 5 * 60, cool = 4 * 60, tab = 4 * 60;
  const roundSec = Math.max(6 * 60, Math.floor((45 * 60 - warm - cool - tab * tabatas.length) / 3));
  const plan: Phase[] = [{ key: "warm", label: "Warm up", seconds: warm, kind: "warm" }];
  for (let r = 1; r <= 3; r++) plan.push({ key: `r${r}`, label: `Round ${r}`, seconds: roundSec, kind: "round", round: r });
  tabatas.forEach((t, i) => plan.push({ key: `t${i}`, label: `Tabata ${tabatas.length > 1 ? i + 1 : ""}`.trim(), seconds: tab, kind: "tabata", rowId: t.id }));
  plan.push({ key: "cool", label: "Cool down", seconds: cool, kind: "cool" });
  return plan;
}

const WARM = ["arm-circles", "hip-circles", "leg-swings", "cat-cow", "worlds-greatest-stretch", "bodyweight-squat", "inchworm"];
const COOL = ["hamstring-stretch", "hip-flexor-stretch", "figure-four-stretch", "chest-doorway-stretch", "childs-pose", "foam-roll-quads"];

export default function Workout() {
  const data = useAppData();
  const [, nav] = useLocation();
  const [session, setSession] = useState<WorkoutSession | null>(() => loadActiveSession());
  const program = data.programs.find((p) => p.id === session?.programId);
  const rows = useMemo(() => [...(program?.rows ?? []), ...(session?.extraRows ?? [])], [program, session?.extraRows]);
  const elapsed = useStopwatch(session?.startedAt ?? null);
  useWakeLock(!!session);

  const [round, setRound] = useState(1);
  const [tabataRow, setTabataRow] = useState<ProgramRow | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [discard, setDiscard] = useState(false);

  // Rest timer
  const rest = useCountdown(() => { beep("done", data.profile.soundOn); vibrate([150, 80, 150]); });

  // Guided plan
  const plan = useMemo(() => (session?.mode === "guided45" ? buildPlan(rows) : []), [session?.mode, rows]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phase = plan[phaseIdx];
  const phaseTimer = useCountdown(() => { beep("done", data.profile.soundOn); vibrate([200, 100, 200]); });
  const startedPhase = useRef<string | null>(null);
  useEffect(() => {
    if (!phase || startedPhase.current === phase.key) return;
    startedPhase.current = phase.key;
    phaseTimer.start(phase.seconds);
    if (phase.kind === "round" && phase.round) setRound(phase.round);
    if (phase.kind === "tabata") {
      const r = rows.find((x) => x.id === phase.rowId);
      if (r) setTabataRow(r);
    }
  }, [phase, rows]); // eslint-disable-line

  const persist = (s: WorkoutSession) => { setSession(s); saveActiveSession(s); };

  if (!session) {
    return (
      <div className="p-8 text-center">
        <h1 className="display text-3xl">No workout running</h1>
        <p className="mt-2 text-sm text-ink-soft">Pick a program to start logging.</p>
        <Link href="/programs" className="mt-4 inline-block font-bold text-teal-700">Go to programs →</Link>
      </div>
    );
  }

  const logSet = (row: ProgramRow, weightText: string, repsText: string) => {
    const ex = findExercise(row.exerciseId, data.customExercises);
    const entry: SetEntry = {
      id: uid(),
      rowId: row.id,
      exerciseId: row.exerciseId,
      exerciseName: rowName(row, data.customExercises),
      slot: row.slot,
      round,
      setIndex: session.entries.filter((e) => e.rowId === row.id).length + 1,
      weight: parseWeight(weightText),
      weightText,
      reps: parseReps(repsText),
      repsText,
      completedAt: Date.now(),
    };
    persist({ ...session, entries: [...session.entries, entry] });
    beep("tick", data.profile.soundOn);
    if (!isTabata(row) && ex?.category !== "mobility") rest.start(data.profile.restSeconds);
  };
  const removeEntry = (id: string) => persist({ ...session, entries: session.entries.filter((e) => e.id !== id) });

  const finish = (feeling: WorkoutSession["feeling"], notes: string) => {
    const done: WorkoutSession = { ...session, finishedAt: Date.now(), durationSec: Math.floor((Date.now() - session.startedAt) / 1000), feeling, notes };
    actions.saveSession(done);
    saveActiveSession(null);
    nav(`/progress/${done.id}`);
  };
  const addExtra = (e: Exercise) => {
    setPicking(false);
    const r: ProgramRow = { id: uid(), exerciseId: e.id, slot: e.category === "tabata" ? "TABATA" : "＋", weight: data.lastWeights[e.id] ?? (e.noWeight ? "0" : ""), sets: "", reps: "10", rest: "" };
    persist({ ...session, extraRows: [...(session.extraRows ?? []), r] });
  };

  const stationRows = rows.filter((r) => !isTabata(r));
  const tabataRows = rows.filter(isTabata);
  const totalPlan = plan.reduce((a, p) => a + p.seconds, 0);
  const planDone = plan.slice(0, phaseIdx).reduce((a, p) => a + p.seconds, 0) + (phase ? phase.seconds - phaseTimer.remaining : 0);

  return (
    <div className="min-h-dvh pb-40">
      {/* Sticky header */}
      <header className="safe-top sticky top-0 z-30 bg-ink text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">{session.mode === "guided45" ? "45-min guided" : "Logging"}</div>
            <div className="truncate font-bold">{session.programName}</div>
          </div>
          <div className="display text-3xl tabular-nums">{formatClock(elapsed)}</div>
          <Button size="sm" variant="coral" onClick={() => setFinishing(true)}>Finish</Button>
        </div>
        {session.mode === "guided45" && phase && (
          <div className="border-t border-white/10 px-4 pb-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Phase {phaseIdx + 1} of {plan.length}</div>
                <div className="display text-2xl leading-none">{phase.label}</div>
              </div>
              <div className={cn("display text-4xl tabular-nums", phaseTimer.remaining <= 10 && phaseTimer.running && "text-coral-500")}>{formatClock(phaseTimer.remaining)}</div>
            </div>
            <div className="mt-2 flex gap-1">
              {plan.map((p, i) => (
                <button key={p.key} onClick={() => setPhaseIdx(i)} className={cn("h-1.5 flex-1 rounded-full", i < phaseIdx ? "bg-teal-500" : i === phaseIdx ? "bg-coral-500" : "bg-white/20")} style={{ flexGrow: p.seconds }} aria-label={p.label} />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-white/70">
              <span>{formatClock(planDone)} / {formatClock(totalPlan)}</span>
              <div className="flex gap-3">
                <button onClick={() => (phaseTimer.running ? phaseTimer.pause() : phaseTimer.resume())} className="tap">{phaseTimer.running ? "❚❚ Pause" : "▶ Resume"}</button>
                {phaseIdx > 0 && <button onClick={() => setPhaseIdx((i) => i - 1)} className="tap">← Back</button>}
                {phaseIdx < plan.length - 1 && <button onClick={() => setPhaseIdx((i) => i + 1)} className="tap text-coral-500">Next phase →</button>}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="space-y-4 px-4 pt-4">
        {/* Guided warm-up / cool-down panels */}
        {session.mode === "guided45" && phase && (phase.kind === "warm" || phase.kind === "cool") && (
          <Card className={cn("border-2", phase.kind === "warm" ? "border-mustard-100 bg-mustard-100/40" : "border-teal-100 bg-teal-50")}>
            <div className="display text-[22px]">{phase.kind === "warm" ? "Warm up — get the blood moving" : "Cool down — you earned it"}</div>
            <p className="text-sm text-ink-soft">{phase.kind === "warm" ? "About 45 seconds each. Easy pace, full range." : "Hold each stretch for 30 seconds a side. Breathe."}</p>
            <div className="scroll-x -mx-2 mt-3 flex gap-2 px-2">
              {(phase.kind === "warm" ? WARM : COOL).map((id) => {
                const ex = EXERCISES.find((e) => e.id === id);
                if (!ex) return null;
                return (
                  <Link key={id} href={`/library/${id}`} className="w-[110px] shrink-0">
                    <ExerciseImage exercise={ex} size="md" className="w-full" />
                    <div className="mt-1 text-[11px] font-semibold leading-tight">{ex.name}</div>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        {/* Round selector */}
        {stationRows.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-mute">Round</span>
            {[1, 2, 3, 4].map((r) => (
              <button key={r} onClick={() => setRound(r)} className={cn("tap grid h-9 w-9 place-items-center rounded-full font-extrabold", round === r ? "bg-coral-500 text-white" : "bg-white text-ink-soft shadow-card")}>{r}</button>
            ))}
            <span className="ml-auto text-xs text-ink-soft">{session.entries.length} sets logged</span>
          </div>
        )}

        {stationRows.map((row) => (
          <StationCard key={row.id} row={row} round={round} session={session} custom={data.customExercises} unit={data.profile.unit} lastWeight={data.lastWeights[row.exerciseId]} best={bestWeightFor(data.sessions, row.exerciseId)} onLog={(w, r) => logSet(row, w, r)} onRemove={removeEntry} />
        ))}

        {tabataRows.length > 0 && (
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#b58200]">Tabata finishers · 20s on / 10s off × 8</div>
            <div className="space-y-2">
              {tabataRows.map((row) => {
                const done = session.entries.filter((e) => e.rowId === row.id).length;
                const ex = findExercise(row.exerciseId, data.customExercises);
                return (
                  <Card key={row.id} className="flex items-center gap-3 border-2 border-mustard-500/60 bg-mustard-100/60 p-3">
                    <ExerciseImage exercise={ex} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5"><SlotBadge row={row} /></div>
                      <div className="mt-1 text-sm font-bold leading-tight">{rowName(row, data.customExercises)}</div>
                      <div className="text-xs text-ink-soft">{row.weight ? `${row.weight} ${row.sets}`.trim() : "Bodyweight"}{row.reps ? ` · ${row.reps}` : ""}{done ? ` · ✓ done ×${done}` : ""}</div>
                    </div>
                    <Button size="sm" variant="mustard" onClick={() => setTabataRow(row)}>▶ Start</Button>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <Button full variant="secondary" onClick={() => setPicking(true)}>＋ Add an exercise to this session</Button>
        <button onClick={() => setDiscard(true)} className="w-full py-2 text-center text-sm font-bold text-ink-mute">Discard workout</button>
      </div>

      {/* Rest timer bar */}
      {rest.running || rest.remaining > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="mx-3 mb-3 flex w-full max-w-[496px] items-center gap-3 rounded-2xl bg-teal-700 px-4 py-3 text-white shadow-2xl">
            <div className="relative grid h-12 w-12 place-items-center rounded-full bg-white/15 text-teal-100"><span className="pulse-ring absolute inset-0 rounded-full" /><span className="display text-xl tabular-nums">{Math.ceil(rest.remaining)}</span></div>
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Rest</div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20"><div className="h-full bg-coral-500 transition-[width] duration-100" style={{ width: `${rest.total ? (rest.remaining / rest.total) * 100 : 0}%` }} /></div>
            </div>
            <button onClick={() => rest.add(15)} className="tap rounded-xl bg-white/15 px-3 py-2 text-sm font-bold">+15s</button>
            <button onClick={rest.stop} className="tap rounded-xl bg-white/15 px-3 py-2 text-sm font-bold">Skip</button>
          </div>
        </div>
      ) : null}

      {tabataRow && (
        <TabataOverlay
          title={rowName(tabataRow, data.customExercises)}
          sound={data.profile.soundOn}
          onClose={() => setTabataRow(null)}
          onDone={() => { logSet(tabataRow, tabataRow.weight, ""); setTabataRow(null); if (session.mode === "guided45" && phase?.kind === "tabata" && phaseIdx < plan.length - 1) setPhaseIdx((i) => i + 1); }}
        />
      )}

      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={addExtra} />

      <FinishSheet open={finishing} onClose={() => setFinishing(false)} session={session} elapsed={elapsed} unit={data.profile.unit} onFinish={finish} pastSessions={data.sessions} />

      <Sheet open={discard} onClose={() => setDiscard(false)} title="Discard this workout?">
        <p className="text-sm text-ink-soft">Nothing from this session will be saved.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setDiscard(false)}>Keep going</Button>
          <Button variant="danger" onClick={() => { saveActiveSession(null); nav("/"); }}>Discard</Button>
        </div>
      </Sheet>
    </div>
  );
}

function StationCard({ row, round, session, custom, unit, lastWeight, best, onLog, onRemove }: {
  row: ProgramRow; round: number; session: WorkoutSession; custom: Exercise[]; unit: string; lastWeight?: string; best: SetEntry | null;
  onLog: (w: string, r: string) => void; onRemove: (id: string) => void;
}) {
  const ex = findExercise(row.exerciseId, custom);
  const [weight, setWeight] = useState(lastWeight ?? row.weight ?? "");
  const [reps, setReps] = useState(row.reps && parseReps(row.reps) != null ? String(parseReps(row.reps)) : row.reps || "10");
  const mine = session.entries.filter((e) => e.rowId === row.id);
  const thisRound = mine.filter((e) => e.round === round);
  const n = stationNumber(row);
  const bump = (d: number) => setWeight((w) => { const v = parseWeight(w); return v == null ? String(Math.max(0, d)) : String(Math.max(0, Math.round((v + d) * 2) / 2)); });
  const bumpReps = (d: number) => setReps((r) => String(Math.max(0, (parseInt(r, 10) || 0) + d)));

  return (
    <Card className={cn("p-3", thisRound.length > 0 && "border-2 border-teal-100", isAll(row) && "bg-teal-50")}>
      <div className="flex items-start gap-3">
        <Link href={`/library/${row.exerciseId}`}><ExerciseImage exercise={ex} size="md" /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><SlotBadge row={row} />{n && <span className="text-[10px] font-bold uppercase tracking-widest text-ink-mute">Station {n}</span>}</div>
          <div className="mt-1 text-[15px] font-bold leading-tight">{rowName(row, custom)}</div>
          <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold text-ink-soft">
            {row.weight && <span className="rounded-md bg-sand px-1.5 py-0.5">{row.weight}{row.sets ? ` ${row.sets}` : ""}</span>}
            {row.reps && <span className="rounded-md bg-sand px-1.5 py-0.5">{row.reps} reps</span>}
            {row.rest && <span className="rounded-md bg-sand px-1.5 py-0.5">{row.rest}</span>}
            {best?.weight != null && <span className="rounded-md bg-teal-100 px-1.5 py-0.5 text-teal-900">PB {best.weight}{unit}</span>}
          </div>
        </div>
      </div>

      {ex?.cues?.[0] && <div className="mt-2 text-xs italic text-ink-mute">“{ex.cues[0]}”</div>}

      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-ink-mute">Weight ({unit})</div>
          <div className="flex items-stretch overflow-hidden rounded-xl border-2 border-sand bg-white">
            <button onClick={() => bump(-2.5)} className="tap px-2.5 text-lg font-bold text-ink-soft">−</button>
            <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className="w-full min-w-0 py-2 text-center text-lg font-bold outline-none" />
            <button onClick={() => bump(2.5)} className="tap px-2.5 text-lg font-bold text-teal-700">+</button>
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-ink-mute">Reps</div>
          <div className="flex items-stretch overflow-hidden rounded-xl border-2 border-sand bg-white">
            <button onClick={() => bumpReps(-1)} className="tap px-2.5 text-lg font-bold text-ink-soft">−</button>
            <input value={reps} onChange={(e) => setReps(e.target.value)} inputMode="numeric" className="w-full min-w-0 py-2 text-center text-lg font-bold outline-none" />
            <button onClick={() => bumpReps(1)} className="tap px-2.5 text-lg font-bold text-teal-700">+</button>
          </div>
        </div>
        <div className="flex items-end">
          <Button onClick={() => onLog(weight, reps)} className="h-[46px] px-4">✓ Log</Button>
        </div>
      </div>

      {mine.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mine.map((e) => (
            <button key={e.id} onClick={() => onRemove(e.id)} title="Tap to remove" className={cn("tap rounded-full px-2.5 py-1 text-[11px] font-bold", e.round === round ? "bg-teal-700 text-white" : "bg-sand text-ink-soft")}>
              R{e.round} · {e.weightText || "–"}{e.weight != null ? unit : ""} × {e.repsText || "–"}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function FinishSheet({ open, onClose, session, elapsed, unit, onFinish, pastSessions }: { open: boolean; onClose: () => void; session: WorkoutSession; elapsed: number; unit: string; onFinish: (f: WorkoutSession["feeling"], notes: string) => void; pastSessions: WorkoutSession[] }) {
  const [feeling, setFeeling] = useState<WorkoutSession["feeling"]>(4);
  const [notes, setNotes] = useState("");
  const volume = sessionVolume(session);
  const pbs = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const e of session.entries) {
      if (e.weight == null || seen.has(e.exerciseId)) continue;
      const prior = bestWeightFor(pastSessions.filter((s) => s.id !== session.id), e.exerciseId);
      const top = Math.max(...session.entries.filter((x) => x.exerciseId === e.exerciseId).map((x) => x.weight ?? 0));
      if (prior?.weight == null || top > prior.weight) { if (prior?.weight != null || top > 0) out.push(`${e.exerciseName} — ${top}${unit}`); }
      seen.add(e.exerciseId);
    }
    return out;
  }, [session, pastSessions, unit]);
  const faces: Array<[WorkoutSession["feeling"], string, string]> = [[1, "😮‍💨", "Rough"], [2, "😐", "Meh"], [3, "🙂", "OK"], [4, "😄", "Good"], [5, "🔥", "On fire"]];
  return (
    <Sheet open={open} onClose={onClose} title="Finish workout">
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center"><div className="display text-[26px] text-teal-700">{formatClock(elapsed)}</div><div className="text-[10px] font-bold uppercase text-ink-mute">Time</div></div>
        <div className="card p-3 text-center"><div className="display text-[26px]">{session.entries.length}</div><div className="text-[10px] font-bold uppercase text-ink-mute">Sets</div></div>
        <div className="card p-3 text-center"><div className="display text-[26px] text-coral-500">{Math.round(volume)}</div><div className="text-[10px] font-bold uppercase text-ink-mute">{unit} lifted</div></div>
      </div>
      {pbs.length > 0 && (
        <div className="mt-3 rounded-2xl bg-mustard-100 p-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#7a5a00]">🏆 New personal bests</div>
          <ul className="mt-1 text-sm font-semibold">{pbs.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      <div className="mt-4">
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-soft">How did it feel?</div>
        <div className="flex justify-between gap-1">
          {faces.map(([v, f, l]) => (
            <button key={v} onClick={() => setFeeling(v)} className={cn("tap flex flex-1 flex-col items-center rounded-2xl py-2", feeling === v ? "bg-teal-700 text-white" : "bg-white shadow-card")}>
              <span className="text-2xl">{f}</span><span className="text-[10px] font-bold">{l}</span>
            </button>
          ))}
        </div>
      </div>
      <Field label="Notes"><textarea className={inputCls + " mt-0"} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Felt strong on the deadlift. Shoulder a bit niggly." /></Field>
      <Button full variant="coral" size="lg" className="mt-4" onClick={() => onFinish(feeling, notes)}>Save workout</Button>
      {session.entries.length === 0 && <p className="mt-2 text-center text-xs text-ink-mute">You haven't logged any sets yet — that's fine, it still counts as showing up.</p>}
    </Sheet>
  );
}
