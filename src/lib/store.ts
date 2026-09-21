import { useSyncExternalStore } from "react";
import type { AppData, BackupFile, DayRecord, Exercise, FoodEntry, FoodFavourite, NutritionSettings, PlanMeal, Profile, Program, WorkoutSession } from "./types";
import { clearPhotos, deletePhoto, exportPhotos, importPhotos } from "./photos";
import { CAROLYN_PROGRAMS } from "@/data/programs";
import { DEFAULT_FOOD_FAVOURITES, DEFAULT_MEAL_PLAN, DEFAULT_NUTRITION } from "@/data/nutrition";

const KEY = "counter.app.v1";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const defaultProfile: Profile = {
  name: "",
  trainerName: "Carolyn",
  unit: "kg",
  weeklyGoal: 2,
  restSeconds: 60,
  soundOn: true,
  onboarded: false,
  readerUrl: "",
  readerPasscode: "",
};

function seed(): AppData {
  return {
    version: 1,
    profile: { ...defaultProfile },
    programs: CAROLYN_PROGRAMS.map((p) => ({ ...p })),
    sessions: [],
    customExercises: [],
    lastWeights: {},
    favourites: [],
    days: {},
    foodFavourites: DEFAULT_FOOD_FAVOURITES.map((f) => ({ ...f })),
    mealPlan: DEFAULT_MEAL_PLAN.map((d) => ({ ...d, meals: d.meals.map((m) => ({ ...m })) })),
    nutrition: { ...DEFAULT_NUTRITION, targets: { ...DEFAULT_NUTRITION.targets } },
  };
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed || parsed.version !== 1) return seed();
    // Make sure any newly-added Carolyn programs appear for existing users.
    const have = new Set(parsed.programs.map((p) => p.id));
    for (const p of CAROLYN_PROGRAMS) if (!have.has(p.id)) parsed.programs.push({ ...p });
    // Older saves have no `date` on Carolyn's sheets; backfill so week grouping works.
    parsed.programs = parsed.programs.map((p) => {
      if (p.date) return p;
      const seeded = CAROLYN_PROGRAMS.find((c) => c.id === p.id);
      return { ...p, date: seeded?.date ?? p.createdAt };
    });
    return { ...seed(), ...parsed, profile: { ...defaultProfile, ...parsed.profile } };
  } catch {
    return seed();
  }
}

let state: AppData = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Could not save", e);
  }
}

export function setState(updater: (s: AppData) => AppData) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function useAppData(): AppData {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state
  );
}

// ───────────── Actions ─────────────

