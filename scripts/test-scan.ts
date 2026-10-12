import { matchRows } from "../src/lib/scan";
import { EXERCISES } from "../src/data/exercises";

// Real lines off Carolyn's Program #07, exactly as the reader transcribes them.
const rows = [
  { slot: "1", exercise: "Smith Machine Lunge", weight: "15", sets: "each side", reps: "10", rest: "" },
  { slot: "2", exercise: "BOSU - Dumbbell Single Leg + Single Arm - Floor To Ceiling", weight: "8", sets: "", reps: "10", rest: "" },
  { slot: "3", exercise: "Barbell Bicep Curl 20's : 5 Full / 5 Bottom Half / 5 Top Half / 5 Full", weight: "20", sets: "", reps: "", rest: "" },
  { slot: "4", exercise: "Torsinator : On One Knee : Above Shoulders To Opposite Knee : 15 Kg Bar", weight: "5", sets: "", reps: "10", rest: "" },
  { slot: "TABATA", exercise: "TABATA : Abs : Single Arm To Opposite Leg : L & R", weight: "5", sets: "plate", reps: "", rest: "" },
  { slot: "TABATA", exercise: "TABATA : Push Ups : Knees & Hybrid", weight: "0", sets: "", reps: "", rest: "" },
  { slot: "1", exercise: "Hex Bar Squat", weight: "5 + 10+5", sets: "each side", reps: "10", rest: "" },
  { slot: "1+", exercise: "Kettlebell Sumo Squat", weight: "28", sets: "", reps: "10", rest: "" },
  { slot: "2", exercise: "Cable Three Way - Middle / Left / Right : Cable Highest Hole", weight: "32", sets: "", reps: "8 each", rest: "" },
  { slot: "3", exercise: "Bosu : Medicine Ball Slam : Single Leg - L & R", weight: "7", sets: "", reps: "10", rest: "" },
  { slot: "4", exercise: "TRX Tricep Pullover", weight: "0", sets: "", reps: "10", rest: "" },
  { slot: "1", exercise: "Deadlift (20kg Bar)", weight: "15", sets: "each side", reps: "10", rest: "big plate" },
  { slot: "1+", exercise: "Kettlebell Farmers Walk", weight: "16", sets: "each side", reps: "", rest: "circle" },
  { slot: "2", exercise: "Plate Get Up", weight: "5", sets: "plate", reps: "10", rest: "" },
  { slot: "3", exercise: "Kneeling Single Arm Lat Pulldown - L & R", weight: "23", sets: "", reps: "10", rest: "" },
  { slot: "4", exercise: "Dumbbell Slider Side Lunge - L & R", weight: "10", sets: "", reps: "10", rest: "" },
  { slot: "1", exercise: "Seated Leg Press - SUMO", weight: "72", sets: "", reps: "10", rest: "" },
  { slot: "2", exercise: "Lat Pulldown BICEP", weight: "39+2", sets: "", reps: "10", rest: "" },
  { slot: "4", exercise: "TRX Narrow Row", weight: "0", sets: "", reps: "10", rest: "" },
  { slot: "TABATA", exercise: "TABATA : V Snap / Toe Taps Legs Up", weight: "5", sets: "", reps: "", rest: "" },
];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));
const out = matchRows(rows as never, []);
let matched = 0;
for (const m of out) {
  const hasImage = !!byId.get(m.exercise.id)?.image;
  if (!m.isNew) matched++;
  const tag = m.isNew ? "NEW   " : hasImage ? "MATCH " : "MATCH*";
  console.log(`${tag} ${m.confidence.toFixed(2)}  ${m.readName.slice(0, 46).padEnd(46)} -> ${m.isNew ? "(created)" : m.exercise.name}`);
}
console.log(`\nmatched ${matched}/${out.length}   (* = matched but library entry has no picture)`);

// Lana's 12 Oct sheet. Every one of these used to land on the wrong drawing:
// a chest press for the fly, Leg Extension for Standing Get Ups, a cable crunch
// for the floor abs, a plate halo for the Bosu hold.
const oct12: Array<[string, string | null]> = [
  ["Dumbbell Chest Fly On Bench", "dumbbell-chest-fly"],
  ["Barbell Floor To Shoulder : 15kgs", "barbell-floor-to-shoulder"],
  ["Plate Get Up", "plate-get-up"],
  ["Standing Get Ups : Kneel : Left Leg Up, Right Leg Up, Left Leg Down, Right Leg Down", "standing-get-up"],
  ["ALL : Sprinter Sit Up / Crunch / Reverse Curl / Butterfly Sit Up", "sprinter-sit-up"],
  ["Dumbbell Shoulder Press", "dumbbell-shoulder-press"],
  ["Barbell Bent Over Row : 15kgs", "barbell-bent-over-row"],
  ["Bosu : Hold Plate : Feet On Either Side : Wiggle Left & Right", "bosu-plate-hold-wiggle"],
  ["Standing Get Ups : Right Side", "standing-get-up"],
  ["Incline Leg Press + Sumo Leg Press", "incline-leg-press-pulse"],
];
const got = matchRows(oct12.map(([exercise]) => ({ slot: "1", exercise, weight: "", sets: "", reps: "", rest: "" })) as never, []);
let bad = 0;
console.log("\n12 Oct sheet");
got.forEach((m, i) => {
  const [name, want] = oct12[i];
  const ok = want === null ? m.isNew && !m.exercise.image : !m.isNew && m.exercise.id === want;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.slice(0, 46).padEnd(46)} -> ${m.isNew ? `(created, ${m.exercise.image ?? "muscle map"})` : m.exercise.id}`);
});
if (bad) {
  console.log(`\n${bad} wrong`);
  process.exit(1);
}
console.log("\nAll passed");
