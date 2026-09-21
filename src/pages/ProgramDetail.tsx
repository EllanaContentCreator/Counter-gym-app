import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useAppData, actions, uid } from "@/lib/store";
import { cn, findExercise, isAll, isTabata, isSuperset, rowName, stationNumber, formatDate, historyFor, toDateInput, fromDateInput, sheetDayLabel } from "@/lib/utils";
import { Header, TimerButton } from "@/components/Header";
import { Button, Card, Field, Pill, Sheet, inputCls } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";
import { ExercisePicker } from "@/components/ExercisePicker";
import { SheetPhotos } from "@/components/SheetPhotos";
import { IconBack, IconCopy, IconEdit, IconNext, IconPlay, IconTimer } from "@/components/Icons";
import { startSession } from "@/lib/session";
import type { Exercise, Program, ProgramRow } from "@/lib/types";

const SLOTS = ["1", "1+", "2", "2+", "3", "3+", "4", "4+", "ALL", "TABATA"];

export function stationClass(n: number | null) {
  return n == null ? "station-x" : n >= 1 && n <= 4 ? `station-${n}` : "station-x";
}

export function SlotBadge({ row }: { row: ProgramRow }) {
  if (isTabata(row)) return <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-mustard-300 shadow-sm">Tabata</span>;
  if (isAll(row)) return <span className="rounded-md grad-teal px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-sm">All</span>;
  const n = stationNumber(row);
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className={cn("grid h-6 w-6 place-items-center rounded-lg text-[12px] font-extrabold text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.15)]", stationClass(n))}>{n ?? row.slot}</span>
      {isSuperset(row) ? <span className="text-sm font-black text-coral-600">+</span> : <span className="text-ink-mute">.</span>}
    </span>
  );
}

