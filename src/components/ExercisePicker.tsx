import { useMemo, useState } from "react";
import type { Exercise, EquipmentId } from "@/lib/types";
import { EQUIPMENT } from "@/data/equipment";
import { allExercises, cn } from "@/lib/utils";
import { useAppData } from "@/lib/store";
import { ExerciseImage } from "./ExerciseImage";
import { Sheet, inputCls } from "./ui";

export function useExerciseFilter(list: Exercise[]) {
  const [q, setQ] = useState("");
  const [equip, setEquip] = useState<EquipmentId | "all">("all");
  const [cat, setCat] = useState<"all" | "strength" | "core" | "tabata" | "cardio" | "mobility">("all");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((e) => {
      if (equip !== "all" && !e.equipment.includes(equip)) return false;
      if (cat !== "all" && e.category !== cat) return false;
      if (needle && !e.name.toLowerCase().includes(needle) && !e.muscles.some((m) => m.includes(needle))) return false;
      return true;
    });
  }, [list, q, equip, cat]);
  return { q, setQ, equip, setEquip, cat, setCat, filtered };
}

export function FilterBar({ f }: { f: ReturnType<typeof useExerciseFilter> }) {
  const cats = [
    ["all", "All"], ["strength", "Strength"], ["core", "Core"], ["tabata", "Tabata"], ["cardio", "Cardio"], ["mobility", "Warm up / stretch"],
  ] as const;
  return (
    <div className="space-y-2">
      <input className={inputCls} value={f.q} onChange={(e) => f.setQ(e.target.value)} placeholder="Search exercises…" />
      <div className="scroll-x -mx-4 flex gap-2 px-4">
        {cats.map(([id, label]) => (
          <button key={id} onClick={() => f.setCat(id)} className={cn("tap shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", f.cat === id ? "bg-teal-700 text-white" : "bg-white text-ink-soft shadow-card")}>
            {label}
          </button>
        ))}
      </div>
      <div className="scroll-x -mx-4 flex gap-2 px-4">
        <button onClick={() => f.setEquip("all")} className={cn("tap shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", f.equip === "all" ? "bg-coral-500 text-white" : "bg-white text-ink-soft shadow-card")}>
          All equipment
        </button>
        {EQUIPMENT.map((e) => (
          <button key={e.id} onClick={() => f.setEquip(e.id)} className={cn("tap shrink-0 rounded-full px-3 py-1.5 text-xs font-bold", f.equip === e.id ? "bg-coral-500 text-white" : "bg-white text-ink-soft shadow-card")}>
            {e.emoji} {e.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void }) {
  const data = useAppData();
  const list = useMemo(() => allExercises(data.customExercises), [data.customExercises]);
  const f = useExerciseFilter(list);
  return (
    <Sheet open={open} onClose={onClose} title="Pick an exercise" tall>
      <FilterBar f={f} />
      <div className="mt-3 space-y-2">
        {f.filtered.map((e) => (
          <button key={e.id} onClick={() => onPick(e)} className="tap card flex w-full items-center gap-3 p-2 text-left">
            <ExerciseImage exercise={e} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{e.name}</div>
              <div className="truncate text-[11px] text-ink-mute">{e.equipment.map((q) => EQUIPMENT.find((x) => x.id === q)?.name).join(" · ")}</div>
            </div>
            <span className="text-teal-700">＋</span>
          </button>
        ))}
        {f.filtered.length === 0 && <div className="py-8 text-center text-sm text-ink-soft">Nothing matches. Try another word, or add it as a custom exercise in the library.</div>}
      </div>
    </Sheet>
  );
}
