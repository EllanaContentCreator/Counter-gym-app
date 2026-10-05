import { CAROLYN_PROGRAMS } from "../src/data/programs";
import { DEFAULT_FOOD_FAVOURITES, DEFAULT_MEAL_PLAN, DEFAULT_NUTRITION } from "../src/data/nutrition";
import type { AppData, FoodEntry, WorkoutSession } from "../src/lib/types";
import { buildPush, dirtyKeys, explode, markPushed, onLocalChange, onRemote, type RemoteDoc, type SyncMeta } from "../src/lib/syncCore";

const seed = (): AppData => ({
  version: 1,
  profile: { name: "", trainerName: "Carolyn", unit: "kg", weeklyGoal: 2, restSeconds: 60, soundOn: true, onboarded: false, readerUrl: "", readerPasscode: "" },
  programs: CAROLYN_PROGRAMS.map((p) => ({ ...p })),
  sessions: [],
  customExercises: [],
  lastWeights: {},
  favourites: [],
  days: {},
  foodFavourites: DEFAULT_FOOD_FAVOURITES.map((f) => ({ ...f })),
  mealPlan: DEFAULT_MEAL_PLAN.map((d) => ({ ...d, meals: d.meals.map((m) => ({ ...m })) })),
  nutrition: { ...DEFAULT_NUTRITION, targets: { ...DEFAULT_NUTRITION.targets } },
});

let failed = 0;
const ok = (cond: boolean, what: string) => {
  console.log((cond ? "PASS  " : "FAIL  ") + what);
  if (!cond) failed++;
};

/** The cloud: key → doc. A "device" syncs against it the way the app will. */
const cloud = new Map<string, RemoteDoc>();
let clock = 1_000_000;
class Device {
  meta: SyncMeta = { uid: "u", keys: {}, first: false };
  constructor(public state: AppData) {}
  edit(fn: (s: AppData) => AppData) {
    this.state = fn(this.state);
    clock += 1000;
    onLocalChange(this.meta, this.state, clock);
  }
  push() {
    const keys = dirtyKeys(this.meta);
    for (const d of buildPush(this.meta, this.state, keys)) cloud.set(d.key, d);
    markPushed(this.meta, keys);
  }
  pull() {
    clock += 1000;
    const { next } = onRemote(this.meta, this.state, [...cloud.values()], clock, explode(seed()));
    if (next) this.state = next;
  }
  sync() {
    this.pull();
    this.push();
  }
}

const food = (id: string, name: string, at: number): FoodEntry => ({ id, slot: "lunch", name, quantity: "1", calories: 400, protein: 30, loggedAt: at });
const session = (id: string, at: number): WorkoutSession => ({ id, programId: null, programName: "Test", mode: "free", startedAt: at, finishedAt: at + 1, durationSec: 60, entries: [], notes: "" });
const same = (x: Device, y: Device) => {
  const a = explode(x.state);
  const b = explode(y.state);
  return a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
};

// ── Phone has the real history, laptop is a fresh install ──
const phone = new Device(seed());
phone.state.sessions = Array.from({ length: 10 }, (_, i) => session("s" + i, 100 + i));
phone.state.days = { "2026-10-03": { date: "2026-10-03", food: [food("f1", "Eggs", 1)], water: 750, weight: 80 } };
phone.state.profile.name = "Lana";
phone.state.profile.onboarded = true;
phone.sync();
const laptop = new Device(seed());
laptop.sync();
ok(laptop.state.sessions.length === 10, "fresh laptop receives all 10 workouts");
ok(laptop.state.profile.name === "Lana" && laptop.state.profile.onboarded, "profile arrives, so the laptop skips onboarding");
ok(laptop.state.days["2026-10-03"]?.food.length === 1 && laptop.state.days["2026-10-03"].weight === 80 && laptop.state.days["2026-10-03"].water === 750, "food, water and weight arrive");
ok(same(laptop, phone), "laptop and phone are identical");

// ── Restored copy: laptop identical to phone, then both sign in ──
cloud.clear();
const p2 = new Device(JSON.parse(JSON.stringify(phone.state)));
const l2 = new Device(JSON.parse(JSON.stringify(phone.state)));
p2.sync();
l2.sync();
ok(l2.state.sessions.length === 10 && p2.state.sessions.length === 10, "identical copies stay at 10 workouts, nothing duplicates");
ok(dirtyKeys(l2.meta).length === 0, "the second identical copy has nothing left to upload");

