import { useState } from "react";
import { useAppData } from "@/lib/store";
import { useCountdown, useStopwatch, beep, vibrate } from "@/lib/timer";
import { cn, formatClock } from "@/lib/utils";
import { Header } from "@/components/Header";
import { Button, Card, Field, inputCls } from "@/components/ui";
import { TabataOverlay, DEFAULT_TABATA, type TabataConfig } from "@/components/Tabata";

export default function Timer() {
  const data = useAppData();
  const [mode, setMode] = useState<"tabata" | "rest" | "stopwatch">("tabata");
  const [cfg, setCfg] = useState<TabataConfig>(DEFAULT_TABATA);
  const [tabataOpen, setTabataOpen] = useState(false);
  const rest = useCountdown(() => { beep("done", data.profile.soundOn); vibrate([200, 100, 200]); });
  const [swStart, setSwStart] = useState<number | null>(null);
  const [swFrozen, setSwFrozen] = useState(0);
  const sw = useStopwatch(swStart);
  const presets = [30, 45, 60, 90, 120];

  return (
    <div className="safe-bottom">
      <Header title="Timer" back="/" />
      <div className="space-y-4 px-4 pt-1">
        <div className="flex gap-2">
          {(["tabata", "rest", "stopwatch"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={cn("tap flex-1 rounded-full py-2 text-sm font-bold capitalize", mode === m ? "bg-teal-700 text-white" : "bg-white text-ink-soft shadow-card")}>{m}</button>
          ))}
        </div>

        {mode === "tabata" && (
          <Card className="space-y-4">
            <div>
              <div className="display text-[26px]">Tabata</div>
              <p className="text-sm text-ink-soft">Carolyn's finisher: 20 seconds all-out, 10 seconds rest, 8 rounds. 4 minutes that feel like 40.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Work (sec)"><input type="number" inputMode="numeric" className={inputCls} value={cfg.work} onChange={(e) => setCfg({ ...cfg, work: +e.target.value || 0 })} /></Field>
              <Field label="Rest (sec)"><input type="number" inputMode="numeric" className={inputCls} value={cfg.rest} onChange={(e) => setCfg({ ...cfg, rest: +e.target.value || 0 })} /></Field>
              <Field label="Rounds"><input type="number" inputMode="numeric" className={inputCls} value={cfg.rounds} onChange={(e) => setCfg({ ...cfg, rounds: +e.target.value || 1 })} /></Field>
              <Field label="Get ready (sec)"><input type="number" inputMode="numeric" className={inputCls} value={cfg.prep} onChange={(e) => setCfg({ ...cfg, prep: +e.target.value || 0 })} /></Field>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCfg(DEFAULT_TABATA)}>Classic 20/10 × 8</Button>
              <Button variant="secondary" size="sm" onClick={() => setCfg({ work: 40, rest: 20, rounds: 6, prep: 10 })}>40/20 × 6</Button>
              <Button variant="secondary" size="sm" onClick={() => setCfg({ work: 30, rest: 30, rounds: 8, prep: 10 })}>30/30 × 8</Button>
            </div>
            <Button full variant="mustard" size="lg" onClick={() => setTabataOpen(true)}>▶ Start tabata · {formatClock(cfg.rounds * (cfg.work + cfg.rest))}</Button>
          </Card>
        )}

        {mode === "rest" && (
          <Card className="flex flex-col items-center py-8">
            <div className={cn("display text-[96px] leading-none tabular-nums", rest.running && rest.remaining <= 5 ? "text-coral-500" : "text-teal-700")}>{formatClock(rest.remaining)}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-widest text-ink-mute">Rest between sets</div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {presets.map((p) => <Button key={p} variant="secondary" size="sm" onClick={() => rest.start(p)}>{p}s</Button>)}
            </div>
            <div className="mt-4 flex gap-2">
              {rest.running ? <Button onClick={rest.pause}>Pause</Button> : rest.remaining > 0 ? <Button onClick={rest.resume}>Resume</Button> : null}
              {rest.remaining > 0 && <Button variant="secondary" onClick={() => rest.add(15)}>+15s</Button>}
              {rest.remaining > 0 && <Button variant="ghost" onClick={rest.stop}>Reset</Button>}
            </div>
          </Card>
        )}

        {mode === "stopwatch" && (
          <Card className="flex flex-col items-center py-8">
            <div className="display text-[96px] leading-none tabular-nums text-teal-700">{formatClock(swStart ? swFrozen + sw : swFrozen)}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-widest text-ink-mute">Stopwatch</div>
            <div className="mt-5 flex gap-2">
              {swStart ? (
                <Button onClick={() => { setSwFrozen((f) => f + sw); setSwStart(null); }}>Pause</Button>
              ) : (
                <Button onClick={() => setSwStart(Date.now())}>{swFrozen ? "Resume" : "Start"}</Button>
              )}
              <Button variant="ghost" onClick={() => { setSwStart(null); setSwFrozen(0); }}>Reset</Button>
            </div>
          </Card>
        )}
      </div>
      {tabataOpen && <TabataOverlay title="Free tabata" config={cfg} sound={data.profile.soundOn} onDone={() => setTabataOpen(false)} onClose={() => setTabataOpen(false)} />}
    </div>
  );
}