export function SheetTable({ program, custom, onEdit, editing }: { program: Program; custom: Exercise[]; onEdit?: (r: ProgramRow) => void; editing?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-card">
      <div className="grid grid-cols-[1fr_54px_54px_54px_54px] grad-teal px-2 py-2.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
        <div className="px-1">Exercise</div>
        <div className="text-center">Weight</div>
        <div className="text-center">Sets</div>
        <div className="text-center">Reps</div>
        <div className="text-center">Rest</div>
      </div>
      {program.rows.length === 0 && <div className="p-6 text-center text-sm text-ink-soft">No exercises yet. Tap "Add new exercise" below.</div>}
      {program.rows.map((r) => {
        const tab = isTabata(r);
        const all = isAll(r);
        const ex = findExercise(r.exerciseId, custom);
        return (
          <div
            key={r.id}
            onClick={onEdit ? () => onEdit(r) : undefined}
            className={cn(
              "grid grid-cols-[1fr_54px_54px_54px_54px] items-center border-t border-[#e9d5ff] text-[13px]",
              tab ? "tabata-row" : all ? "all-row" : "bg-white",
              onEdit && "tap cursor-pointer"
            )}
          >
            <div className="flex items-center gap-2 px-2 py-2.5">
              {!tab && !all && <SlotBadge row={r} />}
              {(tab || all) && <SlotBadge row={r} />}
              {!editing && ex ? (
                <Link href={`/library/${ex.id}`} className="leading-tight">{rowName(r, custom)}</Link>
              ) : (
                <span className="leading-tight">{rowName(r, custom)}</span>
              )}
            </div>
            <div className={cn("self-stretch py-2.5 text-center font-bold", !tab && !all && "bg-[#f5f3ff]")}>{r.weight}</div>
            <div className="self-stretch py-2.5 text-center leading-tight">{r.sets}</div>
            <div className={cn("self-stretch py-2.5 text-center font-bold leading-tight", !tab && !all && "bg-[#f5f3ff]")}>{r.reps}</div>
            <div className="self-stretch py-2.5 text-center leading-tight">{r.rest}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function ProgramDetail() {
  const { id, edit } = useParams<{ id: string; edit?: string }>();
  const data = useAppData();
  const [, nav] = useLocation();
  const program = data.programs.find((p) => p.id === id);
  const [editing, setEditing] = useState(edit === "edit");
  const [row, setRow] = useState<ProgramRow | null>(null);
  const [picking, setPicking] = useState(false);
  const [meta, setMeta] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<Program | null>(null);
  useEffect(() => setDraft(program ? { ...program, rows: program.rows.map((r) => ({ ...r })) } : null), [program?.id, editing]); // eslint-disable-line

  const ordered = useMemo(() => [...data.programs].sort((a, b) => a.number - b.number), [data.programs]);
  const idx = ordered.findIndex((p) => p.id === id);
  const prev = ordered[idx - 1];
  const next = ordered[idx + 1];

  if (!program || !draft) {
    return (
      <div className="p-8 text-center">
        <p>Program not found.</p>
        <Link href="/programs" className="font-bold text-teal-700">Back</Link>
      </div>
    );
  }

  const working = editing ? draft : program;
  const lastSessions = data.sessions.filter((s) => s.finishedAt && s.programId === program.id).sort((a, b) => b.startedAt - a.startedAt);

  const saveRow = (r: ProgramRow) => {
    setDraft((d) => {
      if (!d) return d;
      const exists = d.rows.some((x) => x.id === r.id);
      return { ...d, rows: exists ? d.rows.map((x) => (x.id === r.id ? r : x)) : [...d.rows, r] };
    });
    setRow(null);
  };
  const removeRow = (rid: string) => {
    setDraft((d) => (d ? { ...d, rows: d.rows.filter((x) => x.id !== rid) } : d));
    setRow(null);
  };
  const move = (rid: string, dir: -1 | 1) => {
    setDraft((d) => {
      if (!d) return d;
      const i = d.rows.findIndex((x) => x.id === rid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.rows.length) return d;
      const rows = [...d.rows];
      [rows[i], rows[j]] = [rows[j], rows[i]];
      return { ...d, rows };
    });
  };
  const save = () => {
    actions.upsertProgram({ ...draft, updatedAt: Date.now() });
    setEditing(false);
  };
  const begin = (mode: "free" | "guided45") => {
    startSession(program, mode);
    nav("/workout");
  };
  const pick = (e: Exercise) => {
    setPicking(false);
    const last = draft.rows[draft.rows.length - 1];
    const nextSlot = (() => {
      if (!last) return "1";
      if (isTabata(last)) return "TABATA";
      const n = stationNumber(last);
      return n ? (n >= 4 ? "TABATA" : String(n + 1)) : "1";
    })();
    setRow({ id: uid(), exerciseId: e.id, slot: nextSlot, weight: data.lastWeights[e.id] ?? (e.noWeight ? "0" : ""), sets: "", reps: e.category === "tabata" ? "" : "10", rest: "" });
  };

  return (
    <div className="safe-bottom">
      <Header
        title={program.name}
        back="/programs"
        sub={<span>{data.profile.name ? `${data.profile.name.toUpperCase()} : ` : ""}{program.dayLabel.toUpperCase()}</span>}
        right={editing ? <Button size="sm" onClick={save}>Save</Button> : <TimerButton />}
      />
      <div className="space-y-4 px-4 pt-1">
        {!editing && (
          <div className="flex items-center justify-between">
            <Link href={prev ? `/programs/${prev.id}` : "#"} className={cn("tap grid h-11 w-14 place-items-center rounded-xl border-2 border-teal-100 bg-white text-teal-700", !prev && "opacity-30")}><IconBack size={20} /></Link>
            <div className="text-center text-[11px] font-bold uppercase tracking-widest text-ink-mute">
              {program.source === "carolyn" ? "Carolyn's sheet" : "Your sheet"}
              {lastSessions[0] && <div className="text-teal-700">Last done {formatDate(lastSessions[0].startedAt)}</div>}
            </div>
            <Link href={next ? `/programs/${next.id}` : "#"} className={cn("tap grid h-11 w-14 place-items-center rounded-xl border-2 border-teal-100 bg-white text-teal-700", !next && "opacity-30")}><IconNext size={20} /></Link>
          </div>
        )}

        {program.notes && !editing && <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900">{program.notes}</p>}

        <SheetTable program={working} custom={data.customExercises} editing={editing} onEdit={editing ? (r) => setRow(r) : undefined} />

        {editing ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setPicking(true)}>＋ Add new exercise</Button>
              <Button variant="secondary" onClick={() => setMeta(true)}>✎ Name & notes</Button>
            </div>
            <Button full onClick={save}>Save sheet</Button>
            <Button full variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            {program.source === "carolyn" && (
              <Button full variant="ghost" onClick={() => { actions.resetCarolynProgram(program.id); setEditing(false); }}>Reset to Carolyn's original</Button>
            )}
            <Button full variant="danger" onClick={() => setConfirmDelete(true)}>Delete this workout</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="coral" size="lg" onClick={() => begin("guided45")}><IconTimer size={18} /> 45-min guided</Button>
              <Button size="lg" onClick={() => begin("free")}><IconPlay size={16} /> Start & log</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}><IconEdit size={16} /> Edit sheet</Button>
              <Button variant="secondary" onClick={() => { const nid = actions.duplicateProgram(program.id); if (nid) nav(`/programs/${nid}/edit`); }}><IconCopy size={16} /> Duplicate</Button>
            </div>
            {/* Already done this one? Write it up against the day it happened. */}
            <Button full variant="ghost" onClick={() => nav(`/log-past?program=${program.id}`)}>
              📅 I've already done this — log it
            </Button>
          </div>
        )}

        {!editing && lastSessions.length > 0 && (
          <div>
            <h3 className="display mb-2 text-[20px]">Your numbers on this sheet</h3>
            <div className="space-y-2">
              {program.rows.map((r) => {
                const h = historyFor(data.sessions, r.exerciseId);
                if (!h.length) return null;
                const last = h[h.length - 1];
                const best = Math.max(...h.map((x) => x.top));
                return (
                  <Link key={r.id} href={`/library/${r.exerciseId}`} className="card tap flex items-center justify-between p-3 text-sm">
                    <span className="min-w-0 truncate pr-2 font-semibold">{rowName(r, data.customExercises)}</span>
                    <span className="shrink-0 text-xs text-ink-soft">
                      last <b className="text-ink">{last.top}{data.profile.unit}</b> · best <b className="text-teal-700">{best}{data.profile.unit}</b>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/*
         * The exercises are what you come to this page for, so the photo of the
         * original sheet sits underneath them rather than in front of them —
         * while editing too, where the rows are what you're working on.
         */}
        {(program.photoIds?.length || editing) ? (
          <div className={cn("pt-1", editing && "card p-3")}>
            <div className="mb-1 flex items-center justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-ink-mute">
                {editing ? "Carolyn's sheet photo" : "Carolyn's sheet"}
              </div>
              {editing && program.photoIds?.length ? <span className="text-[11px] font-semibold text-ink-soft">Tap to zoom while you type</span> : null}
            </div>
            <SheetPhotos program={program} editing={editing} />
          </div>
        ) : null}
      </div>

      <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={pick} />

      <Sheet open={!!row} onClose={() => setRow(null)} title="Exercise row">
        {row && <RowEditor row={row} custom={data.customExercises} onSave={saveRow} onDelete={() => removeRow(row.id)} onMove={(d) => move(row.id, d)} onChangeExercise={() => { setPicking(true); }} />}
      </Sheet>

      <Sheet open={meta} onClose={() => setMeta(false)} title="Sheet details">
        <div className="space-y-4">
          <Field label="Name"><input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="Day / date label"><input className={inputCls} value={draft.dayLabel} onChange={(e) => setDraft({ ...draft, dayLabel: e.target.value })} placeholder="Thur 10 Sept" /></Field>
          <Field label="Training day" hint="Used to file the sheet under the right week">
            <input type="date" className={inputCls} value={toDateInput(draft.date ?? draft.createdAt)} onChange={(e) => { const ts = fromDateInput(e.target.value); if (ts) setDraft({ ...draft, date: ts, dayLabel: draft.dayLabel || sheetDayLabel(ts) }); }} />
          </Field>
          <Field label="Number"><input type="number" className={inputCls} value={draft.number} onChange={(e) => setDraft({ ...draft, number: parseInt(e.target.value || "0", 10) })} /></Field>
          <Field label="Notes"><textarea className={inputCls} rows={3} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          <Button full onClick={() => setMeta(false)}>Done</Button>
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete workout?">
        <p className="text-sm text-ink-soft">This removes the sheet. Your logged history stays.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Keep it</Button>
          <Button variant="danger" onClick={() => { actions.deleteProgram(program.id); nav("/programs"); }}>Delete</Button>
        </div>
      </Sheet>
    </div>
  );
}

function RowEditor({ row, custom, onSave, onDelete, onMove, onChangeExercise }: { row: ProgramRow; custom: Exercise[]; onSave: (r: ProgramRow) => void; onDelete: () => void; onMove: (d: -1 | 1) => void; onChangeExercise: () => void }) {
  const [r, setR] = useState(row);
  useEffect(() => setR(row), [row]);
  const ex = findExercise(r.exerciseId, custom);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ExerciseImage exercise={ex} size="md" />
        <div className="min-w-0 flex-1">
          <div className="font-bold leading-tight">{ex?.name ?? "Unknown exercise"}</div>
          <button onClick={onChangeExercise} className="text-xs font-bold text-teal-700">Change exercise</button>
        </div>
      </div>
      <Field label="Slot on the sheet">
        <div className="flex flex-wrap gap-1.5">
          {SLOTS.map((s) => (
            <button key={s} onClick={() => setR({ ...r, slot: s })} className={cn("tap rounded-lg px-3 py-1.5 text-sm font-bold text-white", r.slot === s ? (s === "TABATA" ? "bg-ink text-mustard-300" : s === "ALL" ? "grad-teal" : stationClass(parseInt(s, 10))) : "bg-white shadow-card !text-ink-soft")}>
              {s}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Display name (optional)" hint="Use this for Carolyn-style notes, e.g. 'Cable Highest Hole'">
        <input className={inputCls} value={r.label ?? ""} onChange={(e) => setR({ ...r, label: e.target.value })} placeholder={ex?.name} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight"><input className={inputCls} value={r.weight} onChange={(e) => setR({ ...r, weight: e.target.value })} placeholder="39+2" /></Field>
        <Field label="Sets"><input className={inputCls} value={r.sets} onChange={(e) => setR({ ...r, sets: e.target.value })} placeholder="each side" /></Field>
        <Field label="Reps"><input className={inputCls} value={r.reps} onChange={(e) => setR({ ...r, reps: e.target.value })} placeholder="10+10" /></Field>
        <Field label="Rest / note"><input className={inputCls} value={r.rest} onChange={(e) => setR({ ...r, rest: e.target.value })} placeholder="big plate" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => onMove(-1)}>↑ Move up</Button>
        <Button variant="secondary" onClick={() => onMove(1)}>↓ Move down</Button>
      </div>
      <Button full onClick={() => onSave(r)}>Save row</Button>
      <Button full variant="danger" onClick={onDelete}>Remove from sheet</Button>
    </div>
  );
}
