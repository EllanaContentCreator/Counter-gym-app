import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAppData, actions } from "@/lib/store";
import { findExercise, historyFor, bestWeightFor, formatDate, cn } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Button, Card, Pill, Sheet } from "@/components/ui";
import { ExerciseImage } from "@/components/ExerciseImage";
import { MuscleMap } from "@/components/MuscleMap";
import { FormDiagram } from "@/components/FormDiagram";
import { IconBody, IconStar } from "@/components/Icons";
import { EQUIPMENT_BY_ID, MUSCLE_LABELS } from "@/data/equipment";
import { CustomExerciseSheet } from "./Library";

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const data = useAppData();
  const [, nav] = useLocation();
  const ex = findExercise(id, data.customExercises);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (!ex) return <div className="p-8 text-center">Exercise not found. <Link href="/library" className="font-bold text-teal-700">Back</Link></div>;
  const history = historyFor(data.sessions, ex.id);
  const best = bestWeightFor(data.sessions, ex.id);
  const fav = data.favourites.includes(ex.id);
  const inPrograms = data.programs.filter((p) => p.rows.some((r) => r.exerciseId === ex.id));
  const chart = history.map((h) => ({ date: formatDate(h.date, { day: "2-digit", month: "short" }), top: h.top }));

  return (
    <div className="safe-bottom">
      <Header title={ex.name} back="/library" right={
        <button onClick={() => actions.toggleFavourite(ex.id)} aria-label="Favourite" className={cn("tap grid h-10 w-10 place-items-center rounded-full bg-white shadow-card", fav ? "text-mustard-500" : "text-ink-mute")}><IconStar size={20} filled={fav} /></button>
      } />
      <div className="space-y-4 px-4 pt-1">
        <Card className="overflow-hidden p-0">
          <ExerciseImage exercise={ex} size="xl" className="rounded-none" />
          <div className="p-4">
            <div className="flex flex-wrap gap-1.5">
              <Pill tone={ex.category === "tabata" ? "mustard" : "teal"}>{ex.category}</Pill>
              {ex.equipment.map((q) => <Pill key={q} tone="grey">{EQUIPMENT_BY_ID[q]?.emoji} {EQUIPMENT_BY_ID[q]?.name}</Pill>)}
              {ex.unilateral && <Pill tone="coral">L & R</Pill>}
            </div>
            <div className="mt-2 text-xs font-bold uppercase tracking-wide text-ink-mute">Works: {ex.muscles.map((m) => MUSCLE_LABELS[m]).join(", ")}</div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-2 px-4 pt-4">
            <span className="grid h-8 w-8 place-items-center rounded-xl grad-coral text-white"><IconBody size={18} /></span>
            <div>
              <h3 className="display text-[20px] leading-none">Muscles worked</h3>
              <div className="text-[11px] font-semibold text-ink-mute">Brightest = main muscle · softer = helpers</div>
            </div>
          </div>
          <div className="illo-bg mt-3 px-4 pb-3 pt-2">
            <MuscleMap muscles={ex.muscles} />
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 py-3">
            {ex.muscles.map((m, i) => (
              <span key={m} className={cn("rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide", i === 0 ? "grad-coral text-white shadow-sm" : "bg-coral-100 text-coral-700")}>{MUSCLE_LABELS[m]}</span>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="display text-[20px]">How to do it</h3>
          <FormDiagram exercise={ex} className="mt-3" />
        </Card>

        <div className="grid grid-cols-3 gap-2">
          <Card className="text-center"><div className="display text-[26px] text-teal-700">{best?.weight ?? "–"}</div><div className="text-[10px] font-bold uppercase text-ink-mute">Best {data.profile.unit}</div></Card>
          <Card className="text-center"><div className="display text-[26px]">{history.length}</div><div className="text-[10px] font-bold uppercase text-ink-mute">Sessions</div></Card>
          <Card className="text-center"><div className="display text-[26px]">{history.reduce((a, h) => a + h.sets, 0)}</div><div className="text-[10px] font-bold uppercase text-ink-mute">Sets logged</div></Card>
        </div>

        {chart.length >= 2 && (
          <Card>
            <h3 className="display text-[20px]">Top weight over time</h3>
            <div className="mt-2 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#efeafb" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8683a6" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8683a6" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="top" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4, fill: "#ec4899", strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {history.length > 0 && (
          <Card>
            <h3 className="display text-[20px]">History</h3>
            <div className="mt-2 divide-y divide-sand">
              {[...history].reverse().map((h) => (
                <Link key={h.session.id} href={`/progress/${h.session.id}`} className="flex items-center justify-between py-2 text-sm">
                  <span>{formatDate(h.date)} · {h.session.programName}</span>
                  <span className="font-bold text-teal-700">{h.top}{data.profile.unit} · {h.sets} sets · {h.reps} reps</span>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {inPrograms.length > 0 && (
          <Card>
            <h3 className="display text-[20px]">On these sheets</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {inPrograms.map((p) => <Link key={p.id} href={`/programs/${p.id}`} className="rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal-700">{p.name}</Link>)}
            </div>
          </Card>
        )}

        {ex.custom && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>Delete</Button>
          </div>
        )}
      </div>
      {ex.custom && editing && <CustomExerciseSheet open={editing} onClose={() => setEditing(false)} existing={ex} />}
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Delete exercise?">
        <p className="text-sm text-ink-soft">Logged sets that used it are kept.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirm(false)}>Keep</Button>
          <Button variant="danger" onClick={() => { actions.deleteCustomExercise(ex.id); nav("/library"); }}>Delete</Button>
        </div>
      </Sheet>
    </div>
  );
}
