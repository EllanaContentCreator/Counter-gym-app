import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useAppData, actions } from "@/lib/store";
import { formatDate, formatClock, sessionVolume, findExercise } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Button, Card, Pill, Sheet } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";

const FACE = { 1: "😮‍💨 Rough", 2: "😐 Meh", 3: "🙂 OK", 4: "😄 Good", 5: "🔥 On fire" } as const;

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const data = useAppData();
  const [, nav] = useLocation();
  const s = data.sessions.find((x) => x.id === id);
  const [confirm, setConfirm] = useState(false);
  if (!s) return <div className="p-8 text-center">Session not found. <Link href="/progress" className="font-bold text-teal-700">Back</Link></div>;
  const groups = new Map<string, typeof s.entries>();
  for (const e of s.entries) groups.set(e.exerciseId, [...(groups.get(e.exerciseId) ?? []), e]);
  const unit = data.profile.unit;
  const share = async () => {
    const lines = [`${s.programName} — ${formatDate(s.startedAt)}`, `${formatClock(s.durationSec)} · ${s.entries.length} sets · ${Math.round(sessionVolume(s))}${unit} lifted`, ""];
    for (const [exId, list] of groups) lines.push(`${list[0].exerciseName}: ${list.map((e) => `${e.weightText || "-"}×${e.repsText || "-"}`).join(", ")}`);
    lines.push("", "Logged with Counter 💪");
    const text = lines.join("\n");
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); alert("Copied to clipboard"); } } catch { /* cancelled */ }
  };
  return (
    <div className="safe-bottom">
      <Header title={s.programName} back="/progress" sub={formatDate(s.startedAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
      <div className="space-y-4 px-4 pt-1">
        <div className="grid grid-cols-3 gap-2">
          <Card className="text-center"><div className="display text-[26px] text-teal-700">{formatClock(s.durationSec)}</div><div className="text-[10px] font-bold uppercase text-ink-mute">Time</div></Card>
          <Card className="text-center"><div className="display text-[26px]">{s.entries.length}</div><div className="text-[10px] font-bold uppercase text-ink-mute">Sets</div></Card>
          <Card className="text-center"><div className="display text-[26px] text-coral-500">{Math.round(sessionVolume(s))}</div><div className="text-[10px] font-bold uppercase text-ink-mute">{unit} lifted</div></Card>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.feeling && <Pill tone="mustard">{FACE[s.feeling]}</Pill>}
          <Pill tone={s.mode === "guided45" ? "coral" : "teal"}>{s.mode === "guided45" ? "45-min guided" : "Logged freely"}</Pill>
        </div>
        {s.notes && <Card className="text-sm italic text-ink-soft">“{s.notes}”</Card>}
        <div className="space-y-2">
          {[...groups.entries()].map(([exId, list]) => {
            const ex = findExercise(exId, data.customExercises);
            return (
              <Link key={exId} href={`/library/${exId}`} className="card tap flex items-center gap-3 p-3">
                <ExerciseImage exercise={ex} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{list[0].exerciseName}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {list.map((e) => <span key={e.id} className="rounded-md bg-sand px-1.5 py-0.5 text-[11px] font-semibold">R{e.round} · {e.weightText || "–"}{e.weight != null ? unit : ""} × {e.repsText || "✓"}</span>)}
                  </div>
                </div>
              </Link>
            );
          })}
          {s.entries.length === 0 && <Card className="text-center text-sm text-ink-soft">No sets were logged, but you showed up. That counts.</Card>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={share}>Share summary</Button>
          <Button variant="danger" onClick={() => setConfirm(true)}>Delete</Button>
        </div>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Delete this workout?">
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>Keep</Button>
          <Button variant="danger" onClick={() => { actions.deleteSession(s.id); nav("/progress"); }}>Delete</Button>
        </div>
      </Sheet>
    </div>
  );
}
