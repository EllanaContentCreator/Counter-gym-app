import type { Equipment } from "@/lib/types";

export const EQUIPMENT: Equipment[] = [
  { id: "bodyweight", name: "Bodyweight", emoji: "🧍‍♀️" },
  { id: "dumbbell", name: "Dumbbell", emoji: "🏋️‍♀️" },
  { id: "kettlebell", name: "Kettlebell", emoji: "🔔" },
  { id: "barbell", name: "Barbell", emoji: "➖" },
  { id: "hex-bar", name: "Hex Bar", emoji: "⬡" },
  { id: "plate", name: "Weight Plate", emoji: "⭕" },
  { id: "cable", name: "Cable Machine", emoji: "🔗" },
  { id: "trx", name: "TRX Straps", emoji: "🪢" },
  { id: "bosu", name: "Bosu Ball", emoji: "🔵" },
  { id: "medicine-ball", name: "Medicine Ball", emoji: "⚫" },
  { id: "box", name: "Plyo Box / Step", emoji: "📦" },
  { id: "bench", name: "Bench", emoji: "🛋️" },
  { id: "slider", name: "Sliders", emoji: "🛼" },
  { id: "resistance-band", name: "Resistance Band", emoji: "➰" },
  { id: "leg-press", name: "Leg Press", emoji: "🦵" },
  { id: "lat-pulldown", name: "Lat Pulldown", emoji: "⬇️" },
  { id: "seated-row", name: "Seated Row Machine", emoji: "🚣‍♀️" },
  { id: "squat-machine", name: "Squat Machine", emoji: "🪟" },
  { id: "chest-press-machine", name: "Chest Press Machine", emoji: "💪" },
  { id: "smith-machine", name: "Smith Machine", emoji: "🏗️" },
  { id: "swiss-ball", name: "Swiss Ball", emoji: "🟣" },
  { id: "rower", name: "Rowing Machine", emoji: "🚣" },
  { id: "bike", name: "Bike", emoji: "🚴‍♀️" },
  { id: "treadmill", name: "Treadmill", emoji: "🏃‍♀️" },
  { id: "skipping-rope", name: "Skipping Rope", emoji: "🪢" },
  { id: "foam-roller", name: "Foam Roller", emoji: "🧻" },
  { id: "mat", name: "Mat", emoji: "🟩" },
];

export const EQUIPMENT_BY_ID = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e])) as Record<
  Equipment["id"],
  Equipment
>;

export const MUSCLE_LABELS: Record<string, string> = {
  legs: "Legs", glutes: "Glutes", hamstrings: "Hamstrings", quads: "Quads", calves: "Calves",
  back: "Back", lats: "Lats", chest: "Chest", shoulders: "Shoulders", biceps: "Biceps",
  triceps: "Triceps", core: "Core", obliques: "Obliques", "full-body": "Full Body", cardio: "Cardio",
};
