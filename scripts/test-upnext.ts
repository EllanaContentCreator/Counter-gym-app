import { upNextProgram } from "../src/lib/utils";
import type { Program, WorkoutSession } from "../src/lib/types";

let failed = 0;
const ok = (cond: boolean, what: string) => {
  console.log((cond ? "PASS  " : "FAIL  ") + what);
  if (!cond) failed++;
};

const prog = (n: number): Program => ({ id: "p" + n, number: n, name: "Sheet " + n, dayLabel: "", rows: [], source: "custom", createdAt: n, updatedAt: n });
const programs = [prog(1), prog(2), prog(3)];
const done = (programId: string, startedAt: number, finished = true): WorkoutSession => ({ id: "s" + startedAt, programId, programName: programId, mode: "free", startedAt, finishedAt: finished ? startedAt + 1 : null, durationSec: 60, entries: [], notes: "" });
const id = (p: Program | null) => p?.id ?? null;

ok(id(upNextProgram(programs, [])) === "p1", "with nothing done, automatic starts at the first sheet");
ok(id(upNextProgram(programs, [done("p1", 100)])) === "p2", "automatic is the sheet after the last one done");
ok(id(upNextProgram(programs, [done("p1", 100)], { id: "p3", at: 200 })) === "p3", "a picked sheet beats automatic");
ok(id(upNextProgram(programs, [], { id: "p2", at: 200 })) === "p2", "a pick works before anything has been done");
ok(id(upNextProgram(programs, [done("p1", 100), done("p3", 300)], { id: "p3", at: 200 })) === "p1", "once the picked sheet is done, it goes back to automatic (after p3 comes p1)");
ok(id(upNextProgram(programs, [done("p1", 100), done("p3", 150)], { id: "p3", at: 200 })) === "p3", "doing that sheet BEFORE picking it doesn't cancel the pick");
ok(id(upNextProgram(programs, [done("p1", 100), done("p3", 300, false)], { id: "p3", at: 200 })) === "p3", "an unfinished workout on it doesn't cancel the pick");
ok(id(upNextProgram(programs, [done("p1", 100), done("p2", 300)], { id: "p3", at: 200 })) === "p3", "doing a different sheet leaves the pick alone");
ok(id(upNextProgram(programs, [done("p1", 100)], { id: "gone", at: 200 })) === "p2", "a pick for a deleted sheet falls back to automatic");
ok(id(upNextProgram(programs, [done("p1", 100)], null)) === "p2", "null means automatic");
ok(upNextProgram([], [], { id: "p1", at: 1 }) === null, "no sheets at all gives nothing");

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
