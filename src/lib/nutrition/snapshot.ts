// Nutrients for a logged portion, computed on the server from per-100 g values
// so a tampered form can't change what gets recorded.

export type Per100g = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
};

export type Snapshot = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: Record<string, number>;
};

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

export function snapshotFor(food: Per100g, grams: number): Snapshot {
  const f = grams / 100;
  const nutrients: Record<string, number> = {};
  if (food.fiber_g != null) nutrients.fiber_g = round(Number(food.fiber_g) * f);
  if (food.sugar_g != null) nutrients.sugar_g = round(Number(food.sugar_g) * f);
  if (food.sodium_mg != null) nutrients.sodium_mg = round(Number(food.sodium_mg) * f);
  return {
    calories: round(Number(food.calories) * f),
    protein_g: round(Number(food.protein_g) * f),
    carbs_g: round(Number(food.carbs_g) * f),
    fat_g: round(Number(food.fat_g) * f),
    nutrients,
  };
}

export type Totals = { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number };

export function sumEntries(
  entries: { calories: number | string; protein_g: number | string; carbs_g: number | string; fat_g: number | string; nutrients?: unknown }[],
): Totals {
  const t: Totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
  for (const e of entries) {
    t.calories += Number(e.calories);
    t.protein_g += Number(e.protein_g);
    t.carbs_g += Number(e.carbs_g);
    t.fat_g += Number(e.fat_g);
    const fiber = (e.nutrients as Record<string, unknown> | undefined)?.fiber_g;
    if (typeof fiber === "number") t.fiber_g += fiber;
  }
  return {
    calories: Math.round(t.calories),
    protein_g: round(t.protein_g, 1),
    carbs_g: round(t.carbs_g, 1),
    fat_g: round(t.fat_g, 1),
    fiber_g: round(t.fiber_g, 1),
  };
}
