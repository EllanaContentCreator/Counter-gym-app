import { useCallback, useEffect, useRef, useState } from "react";

let ctx: AudioContext | null = null;
function audio() {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return ctx;
}

/** Short beep. kind: "tick" | "go" | "rest" | "done" */
export function beep(kind: "tick" | "go" | "rest" | "done" = "tick", enabled = true) {
  if (!enabled) return;
  try {
    const c = audio();
    if (c.state === "suspended") void c.resume();
    const pattern: Array<[number, number, number]> =
      kind === "tick" ? [[880, 0, 0.08]]
      : kind === "go" ? [[660, 0, 0.12], [990, 0.14, 0.18]]
      : kind === "rest" ? [[520, 0, 0.18]]
      : [[660, 0, 0.12], [830, 0.14, 0.12], [1046, 0.28, 0.3]];
    for (const [freq, delay, dur] of pattern) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, c.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.4, c.currentTime + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime + delay);
      o.stop(c.currentTime + delay + dur + 0.05);
    }
  } catch {
    /* audio not available */
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

/** Unlock audio on first user gesture (iOS). */
export function primeAudio() {
  try {
    const c = audio();
    if (c.state === "suspended") void c.resume();
  } catch {
    /* ignore */
  }
}

/** Countdown that survives tab throttling by using wall-clock time. */
export function useCountdown(onFinish?: () => void) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const endRef = useRef(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, (endRef.current - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        finishRef.current?.();
      }
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback((seconds: number) => {
    setTotal(seconds);
    endRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setRunning(true);
  }, []);
  const pause = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => {
    endRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }, [remaining]);
  const add = useCallback((seconds: number) => {
    endRef.current += seconds * 1000;
    setRemaining((r) => r + seconds);
    setTotal((t) => t + seconds);
  }, []);
  const stop = useCallback(() => {
    setRunning(false);
    setRemaining(0);
  }, []);

  return { remaining, running, total, start, pause, resume, add, stop };
}

/** Stopwatch counting up from a given start timestamp. */
export function useStopwatch(startedAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt ? Math.floor((now - startedAt) / 1000) : 0;
}

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    const onVis = () => {
      if (document.visibilityState === "visible" && !lock) nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
