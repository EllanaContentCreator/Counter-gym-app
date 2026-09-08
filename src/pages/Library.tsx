import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useAppData, actions } from "@/lib/store";
import { allExercises, bestWeightFor, cn } from "@/lib/utils";
import { Header, TimerButton } from "@/components/Header";
import { Button, Field, Sheet, inputCls } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";
import { FilterBar, useExerciseFilter } from "@/components/ExercisePicker";
import { EQUIPMENT, MUSCLE_LABELS } from "@/data/equipment";
import type { Exercise, EquipmentId, MuscleGroup } from "@/lib/types";

export default function Library() {
  const data = useAppData();
  const list = useMemo(() => allExercises(data.customExercises), [data.customExercises]);
  const f = useExerciseFilter(list);
  const [adding, setAdding] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const shown = favOnly ? f.filtered.filter((e) => data.favourites.includes(e.id)) : f.filtered;

  return (
    <div className="safe-bottom">
      <Header title="Exercises" sub={`${list.length} exercises · ${EQUIPMENT.length} types of equipment`} right={<TimerButton />} />
      <div className="space-y-3 px-4 pt-1">
        <FilterBar f={f} />
        <div className="flex gap-2">
          <button onClick={() => setFavOnly((v) => !v)} className={cn("tap rounded-full px-3 py-1.5 text-xs font-bold", favOnly ? "bg-mustard-500 text-ink" : "bg-white text-ink-soft shadow-card")}>★ Favourites</button>
          <button onClick={() => setAdding(true)} className="tap ml-auto rounded-full bg-teal-700 px-3 py-1.5 text-xs font-bold text-white">＋ Custom exercise</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {shown.map((e) => {
            const best = bestWeightFor(data.sessions, e.id);
            return (
              <Link key={e.id} href={`/library/${e.id}`} className="card tap overflow-hidden p-0">
                <ExerciseImage exercise={e} size="xl" className="rounded-none" />
                <div className="p-2.5">
                  <div className="line-clamp-2 text-[13px] font-bold leading-tight">{e.name}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-ink-mute">
                    <span className="truncate">{e.muscles.slice(0, 2).map((m) => MUSCLE_LABELS[m]).join(" · ")}</span>
                    {best?.weight != null && <span className="shrink-0 text-teal-700">PB {best.weight}{data.profile.unit}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {shown.length === 0 && <p className="py-8 text-center text-sm text-ink-soft">No exercises match.</p>}
      </div>
      <CustomExerciseSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

export function CustomExerciseSheet({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: Exercise }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [equip, setEquip] = useState<EquipmentId[]>(existing?.equipment ?? ["dumbbell"]);
  const [muscles, setMuscles] = useState<MuscleGroup[]>(existing?.muscles ?? ["full-body"]);
  const [cat, setCat] = useState<Exercise["category"]>(existing?.category ?? "strength");
  const [cues, setCues] = useState(existing?.cues.join("\n") ?? "");
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const save = () => {
    if (!name.trim()) return;
    const ex: Exercise = {
      id: existing?.id ?? `custom-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
      name: name.trim(),
      equipment: equip.length ? equip : ["bodyweight"],
      muscles: muscles.length ? muscles : ["full-body"],
      category: cat,
      cues: cues.split("\n").map((c) => c.trim()).filter(Boolean),
      noWeight: equip.length === 1 && equip[0] === "bodyweight",
      custom: true,
    };
    if (existing) actions.updateCustomExercise(ex);
    else actions.addCustomExercise(ex);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={existing ? "Edit exercise" : "Custom exercise"} tall>
      <div className="space-y-4">
        <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Landmine Press" /></Field>
        <Field label="Type">
          <div className="flex flex-wrap gap-1.5">
            {(["strength", "core", "tabata", "cardio", "mobility"] as const).map((c) => (
              <button key={c} onClick={() => setCat(c)} className={cn("tap rounded-lg px-3 py-1.5 text-sm font-bold capitalize", cat === c ? "bg-teal-700 text-white" : "bg-white shadow-card text-ink-soft")}>{c}</button>
            ))}
          </div>
        </Field>
        <Field label="Equipment">
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT.map((e) => (
              <button key={e.id} onClick={() => setEquip(toggle(equip, e.id))} className={cn("tap rounded-lg px-2.5 py-1.5 text-xs font-bold", equip.includes(e.id) ? "bg-coral-500 text-white" : "bg-white shadow-card text-ink-soft")}>{e.emoji} {e.name}</button>
            ))}
          </div>
        </Field>
        <Field label="Muscles">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((m) => (
              <button key={m} onClick={() => setMuscles(toggle(muscles, m))} className={cn("tap rounded-lg px-2.5 py-1.5 text-xs font-bold", muscles.includes(m) ? "bg-teal-700 text-white" : "bg-white shadow-card text-ink-soft")}>{MUSCLE_LABELS[m]}</button>
            ))}
          </div>
        </Field>
        <Field label="Coaching cues (one per line)"><textarea className={inputCls} rows={4} value={cues} onChange={(e) => setCues(e.target.value)} /></Field>
        <Button full onClick={save} disabled={!name.trim()}>Save exercise</Button>
      </div>
    </Sheet>
  );
}
