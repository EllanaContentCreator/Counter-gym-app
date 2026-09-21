import type { DayType, FoodFavourite, NutritionSettings, PlanDay, TargetBand } from "@/lib/types";

/**
 * Target bands rather than single numbers: landing anywhere inside the band is
 * a good day, so a spare 30 calories never reads as a failure.
 *
 * These are starting points. Everything here is editable in Me → Nutrition.
 */
export const DEFAULT_TARGETS: Record<DayType, TargetBand> = {
  strength: { calories: [1700, 1750], protein: [140, 150] },
  cardio: { calories: [1600, 1700], protein: [135, 145] },
  normal: { calories: [1600, 1700], protein: [135, 145] },
  fasting: { calories: [1550, 1650], protein: [130, 145] },
};

export const DEFAULT_NUTRITION: NutritionSettings = {
  targets: DEFAULT_TARGETS,
  startWeight: 82,
  goalWeight: 75,
};

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  strength: "Strength",
  cardio: "Cardio",
  normal: "Normal",
  fasting: "Fasting",
};

export const SLOT_LABEL = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
  extras: "Extras",
} as const;

export const SLOT_ORDER = ["breakfast", "lunch", "snack", "dinner", "extras"] as const;

/**
 * The regular week.
 *
 * Fasting mornings are a separate flag from the day type, because Wednesday is
 * a fasting morning *and* a cardio day — the fast decides when she eats, the
 * day type decides how much.
 *
 * The per-meal calories and protein are estimates that add up to the day totals
 * she gave. Every one of them can be edited, and editing a meal here does not
 * touch anything already logged.
 */
export const DEFAULT_MEAL_PLAN: PlanDay[] = [
  {
    weekday: 0,
    dayType: "fasting",
    fastingMorning: true,
    meals: [
      { id: "mon-lunch", slot: "lunch", title: "Chicken salad bowl", items: ["150–180 g chicken", "Mixed salad", "Avocado", "Feta", "Light dressing"], calories: 560, protein: 50 },
      { id: "mon-snack", slot: "snack", title: "Greek yoghurt and berries", items: ["Greek yoghurt", "Berries"], calories: 200, protein: 20 },
      { id: "mon-dinner", slot: "dinner", title: "Grilled salmon", items: ["Grilled salmon", "Roasted vegetables", "Small potato"], calories: 680, protein: 45 },
      { id: "mon-extra", slot: "extras", title: "Protein shake", items: ["Protein shake"], calories: 160, protein: 25, optional: true },
    ],
  },
  {
    weekday: 1,
    dayType: "strength",
    meals: [
      { id: "tue-post", slot: "breakfast", title: "Post-workout eggs", items: ["2 eggs", "Egg whites", "1 slice sourdough", "High-protein yoghurt"], calories: 480, protein: 45 },
      { id: "tue-lunch", slot: "lunch", title: "Chicken wrap", items: ["Chicken wrap", "Salad", "Small amount cheese"], calories: 520, protein: 40 },
      { id: "tue-snack", slot: "snack", title: "Cottage cheese and fruit", items: ["Cottage cheese", "Fruit"], calories: 220, protein: 25 },
      { id: "tue-dinner", slot: "dinner", title: "Steak and roast potatoes", items: ["Steak", "Roast potatoes", "Greens"], calories: 480, protein: 40 },
    ],
  },
  {
    weekday: 2,
    dayType: "cardio",
    fastingMorning: true,
    meals: [
      { id: "wed-lunch", slot: "lunch", title: "Tuna and egg salad", items: ["Tuna", "Egg", "Avocado", "Salad vegetables"], calories: 520, protein: 45 },
      { id: "wed-snack", slot: "snack", title: "Protein yoghurt or shake", items: ["Protein yoghurt or shake"], calories: 180, protein: 25 },
      { id: "wed-dinner", slot: "dinner", title: "Chicken stir-fry", items: ["Chicken", "Vegetables", "Small serving rice"], calories: 780, protein: 68 },
      { id: "wed-extra", slot: "extras", title: "2 squares chocolate", items: ["2 squares chocolate"], calories: 120, protein: 2, optional: true },
    ],
  },
  {
    weekday: 3,
    dayType: "strength",
    meals: [
      { id: "thu-post", slot: "breakfast", title: "Protein oats", items: ["Oats", "Greek yoghurt or protein powder", "Berries", "Cinnamon"], calories: 450, protein: 35 },
      { id: "thu-lunch", slot: "lunch", title: "Chicken salad bowl", items: ["Chicken", "Mixed salad", "Avocado", "Feta"], calories: 560, protein: 50 },
      { id: "thu-snack", slot: "snack", title: "Boiled eggs and fruit", items: ["2 boiled eggs", "Fruit"], calories: 230, protein: 15 },
      { id: "thu-dinner", slot: "dinner", title: "White fish and mash", items: ["White fish", "Mashed potato", "Vegetables"], calories: 460, protein: 48 },
    ],
  },
  {
    weekday: 4,
    dayType: "normal",
    meals: [
      { id: "fri-break", slot: "breakfast", title: "Yoghurt, berries and granola", items: ["Greek yoghurt", "Berries", "Small amount granola"], calories: 330, protein: 25 },
      { id: "fri-lunch", slot: "lunch", title: "Chicken or tuna wrap", items: ["Chicken or tuna wrap"], calories: 480, protein: 38 },
      { id: "fri-snack", slot: "snack", title: "Cottage cheese or boiled eggs", items: ["Cottage cheese or boiled eggs"], calories: 200, protein: 22 },
      { id: "fri-dinner", slot: "dinner", title: "Lean beef burger bowl", items: ["Lean beef", "Salad", "Tomato", "Pickles", "Cheese", "Oven potatoes"], calories: 640, protein: 55 },
    ],
  },
  {
    weekday: 5,
    dayType: "strength",
    meals: [
      { id: "sat-post", slot: "breakfast", title: "Eggs, sourdough and avocado", items: ["Eggs", "Sourdough", "Avocado", "Protein yoghurt"], calories: 520, protein: 40 },
      { id: "sat-lunch", slot: "lunch", title: "Chicken Caesar-style salad", items: ["Chicken", "Caesar-style salad"], calories: 520, protein: 45 },
      { id: "sat-snack", slot: "snack", title: "Protein shake", items: ["Protein shake"], calories: 160, protein: 25 },
      { id: "sat-dinner", slot: "dinner", title: "Salmon or steak", items: ["Salmon or steak", "Vegetables", "Potato or rice"], calories: 520, protein: 40 },
    ],
  },
  {
    weekday: 6,
    dayType: "fasting",
    fastingMorning: true,
    meals: [
      { id: "sun-lunch", slot: "lunch", title: "Chicken, egg and avocado salad", items: ["Chicken", "Egg", "Avocado", "Salad"], calories: 560, protein: 48 },
      { id: "sun-snack", slot: "snack", title: "Greek yoghurt and berries", items: ["Greek yoghurt", "Berries"], calories: 200, protein: 20 },
      { id: "sun-dinner", slot: "dinner", title: "Fish or chicken roast", items: ["Fish or chicken", "Roast vegetables", "Small carbohydrate serving"], calories: 660, protein: 50 },
      { id: "sun-extra", slot: "extras", title: "Cottage cheese or protein yoghurt", items: ["Cottage cheese or protein yoghurt"], calories: 180, protein: 22, optional: true },
    ],
  },
];

