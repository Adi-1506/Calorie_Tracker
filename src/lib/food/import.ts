import "server-only";
import type { ExternalFood } from "@/lib/food/external";
import { createAdminClient } from "@/lib/supabase/admin";

/** Stores an external product in the shared catalogue (service role) and returns its id. */
export async function importExternalFood(food: ExternalFood): Promise<string | null> {
  const admin = createAdminClient();
  const existing = await admin
    .from("foods")
    .select("id")
    .eq("source", food.source)
    .eq("external_id", food.externalId)
    .is("owner_id", null)
    .maybeSingle();
  if (existing.data) return existing.data.id;

  const { data, error } = await admin
    .from("foods")
    .insert({
      owner_id: null,
      source: food.source,
      external_id: food.externalId,
      name: food.name,
      brand: food.brand,
      barcode: food.barcode,
      is_verified: false,
      ...food.per100g,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return importExternalFood(food); // imported concurrently
    return null;
  }
  if (food.serving) {
    await admin.from("food_servings").insert({ food_id: data.id, label: food.serving.label.slice(0, 80), grams: food.serving.grams });
  }
  return data.id;
}

