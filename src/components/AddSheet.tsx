import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAppData, actions, uid } from "@/lib/store";
import { savePhoto } from "@/lib/photos";
import { fromDateInput, sheetDayLabel, toDateInput, weekStart, programsThisWeek, cn } from "@/lib/utils";
import { matchRows, scanSheet, type MatchedRow, type ScannedSheet } from "@/lib/scan";
import type { Exercise, Program } from "@/lib/types";
import { Button, Field, Sheet, inputCls } from "./ui";
import { ExerciseImage } from "./ExerciseImage";
import { ExercisePicker } from "./ExercisePicker";
import { PhotoPickButtons } from "./SheetPhotos";
import { SlotBadge } from "@/pages/ProgramDetail";
import { IconCheck, IconClose, IconSpark, IconTrash } from "./Icons";

interface Picked { file: File; url: string }

/**
 * "Add this week's sheet": photo(s) of Carolyn's sheet → optionally read by the sheet reader →
 * a new numbered program with the photo attached, dated to the training day.
 */
export function AddSheetFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useAppData();
  const [, nav] = useLocation();
  const nextNumber = Math.max(0, ...data.programs.map((p) => p.number)) + 1;
  const [picked, setPicked] = useState<Picked[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => toDateInput(Date.now()));
  const [day, setDay] = useState(() => sheetDayLabel(Date.now()));
  const [dayTouched, setDayTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState("");
  const [scanned, setScanned] = useState<ScannedSheet | null>(null);
  const [matched, setMatched] = useState<MatchedRow[]>([]);

  const thisWeek = useMemo(() => programsThisWeek(data.programs), [data.programs]);
  const goal = data.profile.weeklyGoal;

  useEffect(() => {
    if (!open) {
      picked.forEach((p) => URL.revokeObjectURL(p.url));
      setPicked([]);
      setName("");
      setNotes("");
      setDate(toDateInput(Date.now()));
      setDay(sheetDayLabel(Date.now()));
      setDayTouched(false);
      setScanned(null);
      setMatched([]);
      setReadError("");
      setReading(false);
    }
  }, [open]); // eslint-disable-line

  const onDate = (v: string) => {
    setDate(v);
    const ts = fromDateInput(v);
    if (ts && !dayTouched) setDay(sheetDayLabel(ts));
  };
  const addFiles = (files: File[]) => {
    setReadError("");
    setPicked((cur) => [...cur, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };
  const remove = (i: number) => setPicked((cur) => { URL.revokeObjectURL(cur[i].url); return cur.filter((_, j) => j !== i); });

  const read = async () => {
    if (!picked.length) return;
    setReading(true);
    setReadError("");
    try {
      const sheet = await scanSheet(picked[0].file, { endpoint: data.profile.readerUrl, passcode: data.profile.readerPasscode });
      setScanned(sheet);
      setMatched(matchRows(sheet.rows, data.customExercises));
      if (sheet.dayLabel && !dayTouched) setDay(sheet.dayLabel);
      if (sheet.notes && !notes) setNotes(sheet.notes);
      if (sheet.title && !name) setName(sheet.title);
    } catch (e) {
      setReadError(e instanceof Error ? e.message : "The reader failed.");
    } finally {
      setReading(false);
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      const photoIds: string[] = [];
      for (const p of picked) photoIds.push((await savePhoto(p.file)).id);
      // Any exercise the reader found that isn't in the library yet joins it as a custom exercise.
      for (const m of matched) if (m.isNew) actions.addCustomExercise(m.exercise);
      const ts = fromDateInput(date) ?? Date.now();
      const program: Program = {
        id: uid(),
        number: nextNumber,
        name: name.trim() || `Program #${nextNumber.toString().padStart(2, "0")}`,
        dayLabel: day.trim() || sheetDayLabel(ts),
        date: ts,
        photoIds,
        rows: matched.map((m) => m.row),
        source: "custom",
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      actions.upsertProgram(program);
      onClose();
      nav(matched.length ? `/programs/${program.id}` : `/programs/${program.id}/edit`);
    } finally {
      setBusy(false);
    }
  };

  const inThisWeek = fromDateInput(date) != null && weekStart(fromDateInput(date)!) === weekStart();

  return (
    <Sheet open={open} onClose={onClose} title="Add this week's sheet" tall>
      <div className="space-y-5">
        <div className="rounded-2xl grad-teal-deep dots p-4 text-white">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-white/70">This week</div>
          <div className="mt-1 flex items-center justify-between">
            <div className="display text-[26px] leading-none">{thisWeek.length} of {goal} sheets in</div>
            <div className="flex gap-1.5">
              {Array.from({ length: Math.max(goal, thisWeek.length) }).map((_, i) => (
                <span key={i} className={`grid h-7 w-7 place-items-center rounded-full ${i < thisWeek.length ? "bg-white text-teal-800" : "border-2 border-white/40 text-white/60"}`}>
                  {i < thisWeek.length ? <IconCheck size={14} /> : <span className="text-xs font-extrabold">{i + 1}</span>}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-white/80">Carolyn hands out two sheets a week. Photograph each one and it lives here, next to your numbers.</p>
        </div>

        <div>
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">1 · The sheet</div>
          {picked.length > 0 && (
            <div className="scroll-x -mx-5 mb-2 flex gap-2 px-5">
              {picked.map((p, i) => (
                <div key={p.url} className="relative shrink-0">
                  <img src={p.url} alt="" className="h-40 w-[130px] rounded-2xl object-cover shadow-card" />
                  <button type="button" onClick={() => remove(i)} aria-label="Remove" className="tap absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-coral-500 text-white shadow-md"><IconClose size={16} /></button>
                </div>
              ))}
            </div>
          )}
          <PhotoPickButtons onFiles={addFiles} busy={busy || reading} />
          <p className="mt-1.5 text-[11px] text-ink-mute">Take a photo of the paper sheet, or add the screenshot from Carolyn's message. You can add more than one.</p>
        </div>

        {picked.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">2 · The exercises</div>
            {!scanned ? (
              <>
                <Button full size="lg" variant="mustard" onClick={read} disabled={reading}>
                  <IconSpark size={18} /> {reading ? "Reading the sheet…" : "Read the sheet for me"}
                </Button>
                <p className="mt-1.5 text-[11px] text-ink-mute">
                  {reading ? "This takes about 20 seconds." : "Reads the rows off the photo so you don't have to type them. You can check every row before it saves."}
                </p>
                {readError && (
                  <div className="mt-2 rounded-xl bg-coral-100 px-3 py-2 text-[13px] font-semibold text-coral-700">
                    {readError}
                  </div>
                )}
              </>
            ) : (
              <ReadRows
                sheet={scanned}
                matched={matched}
                onRemove={(i) => setMatched((m) => m.filter((_, j) => j !== i))}
                onRepick={(i, ex) =>
                  setMatched((m) =>
                    m.map((row, j) =>
                      j === i
                        ? { ...row, exercise: ex, isNew: false, confidence: 1, row: { ...row.row, exerciseId: ex.id, label: row.readName } }
                        : row,
                    ),
                  )
                }
                onRedo={() => { setScanned(null); setMatched([]); }}
              />
            )}
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">3 · When</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Training day">
              <input type="date" className={inputCls} value={date} onChange={(e) => onDate(e.target.value)} />
            </Field>
            <Field label="Label on the sheet">
              <input className={inputCls} value={day} onChange={(e) => { setDay(e.target.value); setDayTouched(true); }} placeholder="Tues 15 Sept" />
            </Field>
          </div>
          {!inThisWeek && <p className="mt-1.5 text-[11px] font-semibold text-coral-600">That date is outside this week — it'll be filed under its own week.</p>}
        </div>

        <div>
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">4 · Name (optional)</div>
          <Field label="Sheet name" hint="Leave blank to number it automatically">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Program #${nextNumber.toString().padStart(2, "0")}`} />
          </Field>
          <Field label="Notes">
            <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Hex bar day. Two tabatas to finish." />
          </Field>
        </div>

        <Button full size="lg" variant="coral" onClick={create} disabled={busy || reading}>
          {busy ? "Saving…" : matched.length ? `Save sheet with ${matched.length} exercise${matched.length === 1 ? "" : "s"}` : picked.length ? "Save sheet & type the exercises" : "Create sheet without a photo"}
        </Button>
        <p className="text-center text-[11px] text-ink-mute">
          {matched.length ? "You can edit any row afterwards — the photo stays attached." : "Next you'll add each row exactly as it appears on the sheet, with the photo right there to read from."}
        </p>
      </div>
    </Sheet>
  );
}

function ReadRows({
  sheet,
  matched,
  onRemove,
  onRepick,
  onRedo,
}: {
  sheet: ScannedSheet;
  matched: MatchedRow[];
  onRemove: (i: number) => void;
  onRepick: (i: number, exercise: Exercise) => void;
  onRedo: () => void;
}) {
  const newCount = matched.filter((m) => m.isNew).length;
  // Which row is having its exercise changed, if any.
  const [picking, setPicking] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      <div className={cn("rounded-xl px-3 py-2 text-[12px] font-semibold", sheet.confidence === "low" ? "bg-coral-100 text-coral-700" : "bg-lime-100 text-[#3f6f18]")}>
        {sheet.confidence === "low"
          ? "The photo was hard to read — check every row carefully before saving."
          : `Read ${matched.length} row${matched.length === 1 ? "" : "s"}${sheet.personName ? ` from ${sheet.personName}'s sheet` : ""}. Check them, then save.`}
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-card">
        {matched.map((m, i) => (
          <div key={m.row.id} className="flex items-start gap-2 border-t border-sand px-2.5 py-2 first:border-t-0">
            <div className="pt-0.5"><SlotBadge row={m.row} /></div>
            <ExerciseImage exercise={m.exercise} size="sm" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold leading-tight">{m.row.label || m.exercise.name}</div>
              {/* When her wording differs from the library's, say which exercise it was matched to. */}
              {m.row.label && (
                <div className="mt-0.5 text-[11px] font-semibold leading-tight text-ink-soft">
                  {m.isNew ? "New exercise" : `Matched to ${m.exercise.name}`}
                </div>
              )}
              <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] font-bold uppercase tracking-wide text-ink-mute">
                {m.row.weight && <span className="rounded bg-sand px-1.5 py-0.5">{m.row.weight}</span>}
                {m.row.sets && <span className="rounded bg-sand px-1.5 py-0.5">{m.row.sets}</span>}
                {m.row.reps && <span className="rounded bg-sand px-1.5 py-0.5">{m.row.reps} reps</span>}
                {m.row.rest && <span className="rounded bg-sand px-1.5 py-0.5">{m.row.rest}</span>}
                {m.isNew && <span className="rounded bg-plum-100 px-1.5 py-0.5 text-plum-700">New exercise</span>}
              </div>
              <button type="button" onClick={() => setPicking(i)} className="tap mt-1 text-[11px] font-extrabold text-teal-700">
                {m.isNew ? "Use one of mine instead" : "Not this one — change"}
              </button>
            </div>
            <button type="button" onClick={() => onRemove(i)} aria-label="Remove row" className="tap mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sand text-ink-soft"><IconTrash size={14} /></button>
          </div>
        ))}
        {matched.length === 0 && <div className="p-4 text-center text-sm text-ink-soft">No rows left. Read it again, or save and type them in.</div>}
      </div>
      <div className="flex items-center justify-between text-[11px] text-ink-mute">
        <span>{newCount > 0 ? `${newCount} new exercise${newCount === 1 ? "" : "s"} will be added to your library.` : "All matched to exercises you already have."}</span>
        <button type="button" onClick={onRedo} className="font-bold text-teal-700">Read again</button>
      </div>

      <ExercisePicker
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={(ex) => {
          if (picking !== null) onRepick(picking, ex);
          setPicking(null);
        }}
      />
    </div>
  );
}
