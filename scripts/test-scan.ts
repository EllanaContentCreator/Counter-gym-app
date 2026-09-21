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
