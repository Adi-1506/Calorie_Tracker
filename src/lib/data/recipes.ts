import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { snapshotFor, type Per100g, type Snapshot } from "@/lib/nutrition/snapshot";

export type RecipeIngredient = {
  id: string;
  grams: number;
  food: Per100g & { id: string; name: string; brand: string | null };
};

export type Recipe = {
  id: string;
  name: string;
  servings: number;
  source_url: string | null;
  imported_ingredients: string[];
  site_calories_per_serving: number | null;
  ingredients: RecipeIngredient[];
  total: Snapshot;
  perServing: Snapshot;
};

const round = (n: number) => Math.round(n * 100) / 100;

export function combine(parts: Snapshot[], divideBy = 1): Snapshot {
  const out: Snapshot = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, nutrients: {} };
  for (const p of parts) {
    out.calories += p.calories;
    out.protein_g += p.protein_g;
    out.carbs_g += p.carbs_g;
    out.fat_g += p.fat_g;
    for (const [k, v] of Object.entries(p.nutrients)) out.nutrients[k] = (out.nutrients[k] ?? 0) + v;
  }
  const d = divideBy > 0 ? divideBy : 1;
  return {
    calories: round(out.calories / d),
    protein_g: round(out.protein_g / d),
    carbs_g: round(out.carbs_g / d),
    fat_g: round(out.fat_g / d),
    nutrients: Object.fromEntries(Object.entries(out.nutrients).map(([k, v]) => [k, round(v / d)])),
  };
}

/** Loads one of the user's recipes (RLS) and works out its nutrition on the server. */
export async function getRecipe(supabase: SupabaseClient, id: string): Promise<Recipe | null> {
  const { data } = await supabase
    .from("recipes")
    .select(
      "id, name, servings, source_url, imported_ingredients, site_calories_per_serving, recipe_ingredients (id, grams, foods (id, name, brand, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const ingredients = ((data.recipe_ingredients ?? []) as unknown as { id: string; grams: number; foods: RecipeIngredient["food"] | null }[])
    .filter((i) => i.foods)
    .map((i) => ({ id: i.id, grams: Number(i.grams), food: i.foods as RecipeIngredient["food"] }));
  const parts = ingredients.map((i) => snapshotFor(i.food, i.grams));
  const servings = Number(data.servings);
  return {
    id: data.id,
    name: data.name,
    servings,
    source_url: data.source_url,
    imported_ingredients: (data.imported_ingredients ?? []) as string[],
    site_calories_per_serving: data.site_calories_per_serving,
    ingredients,
    total: combine(parts),
    perServing: combine(parts, servings),
  };
}
