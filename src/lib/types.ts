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

export interface Profile {
  name: string;
  trainerName: string;
  unit: "kg" | "lb";
  weeklyGoal: number; // sessions per week
  restSeconds: number;
  soundOn: boolean;
  onboarded: boolean;
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
}

/** Shape of an exported backup file: app data plus the sheet photos as data URLs. */
export interface BackupFile extends AppData {
  photos?: Record<string, string>;
}