/** The foods eaten week in, week out. One tap each, and all editable. */
export const DEFAULT_FOOD_FAVOURITES: FoodFavourite[] = [
  { id: "fav-eggs", name: "Eggs", quantity: "2 large", calories: 140, protein: 12, slot: "breakfast", uses: 0 },
  { id: "fav-chicken", name: "Chicken breast", quantity: "150 g", calories: 250, protein: 46, slot: "lunch", uses: 0 },
  { id: "fav-steak", name: "Steak", quantity: "150 g", calories: 330, protein: 46, slot: "dinner", uses: 0 },
  { id: "fav-salmon", name: "Salmon", quantity: "150 g", calories: 310, protein: 38, slot: "dinner", uses: 0 },
  { id: "fav-tuna", name: "Tuna", quantity: "1 tin, drained", calories: 130, protein: 29, slot: "lunch", uses: 0 },
  { id: "fav-greek", name: "Greek yoghurt", quantity: "170 g", calories: 120, protein: 17, slot: "snack", uses: 0 },
  { id: "fav-proyog", name: "Protein yoghurt", quantity: "1 pot", calories: 150, protein: 20, slot: "snack", uses: 0 },
  { id: "fav-cottage", name: "Cottage cheese", quantity: "150 g", calories: 145, protein: 20, slot: "snack", uses: 0 },
  { id: "fav-shake", name: "Protein shake", quantity: "1 scoop", calories: 120, protein: 24, slot: "snack", uses: 0 },
  { id: "fav-avocado", name: "Avocado", quantity: "Half", calories: 160, protein: 2, slot: "lunch", uses: 0 },
  { id: "fav-potato", name: "Potatoes", quantity: "150 g", calories: 130, protein: 3, slot: "dinner", uses: 0 },
  { id: "fav-rice", name: "Rice", quantity: "150 g cooked", calories: 200, protein: 4, slot: "dinner", uses: 0 },
  { id: "fav-sourdough", name: "Sourdough", quantity: "1 slice", calories: 130, protein: 5, slot: "breakfast", uses: 0 },
  { id: "fav-wrap", name: "Wrap", quantity: "1 wrap", calories: 200, protein: 6, slot: "lunch", uses: 0 },
  { id: "fav-berries", name: "Berries", quantity: "100 g", calories: 50, protein: 1, slot: "snack", uses: 0 },
];
