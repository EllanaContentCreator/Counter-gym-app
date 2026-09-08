import type { Program, ProgramRow } from "@/lib/types";

const row = (
  id: string,
  slot: string,
  exerciseId: string,
  weight: string,
  sets: string,
  reps: string,
  rest = "",
  label?: string
): ProgramRow => ({ id, slot, exerciseId, weight, sets, reps, rest, label });

const T0 = 1756684800000; // 1 Sept 2026

/** Carolyn Counter's programs, transcribed from her training sheets. */
export const CAROLYN_PROGRAMS: Program[] = [
  {
    id: "carolyn-01",
    number: 1,
    name: "Program #01",
    dayLabel: "Tues 01 Sept",
    source: "carolyn",
    createdAt: T0,
    updatedAt: T0,
    notes: "4 stations × 3 rounds, then TABATA to finish. Station 1 is a superset.",
    rows: [
      row("c01-1", "1", "seated-row-machine", "12.5", "each side", "10"),
      row("c01-1b", "1+", "weighted-sit-up", "5", "plate", "10"),
      row("c01-2", "2", "squat-machine-squat-pulse", "15", "each side", "10+10"),
      row("c01-3", "3", "dumbbell-single-arm-floor-to-ceiling", "10", "", "10"),
      row("c01-4", "4", "incline-leg-press-pulse", "15", "each side", "10+10"),
      row("c01-t1", "TABATA", "kneeling-plate-woodchop", "5", "plate", ""),
      row("c01-t2", "TABATA", "kettlebell-swing", "16", "", ""),
    ],
  },
  {
    id: "carolyn-02",
    number: 2,
    name: "Program #02",
    dayLabel: "Thur 03 Sept",
    source: "carolyn",
    createdAt: T0 + 2 * 864e5,
    updatedAt: T0 + 2 * 864e5,
    notes: "Deadlift day. The TABATA is a 4-move dumbbell leg circuit, left then right.",
    rows: [
      row("c02-1", "1", "deadlift-bar", "15", "each side", "10", "big plate"),
      row("c02-1b", "1+", "kettlebell-farmers-walk", "16", "each side", "", "circle"),
      row("c02-2", "2", "plate-get-up", "5", "plate", "10"),
      row("c02-3", "3", "kneeling-single-arm-lat-pulldown", "23", "", "10"),
      row("c02-4", "4", "dumbbell-slider-side-lunge", "10", "", "10"),
      row(
        "c02-t1",
        "TABATA",
        "dumbbell-single-leg-deadlift",
        "10",
        "",
        "left + right",
        "",
        "Dumbbell Single Leg Deadlift / Reverse Lunge + Bicep Curl / Low Reverse Lunge + Front Foot Tap / Lunge Pulse"
      ),
    ],
  },
  {
    id: "carolyn-03",
    number: 3,
    name: "Program #03",
    dayLabel: "Tues 08 Sept",
    source: "carolyn",
    createdAt: T0 + 7 * 864e5,
    updatedAt: T0 + 7 * 864e5,
    notes: "Two blocks of four machines with the box split squat in the middle for everyone.",
    rows: [
      row("c03-1", "1", "seated-leg-press", "72", "", "10"),
      row("c03-2", "2", "seated-lat-pulldown", "39+1", "", "10"),
      row("c03-3", "3", "cable-kneeling-rope-face-pull", "36+2", "", "10"),
      row("c03-4", "4", "trx-narrow-row", "0", "", "10"),
      row("c03-all", "ALL", "box-weighted-split-squat", "5 P", "each side", "10 + 10"),
      row("c03-5", "1", "seated-leg-press-sumo", "72", "", "10"),
      row("c03-6", "2", "lat-pulldown-bicep", "39+2", "", "10"),
      row("c03-7", "3", "cable-rope-squat-row", "41+2", "", "10"),
      row("c03-8", "4", "trx-chest-press", "0", "", "10"),
    ],
  },
  {
    id: "carolyn-04",
    number: 4,
    name: "Program #04",
    dayLabel: "Thur 10 Sept",
    source: "carolyn",
    createdAt: T0 + 9 * 864e5,
    updatedAt: T0 + 9 * 864e5,
    notes: "Hex bar day. Stations 1 and 4 are supersets. Two TABATAs to finish.",
    rows: [
      row("c04-1", "1", "hex-bar-squat", "5 + 10+5", "each side", "10"),
      row("c04-1b", "1+", "kettlebell-sumo-squat", "28", "", "10"),
      row("c04-2", "2", "cable-three-way", "32", "", "8 each"),
      row("c04-3", "3", "bosu-medicine-ball-slam-single-leg", "7", "", "10"),
      row("c04-4", "4", "trx-tricep-pullover", "0", "", "10"),
      row("c04-4b", "4+", "trx-seated-bicep-curl", "0", "", "10"),
      row("c04-t1", "TABATA", "hybrid-knee-push-up", "0", "", ""),
      row("c04-t2", "TABATA", "v-snap-toe-taps", "5", "", ""),
    ],
  },
];