export const actions = {
  updateProfile(patch: Partial<Profile>) {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  },
  upsertProgram(program: Program) {
    setState((s) => {
      const idx = s.programs.findIndex((p) => p.id === program.id);
      const programs = [...s.programs];
      if (idx >= 0) programs[idx] = { ...program, updatedAt: Date.now() };
      else programs.push(program);
      return { ...s, programs };
    });
  },
  deleteProgram(id: string) {
    const victim = state.programs.find((p) => p.id === id);
    setState((s) => ({ ...s, programs: s.programs.filter((p) => p.id !== id) }));
    victim?.photoIds?.forEach((pid) => void deletePhoto(pid));
  },
  addProgramPhoto(programId: string, photoId: string) {
    setState((s) => ({
      ...s,
      programs: s.programs.map((p) => (p.id === programId ? { ...p, photoIds: [...(p.photoIds ?? []), photoId], updatedAt: Date.now() } : p)),
    }));
  },
  removeProgramPhoto(programId: string, photoId: string) {
    setState((s) => ({
      ...s,
      programs: s.programs.map((p) => (p.id === programId ? { ...p, photoIds: (p.photoIds ?? []).filter((x) => x !== photoId), updatedAt: Date.now() } : p)),
    }));
    void deletePhoto(photoId);
  },
  duplicateProgram(id: string): string | null {
    const src = state.programs.find((p) => p.id === id);
    if (!src) return null;
    const maxNum = Math.max(0, ...state.programs.map((p) => p.number));
    const copy: Program = {
      ...src,
      id: uid(),
      number: maxNum + 1,
      name: `${src.name} (copy)`,
      source: "custom",
      photoIds: [],
      date: Date.now(),
      rows: src.rows.map((r) => ({ ...r, id: uid() })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setState((s) => ({ ...s, programs: [...s.programs, copy] }));
    return copy.id;
  },
  resetCarolynProgram(id: string) {
    const original = CAROLYN_PROGRAMS.find((p) => p.id === id);
    if (!original) return;
    // Keep any photo she attached to the sheet; only the rows/notes go back to the original.
    setState((s) => ({ ...s, programs: s.programs.map((p) => (p.id === id ? { ...original, photoIds: p.photoIds ?? [] } : p)) }));
  },
  addCustomExercise(ex: Exercise) {
    setState((s) => ({ ...s, customExercises: [...s.customExercises, { ...ex, custom: true }] }));
  },
  updateCustomExercise(ex: Exercise) {
    setState((s) => ({ ...s, customExercises: s.customExercises.map((e) => (e.id === ex.id ? ex : e)) }));
  },
  deleteCustomExercise(id: string) {
    setState((s) => ({ ...s, customExercises: s.customExercises.filter((e) => e.id !== id) }));
  },
  toggleFavourite(id: string) {
    setState((s) => ({
      ...s,
      favourites: s.favourites.includes(id) ? s.favourites.filter((f) => f !== id) : [...s.favourites, id],
    }));
  },
  saveSession(session: WorkoutSession) {
    setState((s) => {
      const idx = s.sessions.findIndex((x) => x.id === session.id);
      const sessions = [...s.sessions];
      if (idx >= 0) sessions[idx] = session;
      else sessions.push(session);
      const lastWeights = { ...s.lastWeights };
      for (const e of session.entries) if (e.weightText) lastWeights[e.exerciseId] = e.weightText;
      return { ...s, sessions, lastWeights };
    });
  },
  // ───────────── Food ─────────────

  /** The day's record, created empty the first time anything is logged on it. */
  addFood(date: string, entry: FoodEntry) {
    setState((s) => {
      const day: DayRecord = s.days[date] ?? { date, food: [] };
      return { ...s, days: { ...s.days, [date]: { ...day, food: [...day.food, entry] } } };
    });
  },
  updateFood(date: string, entry: FoodEntry) {
    setState((s) => {
      const day = s.days[date];
      if (!day) return s;
      return { ...s, days: { ...s.days, [date]: { ...day, food: day.food.map((f) => (f.id === entry.id ? entry : f)) } } };
    });
  },
  deleteFood(date: string, id: string) {
    setState((s) => {
      const day = s.days[date];
      if (!day) return s;
      return { ...s, days: { ...s.days, [date]: { ...day, food: day.food.filter((f) => f.id !== id) } } };
    });
  },

  /** Log a meal-plan meal in one tap. The plan id rides along so it can be undone. */
  logPlanMeal(date: string, meal: PlanMeal) {
    const entry: FoodEntry = {
      id: uid(),
      slot: meal.slot,
      name: meal.title,
      quantity: "1 serving",
      calories: meal.calories,
      protein: meal.protein,
      notes: meal.items.join(", "),
      loggedAt: Date.now(),
      planMealId: meal.id,
    };
    actions.addFood(date, entry);
    return entry;
  },
  /** Undo: take back every entry that came from this plan meal today. */
  unlogPlanMeal(date: string, planMealId: string) {
    setState((s) => {
      const day = s.days[date];
      if (!day) return s;
      return { ...s, days: { ...s.days, [date]: { ...day, food: day.food.filter((f) => f.planMealId !== planMealId) } } };
    });
  },

  addFoodFavourite(fav: FoodFavourite) {
    setState((s) => ({ ...s, foodFavourites: [...s.foodFavourites, fav] }));
  },
  updateFoodFavourite(fav: FoodFavourite) {
    setState((s) => ({ ...s, foodFavourites: s.foodFavourites.map((f) => (f.id === fav.id ? fav : f)) }));
  },
  deleteFoodFavourite(id: string) {
    setState((s) => ({ ...s, foodFavourites: s.foodFavourites.filter((f) => f.id !== id) }));
  },
  /** Count a tap, so the ones she really eats drift to the front. */
  bumpFoodFavourite(id: string) {
    setState((s) => ({ ...s, foodFavourites: s.foodFavourites.map((f) => (f.id === id ? { ...f, uses: f.uses + 1 } : f)) }));
  },

  updateNutrition(patch: Partial<NutritionSettings>) {
    setState((s) => ({ ...s, nutrition: { ...s.nutrition, ...patch } }));
  },
  updateMealPlan(mealPlan: AppData["mealPlan"]) {
    setState((s) => ({ ...s, mealPlan }));
  },

  deleteSession(id: string) {
    setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
  },
  async importData(json: string): Promise<{ ok: boolean; message: string }> {
    try {
      const parsed = JSON.parse(json) as BackupFile;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.programs)) {
        return { ok: false, message: "That file doesn't look like a Counter backup." };
      }
      const { photos, ...data } = parsed;
      await importPhotos(photos);
      setState(() => ({ ...seed(), ...data, profile: { ...defaultProfile, ...data.profile } }));
      const n = photos ? Object.keys(photos).length : 0;
      return { ok: true, message: n ? `Backup restored, including ${n} sheet photo${n === 1 ? "" : "s"}.` : "Backup restored." };
    } catch {
      return { ok: false, message: "Could not read that file." };
    }
  },
  async exportData(): Promise<string> {
    const ids = state.programs.flatMap((p) => p.photoIds ?? []);
    const photos = await exportPhotos(ids);
    const file: BackupFile = { ...state, photos };
    return JSON.stringify(file, null, 2);
  },
  resetAll() {
    void clearPhotos();
    setState(() => seed());
  },
};

// Active in-progress workout is kept separately so an accidental refresh doesn't lose it.
const ACTIVE_KEY = "counter.active.v1";
export function loadActiveSession(): WorkoutSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as WorkoutSession) : null;
  } catch {
    return null;
  }
}
export function saveActiveSession(s: WorkoutSession | null) {
  try {
    if (s) localStorage.setItem(ACTIVE_KEY, JSON.stringify(s));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}
