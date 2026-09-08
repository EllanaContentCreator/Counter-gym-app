import type { Program, WorkoutSession } from "./types";
import { saveActiveSession, uid } from "./store";

export function startSession(program: Program | null, mode: "free" | "guided45"): WorkoutSession {
  const s: WorkoutSession = {
    id: uid(),
    programId: program?.id ?? null,
    programName: program?.name ?? "Free workout",
    mode,
    startedAt: Date.now(),
    finishedAt: null,
    durationSec: 0,
    entries: [],
    notes: "",
  };
  saveActiveSession(s);
  return s;
}