// ── Both log different food on the same day, offline ──
p2.edit((s) => ({ ...s, days: { ...s.days, "2026-10-04": { date: "2026-10-04", food: [food("a", "Toast", 5)] } } }));
l2.edit((s) => ({ ...s, days: { ...s.days, "2026-10-04": { date: "2026-10-04", food: [food("b", "Salad", 6)] } } }));
p2.sync();
l2.sync();
p2.sync();
const names = (d: Device) => d.state.days["2026-10-04"].food.map((f) => f.name).sort().join("+");
ok(names(p2) === "Salad+Toast" && names(l2) === "Salad+Toast", "food added on both devices the same day: both kept");

// ── Same weight edited on both: newer wins ──
p2.edit((s) => ({ ...s, days: { ...s.days, "2026-10-03": { ...s.days["2026-10-03"], weight: 79 } } }));
l2.edit((s) => ({ ...s, days: { ...s.days, "2026-10-03": { ...s.days["2026-10-03"], weight: 78 } } })); // later
p2.sync();
l2.sync();
p2.sync();
ok(p2.state.days["2026-10-03"].weight === 78 && l2.state.days["2026-10-03"].weight === 78, "same weigh-in edited twice: the later one wins on both");

// ── Delete on one device ──
p2.edit((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== "s3") }));
p2.sync();
l2.sync();
ok(l2.state.sessions.length === 9 && !l2.state.sessions.some((x) => x.id === "s3"), "a deleted workout disappears everywhere");

// ── Fresh device must not wipe the cloud with its blank seed ──
const fresh = new Device(seed());
fresh.sync();
ok(fresh.state.sessions.length === 9, "a blank new device takes the cloud's data");
ok([...cloud.values()].filter((d) => !d.deleted && d.key.startsWith("session:")).length === 9, "the cloud still has all its workouts");
ok(fresh.state.profile.name === "Lana", "a blank new device does not overwrite the profile");

// ── Reader settings stay on each device ──
p2.state.profile.readerUrl = "https://example.test/reader";
p2.edit((s) => ({ ...s, profile: { ...s.profile } }));
p2.sync();
l2.sync();
ok(l2.state.profile.readerUrl === "", "the reader address is not copied between devices");

// ── First sync: both have different history, nothing is lost ──
cloud.clear();
const a = new Device(seed());
a.state.sessions = [session("x1", 10), session("x2", 11)];
const b = new Device(seed());
b.state.sessions = [session("y1", 20)];
a.sync();
b.sync();
a.sync();
ok(a.state.sessions.length === 3 && b.state.sessions.length === 3, "two devices with different workouts: all 3 kept");

// ── First sync: cloud says deleted, device still has it: keep it ──
cloud.clear();
const c = new Device(seed());
c.state.sessions = [session("z1", 1)];
c.sync();
c.edit((s) => ({ ...s, sessions: [] }));
c.sync();
const d = new Device(seed());
d.state.sessions = [session("z1", 1)];
d.sync();
ok(d.state.sessions.length === 1, "a deletion in the cloud never erases data a new device still holds");

// ── A blank device signs in FIRST, then the real phone: the phone's own settings survive ──
cloud.clear();
const blank = new Device(seed());
blank.sync();
const real = new Device(seed());
real.state.profile.name = "Lana";
real.state.profile.weeklyGoal = 4;
real.state.nutrition = { ...real.state.nutrition, goalWeight: 70 };
real.state.lastWeights = { squat: "40" };
real.sync();
blank.sync();
ok(real.state.profile.name === "Lana" && real.state.nutrition.goalWeight === 70 && real.state.lastWeights.squat === "40", "the real phone keeps its own settings after a blank device went first");
ok(blank.state.profile.name === "Lana" && blank.state.nutrition.goalWeight === 70 && blank.state.profile.weeklyGoal === 4, "and the blank device then receives them");

// ── Settling: syncing again changes nothing ──
a.sync();
b.sync();
c.sync();
d.sync();
a.sync();
b.sync();
c.sync();
d.sync();
const before = [...cloud.values()].map((x) => x.key + "@" + x.ts).sort().join();
a.sync();
b.sync();
c.sync();
d.sync();
ok([...cloud.values()].map((x) => x.key + "@" + x.ts).sort().join() === before, "quiet rounds change nothing in the cloud");

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
