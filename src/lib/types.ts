export type EquipmentId =
  | "bodyweight" | "dumbbell" | "kettlebell" | "barbell" | "hex-bar" | "plate"
  | "cable" | "trx" | "bosu" | "medicine-ball" | "box" | "bench" | "slider"
  | "resistance-band" | "leg-press" | "lat-pulldown" | "seated-row" | "squat-machine"
  | "chest-press-machine" | "smith-machine" | "rower" | "bike" | "treadmill" | "skipping-rope"
  | "swiss-ball" | "foam-roller" | "mat";

export type MuscleGroup =
  | "legs" | "glutes" | "hamstrings" | "quads" | "calves" | "back" | "lats" | "chest"
  | "shoulders" | "biceps" | "triceps" | "core" | "obliques" | "full-body" | "cardio";

export type ExerciseCategory = "strength" | "core" | "cardio" | "tabata" | "mobility";

export interface Exercise {
  id: string;
  name: string;
  equipment: EquipmentId[];
  muscles: MuscleGroup[];
  category: ExerciseCategory;
  cues: string[];
  /** File name inside /exercises (without extension) */
  image?: string;
  unilateral?: boolean;
  /** true when weight is normally "0" / bodyweight */
  noWeight?: boolean;
  custom?: boolean;
}

export interface Equipment {
  id: EquipmentId;
  name: string;
  emoji: string;
}

/** A row in a program, mirroring Carolyn's sheet: 1, 1+, 2, TABATA, ALL */
export interface ProgramRow {
  id: string;
  exerciseId: string;
  /** Optional name override, e.g. "Cable Three Way - Middle / Left / Right : Cable Highest Hole" */
  label?: string;
  slot: string; // "1" | "1+" | "2" | "3" | "4" | "4+" | "TABATA" | "ALL"
  weight: string;
  sets: string;
  reps: string;
  rest: string;
  note?: string;
}

export interface Program {
  id: string;
  number: number;
  name: string;
  dayLabel: string; // e.g. "Tues 01 Sept"
  rows: ProgramRow[];
  source: "carolyn" | "custom";
  notes?: string;
  /** The training day this sheet was handed out for (ms). Used to group sheets by week. */
  date?: number;
  /** Photos / screenshots of the original sheet, stored in IndexedDB. */
  photoIds?: string[];
  createdAt: number;
  updatedAt: number;
}

/** A photo of one of Carolyn's sheets (the bytes live in IndexedDB, not localStorage). */
export interface SheetPhoto {
  id: string;
  blob: Blob;
  width: number;
  height: number;
  createdAt: number;
}

export interface SetEntry {
  id: string;
  rowId?: string;
  exerciseId: string;
  exerciseName: string;
  slot: string;
  round: number;
  setIndex: number;
  weight: number | null;
  weightText: string;
  reps: number | null;
  repsText: string;
  completedAt: number;
}

export interface WorkoutSession {
  id: string;
  programId: string | null;
  programName: string;
  mode: "free" | "guided45";
  startedAt: number;
  finishedAt: number | null;
  durationSec: number;
  entries: SetEntry[];
  notes: string;
  feeling?: 1 | 2 | 3 | 4 | 5;
  /** Exercises added on the fly during this session */
  extraRows?: ProgramRow[];
}

// ───────────── Food ─────────────

/** Where a food sits in the day. Carolyn's ladies eat five ways. */
export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner" | "extras";

/** What kind of day it is, which decides the calorie and protein target. */
export type DayType = "strength" | "cardio" | "normal" | "fasting";

/** One thing eaten, on one day. */
export interface FoodEntry {
  id: string;
  slot: MealSlot;
  name: string;
  /** Free text, because "150 g" and "2 eggs" are both right. */
  quantity: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  notes?: string;
  loggedAt: number;
  /** Set when this came from a meal-plan meal, so it can be ticked off and undone. */
  planMealId?: string;
}

/** A food eaten often enough to deserve one tap. */
export interface FoodFavourite {
  id: string;
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs?: number;
  fat?: number;
  /** Where it usually goes, so one tap lands it in the right meal. */
  slot?: MealSlot;
  /** How many times it has been tapped, so the ones she really eats float up. */
  uses: number;
}

/**
 * Everything logged on one day, keyed by its local date (YYYY-MM-DD). Workouts
 * stay in `sessions` and are joined by date, so nothing is stored twice.
 */
export interface DayRecord {
  date: string;
  food: FoodEntry[];
  /** Millilitres drunk. */
  water?: number;
  /** Weighed on this day. Missing on the days she didn't step on the scales. */
  weight?: number;
}

/** A target is a band to land inside, not a line to go over. */
export interface TargetBand {
  calories: [number, number];
  protein: [number, number];
}

/** One meal in the weekly plan. */
export interface PlanMeal {
  id: string;
  slot: MealSlot;
  title: string;
  /** The parts of it, shown under the title and kept as the entry's note. */
  items: string[];
  calories: number;
  protein: number;
  /** Eaten some days and not others — never counted as missed. */
  optional?: boolean;
}

/** One day of the weekly plan. Monday is 0. */
export interface PlanDay {
  weekday: number;
  dayType: DayType;
  /** Fasting until around midday. Separate from day type — Wednesday is both. */
  fastingMorning?: boolean;
  meals: PlanMeal[];
}

export interface NutritionSettings {
  /** Editable target bands, one per kind of day. */
  targets: Record<DayType, TargetBand>;
  startWeight: number;
  goalWeight: number;
  /** Millilitres a day to aim for. */
  waterTarget: number;
}

export interface Profile {
  name: string;
  trainerName: string;
  unit: "kg" | "lb";
  weeklyGoal: number; // sessions per week
  restSeconds: number;
  soundOn: boolean;
  onboarded: boolean;
  /** Address of the sheet reader (blank = same site, /.netlify/functions/scan-sheet). */
  readerUrl?: string;
  /** Shared passcode for the group's sheet reader. */
  readerPasscode?: string;
}

export interface AppData {
  version: 1;
  profile: Profile;
  programs: Program[];
  sessions: WorkoutSession[];
  customExercises: Exercise[];
  /** Per-exercise last-used weight text, for quick prefill */
  lastWeights: Record<string, string>;
  favourites: string[];
  /** Everything eaten, keyed by local date. */
  days: Record<string, DayRecord>;
  foodFavourites: FoodFavourite[];
  mealPlan: PlanDay[];
  nutrition: NutritionSettings;
}

/** Shape of an exported backup file: app data plus the sheet photos as data URLs. */
export interface BackupFile extends AppData {
  photos?: Record<string, string>;
}
