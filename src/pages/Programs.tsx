import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAppData, actions, uid } from "@/lib/store";
import { programSummary, formatDate } from "@/lib/utils";
import { Header, TimerButton } from "@/components/Header";
import { Button, Card, Field, Pill, Sheet, inputCls } from "@/components/ui";
import type { Program } from "@/lib/types";

export default function Programs() {
  const data = useAppData();
  const [, nav] = useLocation();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const ordered = [...data.programs].sort((a, b) => a.number - b.number);
  const lastDone = (id: string) => [...data.sessions].filter((s) => s.finishedAt && s.programId === id).sort((a, b) => b.startedAt - a.startedAt)[0];

  const create = () => {
    const number = Math.max(0, ...data.programs.map((p) => p.number)) + 1;
    const p: Program = {
      id: uid(),
      number,
      name: name.trim() || `Program #${number.toString().padStart(2, "0")}`,
      dayLabel: day.trim(),
      rows: [],
      source: "custom",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    actions.upsertProgram(p);
    setCreating(false);
    nav(`/programs/${p.id}/edit`);
  };

  return (
    <div className="safe-bottom">
      <Header title="Programs" sub={`${ordered.length} workout sheets`} right={<TimerButton />} />
      <div className="space-y-3 px-4 pt-2">
        <Button full variant="coral" onClick={() => setCreating(true)}>＋ Add new workout</Button>
        {ordered.map((p) => {
          const s = programSummary(p);
          const last = lastDone(p.id);
          return (
            <Link key={p.id} href={`/programs/${p.id}`} className="card tap block p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="display text-[26px] leading-none">{p.name}</span>
                    {p.source === "carolyn" && <Pill tone="mustard">Carolyn</Pill>}
                  </div>
                  <div className="mt-1 text-sm text-ink-soft">{p.dayLabel || "No day set"}</div>
                </div>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
                  <span className="display text-2xl">{p.number.toString().padStart(2, "0")}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide text-ink-mute">
                <span>{s.stations} stations</span>
                <span>·</span>
                <span>{s.exercises} exercises</span>
                {s.tabatas > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-[#b58200]">{s.tabatas} tabata</span>
                  </>
                )}
                {last && (
                  <>
                    <span>·</span>
                    <span className="text-teal-700">Done {formatDate(last.startedAt)}</span>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <Sheet open={creating} onClose={() => setCreating(false)} title="New workout">
        <div className="space-y-4">
          <Field label="Name" hint="Leave blank to number it automatically">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Program #${(Math.max(0, ...data.programs.map((p) => p.number)) + 1).toString().padStart(2, "0")}`} />
          </Field>
          <Field label="Day / date label">
            <input className={inputCls} value={day} onChange={(e) => setDay(e.target.value)} placeholder="e.g. Tues 15 Sept" />
          </Field>
          <Button full onClick={create}>Create & add exercises</Button>
        </div>
      </Sheet>
    </div>
  );
}
