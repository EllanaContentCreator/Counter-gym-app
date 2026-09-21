import { useEffect, useRef, useState } from "react";
import { beep, vibrate, useWakeLock } from "@/lib/timer";
import { cn, formatClock } from "@/lib/utils";
import { Button } from "./ui";

export interface TabataConfig { work: number; rest: number; rounds: number; prep: number }
export const DEFAULT_TABATA: TabataConfig = { work: 20, rest: 10, rounds: 8, prep: 5 };

/** Full-screen Tabata timer. Wall-clock based so it stays accurate if the phone dims. */
export function TabataOverlay({ title, config = DEFAULT_TABATA, sound = true, onDone, onClose }: { title: string; config?: TabataConfig; sound?: boolean; onDone: () => void; onClose: () => void }) {
  type Phase = "prep" | "work" | "rest" | "done";
  const [phase, setPhase] = useState<Phase>("prep");
  const [round, setRound] = useState(1);
  const [left, setLeft] = useState(config.prep);
  const [paused, setPaused] = useState(false);
  const endRef = useRef(Date.now() + config.prep * 1000);
  const lastTick = useRef(-1);
  useWakeLock(true);

  useEffect(() => {
    if (paused || phase === "done") return;
    const id = setInterval(() => {
      const l = Math.max(0, (endRef.current - Date.now()) / 1000);
      setLeft(l);
      const whole = Math.ceil(l);
      if (whole <= 3 && whole > 0 && whole !== lastTick.current) {
        lastTick.current = whole;
        beep("tick", sound);
      }
      if (l <= 0) {
        lastTick.current = -1;
        if (phase === "prep" || phase === "rest") {
          setPhase("work");
          endRef.current = Date.now() + config.work * 1000;
          beep("go", sound); vibrate(200);
        } else if (phase === "work") {
          if (round >= config.rounds) {
            setPhase("done");
            beep("done", sound); vibrate([200, 100, 200, 100, 400]);
          } else {
            setPhase("rest");
            setRound((r) => r + 1);
            endRef.current = Date.now() + config.rest * 1000;
            beep("rest", sound); vibrate(120);
          }
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, paused, round, config, sound]);

  const togglePause = () => {
    if (!paused) setPaused(true);
    else {
      endRef.current = Date.now() + left * 1000;
      setPaused(false);
    }
  };

  const total = phase === "prep" ? config.prep : phase === "work" ? config.work : config.rest;
  const pct = total ? (1 - left / total) * 100 : 100;
  const bg = phase === "work" ? "bg-coral-500" : phase === "rest" ? "bg-teal-700" : phase === "done" ? "bg-ink" : "bg-mustard-500";
  const label = phase === "prep" ? "Get ready" : phase === "work" ? "WORK" : phase === "rest" ? "Rest" : "Done!";

  return (
    <div className={cn("fixed inset-0 z-[60] flex flex-col text-white transition-colors duration-300", bg)}>
      <div className="safe-top flex items-center justify-between px-5 pt-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest opacity-80">Tabata</div>
          <div className="max-w-[260px] truncate font-bold">{title}</div>
        </div>
        <button onClick={onClose} className="tap grid h-10 w-10 place-items-center rounded-full bg-white/20">✕</button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className={cn("display text-[28px] tracking-widest", phase === "prep" && "text-ink")}>{label}</div>
        <div className={cn("display mt-2 text-[128px] leading-none tabular-nums", phase === "prep" && "text-ink")}>{Math.ceil(left)}</div>
        <div className={cn("mt-2 text-lg font-bold", phase === "prep" && "text-ink")}>Round {Math.min(round, config.rounds)} / {config.rounds}</div>
        <div className="mt-6 h-3 w-full max-w-[320px] overflow-hidden rounded-full bg-white/25">
          <div className="h-full bg-white transition-[width] duration-100" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs font-bold uppercase tracking-widest opacity-80">
          {config.work}s on · {config.rest}s off · {formatClock(config.rounds * (config.work + config.rest))} total
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-6 pb-8" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}>
        {phase === "done" ? (
          <Button full variant="coral" size="lg" className="col-span-2" onClick={onDone}>✓ Log this tabata</Button>
        ) : (
          <>
            <Button size="lg" className="bg-white/20 text-white shadow-none" onClick={togglePause}>{paused ? "▶ Resume" : "❚❚ Pause"}</Button>
            <Button size="lg" className="bg-white/20 text-white shadow-none" onClick={onDone}>Finish early</Button>
          </>
        )}
      </div>
    </div>
  );
}
