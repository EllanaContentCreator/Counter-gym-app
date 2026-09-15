import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAppData, actions, uid } from "@/lib/store";
import { savePhoto } from "@/lib/photos";
import { fromDateInput, sheetDayLabel, toDateInput, weekStart, programsThisWeek } from "@/lib/utils";
import type { Program } from "@/lib/types";
import { Button, Field, Sheet, inputCls } from "./ui";
import { PhotoPickButtons } from "./SheetPhotos";
import { IconCheck, IconClose } from "./Icons";

interface Picked { file: File; url: string }

/**
 * "Add this week's sheet": photo(s) of Carolyn's sheet → a new numbered program with the photo
 * attached, dated to the training day, then straight into edit mode to type the rows in.
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
    }
  }, [open]); // eslint-disable-line

  const onDate = (v: string) => {
    setDate(v);
    const ts = fromDateInput(v);
    if (ts && !dayTouched) setDay(sheetDayLabel(ts));
  };
  const addFiles = (files: File[]) => setPicked((cur) => [...cur, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  const remove = (i: number) => setPicked((cur) => { URL.revokeObjectURL(cur[i].url); return cur.filter((_, j) => j !== i); });

  const create = async () => {
    setBusy(true);
    try {
      const photoIds: string[] = [];
      for (const p of picked) photoIds.push((await savePhoto(p.file)).id);
      const ts = fromDateInput(date) ?? Date.now();
      const program: Program = {
        id: uid(),
        number: nextNumber,
        name: name.trim() || `Program #${nextNumber.toString().padStart(2, "0")}`,
        dayLabel: day.trim() || sheetDayLabel(ts),
        date: ts,
        photoIds,
        rows: [],
        source: "custom",
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      actions.upsertProgram(program);
      onClose();
      nav(`/programs/${program.id}/edit`);
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
          <PhotoPickButtons onFiles={addFiles} busy={busy} />
          <p className="mt-1.5 text-[11px] text-ink-mute">Take a photo of the paper sheet, or add the screenshot from Carolyn's message. You can add more than one.</p>
        </div>

        <div>
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">2 · When</div>
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
          <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">3 · Name (optional)</div>
          <Field label="Sheet name" hint="Leave blank to number it automatically">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Program #${nextNumber.toString().padStart(2, "0")}`} />
          </Field>
          <Field label="Notes">
            <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Hex bar day. Two tabatas to finish." />
          </Field>
        </div>

        <Button full size="lg" variant="coral" onClick={create} disabled={busy}>
          {busy ? "Saving…" : picked.length ? "Save sheet & type the exercises" : "Create sheet without a photo"}
        </Button>
        <p className="text-center text-[11px] text-ink-mute">Next you'll add each row exactly as it appears on the sheet, with the photo right there to read from.</p>
      </div>
    </Sheet>
  );
}
