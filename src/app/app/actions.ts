"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getAdaptiveSuggestion } from "@/lib/data/adaptive";
import { getProfile, getTargets, profileAge, profileToday } from "@/lib/data/profile";
import { serverEnv, isProduction } from "@/lib/env.server";
import { getOpenFoodFactsProduct, getUsdaFood, type ExternalFood } from "@/lib/food/external";
import { importExternalFood } from "@/lib/food/import";
import { parseRecipeHtml } from "@/lib/food/recipe-parse";
import { safeFetchHtml, UnsafeUrlError } from "@/lib/security/safe-fetch";
import { CALORIE_FLOOR, suggestTargets } from "@/lib/nutrition/targets";
import { snapshotFor } from "@/lib/nutrition/snapshot";
import { audit } from "@/lib/security/audit";
import { encryptHealthValue, hasHealthDataKey } from "@/lib/security/health-crypto";
import { rateLimitUser } from "@/lib/security/rate-limit";
import type { FormState } from "@/lib/validation/auth";
import { combine, getRecipe } from "@/lib/data/recipes";
import {
  copyEntriesSchema,
  customFoodSchema,
  favoriteSchema,
  importedLineSchema,
  importRecipeSchema,
  ingredientSchema,
  logRecipeSchema,
  recipeSchema,
  removeIngredientSchema,
  deleteEntrySchema,
  logExternalFoodSchema,
  logFoodSchema,
  quickAddSchema,
  waterSchema,
} from "@/lib/validation/food";
import { onboardingSchema, parseAllergies, targetsSchema } from "@/lib/validation/profile";

// Every action re-checks the session (item 6), validates input with the same
// Zod schema as the form (item 14) and writes through the user's own Supabase
// client, so RLS still applies (item 4). Nutrient snapshots are computed here,
// never taken from the form. Upserts leave out user_id: it defaults to
// auth.uid(), and clients may not update it, so ON CONFLICT can't move a row.

const SLOW_DOWN = "You're doing that a lot. Please wait a moment and try again.";
const GENERIC = "Something went wrong. Please try again.";

function invalid(error: z.ZodError): FormState {
  return { status: "error", fieldErrors: z.flattenError(error).fieldErrors };
}

/** Only allow log dates a little around "today" so typos don't land years away. */
function reasonableDate(date: string, today: string) {
  const diffDays = (Date.parse(date) - Date.parse(today)) / 86_400_000;
  return diffDays >= -366 && diffDays <= 7;
}

function backToDay(date: string, today: string): never {
  redirect(date === today ? "/app" : `/app?date=${date}`);
}

// ---------------------------------------------------------------------------
// Onboarding and targets
// ---------------------------------------------------------------------------
export async function completeOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase } = await requireUser();
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  if (isProduction && !hasHealthDataKey()) {
    console.error("HEALTH_DATA_ENCRYPTION_KEY is missing; refusing to store weight");
    return { status: "error", message: GENERIC };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: v.displayName || null,
      date_of_birth: v.dateOfBirth,
      sex: v.sex,
      height_cm: v.heightCm,
      activity_level: v.activity,
      goal: v.goal,
      diet_type: v.dietType || null,
      allergies: parseAllergies(v.allergies),
      timezone: v.timezone,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (profileError) {
    // The database trigger is the last line of defence for item 50.
    if (profileError.code === "23514") {
      return { status: "error", fieldErrors: { goal: ["This goal isn't available for people under 18"] } };
    }
    return { status: "error", message: GENERIC };
  }

  const today = profileToday({ timezone: v.timezone });
  if (hasHealthDataKey()) {
    await supabase
      .from("weight_logs")
      .upsert(
        { measured_on: today, weight_kg_enc: encryptHealthValue(user.id, String(v.weightKg)) },
        { onConflict: "user_id,measured_on" },
      );
  }

  const age = profileAge({ date_of_birth: v.dateOfBirth }) ?? 30;
  const t = suggestTargets({ sex: v.sex, weightKg: v.weightKg, heightCm: v.heightCm, age, activity: v.activity, goal: v.goal });
  const { error: targetError } = await supabase.from("nutrition_targets").upsert(
    {
      effective_from: today,
      calories: t.calories,
      protein_g: t.proteinG,
      carbs_g: t.carbsG,
      fat_g: t.fatG,
      fiber_g: t.fiberG,
      water_ml: t.waterMl,
      source: "calculated",
    },
    { onConflict: "user_id,effective_from" },
  );
  if (targetError) return { status: "error", message: GENERIC };

  await audit("onboarding_completed", { userId: user.id });
  redirect("/app/targets?welcome=1");
}

export async function saveTargets(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) redirect("/app/onboarding");

  // The floor comes from the profile, not the form (item 49).
  const floor = CALORIE_FLOOR[profile.sex ?? "female"];
  const parsed = targetsSchema.safeParse({ ...Object.fromEntries(formData), floor });
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const today = profileToday(profile);
  const { error } = await supabase.from("nutrition_targets").upsert(
    {
      effective_from: today,
      calories: v.calories,
      protein_g: v.proteinG,
      carbs_g: v.carbsG,
      fat_g: v.fatG,
      water_ml: v.waterMl,
      source: "manual",
    },
    { onConflict: "user_id,effective_from" },
  );
  if (error) return { status: "error", message: GENERIC };

  await audit("targets_changed", { userId: user.id });
  redirect("/app");
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
async function loggingContext() {
  const ctx = await requireUser();
  const profile = await getProfile(ctx.supabase, ctx.user.id);
  if (!profile?.onboarding_completed_at) redirect("/app/onboarding");
  return { ...ctx, profile, today: profileToday(profile) };
}

type EntryInsert = {
  meal: string;
  logged_on: string;
  label: string;
  grams: number | null;
  food_id: string | null;
  recipe_id?: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: Record<string, number>;
  is_quick_add: boolean;
  client_id?: string;
};

async function insertEntry(ctx: Awaited<ReturnType<typeof loggingContext>>, entry: EntryInsert): Promise<FormState | null> {
  if (!reasonableDate(entry.logged_on, ctx.today)) return { status: "error", message: "Pick a date within the last year." };
  if (!(await rateLimitUser("logWrite", ctx.user.id))) return { status: "error", message: SLOW_DOWN };
  const { error } = await ctx.supabase.from("meal_entries").insert({ ...entry, user_id: ctx.user.id });
  // A repeated client_id means the same submission arrived twice; treat it as done.
  if (error && error.code !== "23505") return { status: "error", message: GENERIC };
  return null;
}

export async function logFood(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await loggingContext();
  const parsed = logFoodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  // Read through RLS: only catalogue foods or the user's own foods are visible.
  const { data: food } = await ctx.supabase
    .from("foods")
    .select("id, name, brand, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, food_servings (id, label, grams)")
    .eq("id", v.foodId)
    .maybeSingle();
  if (!food) return { status: "error", message: "That food couldn't be found." };

  let grams = v.quantity;
  let portion = `${v.quantity} g`;
  if (v.servingId) {
    const serving = food.food_servings.find((s: { id: string }) => s.id === v.servingId);
    if (!serving) return { status: "error", message: "That portion size couldn't be found." };
    grams = Number(serving.grams) * v.quantity;
    portion = `${v.quantity} × ${serving.label}`;
  }
  if (grams > 10000) return { status: "error", fieldErrors: { quantity: ["That's more than 10 kg"] } };

  const error = await insertEntry(ctx, {
    meal: v.meal,
    logged_on: v.date,
    label: `${food.name}${food.brand ? ` (${food.brand})` : ""}, ${portion}`.slice(0, 200),
    grams: Math.round(grams * 100) / 100,
    food_id: food.id,
    ...snapshotFor(food, grams),
    is_quick_add: false,
    client_id: v.clientId,
  });
  if (error) return error;
  backToDay(v.date, ctx.today);
}

export async function logExternalFood(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await loggingContext();
  const parsed = logExternalFoodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  if (!(await rateLimitUser("externalFood", ctx.user.id))) return { status: "error", message: SLOW_DOWN };

  let food: ExternalFood | null = null;
  try {
    food =
      v.source === "usda"
        ? await getUsdaFood(v.externalId, serverEnv().usdaApiKey)
        : await getOpenFoodFactsProduct(v.externalId);
  } catch {
    food = null;
  }
  if (!food) return { status: "error", message: "We couldn't load that product right now. Try again, or use quick add." };

  const foodId = await importExternalFood(food);
  const error = await insertEntry(ctx, {
    meal: v.meal,
    logged_on: v.date,
    label: `${food.name}${food.brand ? ` (${food.brand})` : ""}, ${v.grams} g`.slice(0, 200),
    grams: v.grams,
    food_id: foodId,
    ...snapshotFor(food.per100g, v.grams),
    is_quick_add: false,
    client_id: v.clientId,
  });
  if (error) return error;
  backToDay(v.date, ctx.today);
}

export async function quickAdd(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await loggingContext();
  const parsed = quickAddSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const error = await insertEntry(ctx, {
    meal: v.meal,
    logged_on: v.date,
    label: v.label || "Quick add",
    grams: null,
    food_id: null,
    calories: v.calories,
    protein_g: v.proteinG ?? 0,
    carbs_g: v.carbsG ?? 0,
    fat_g: v.fatG ?? 0,
    nutrients: {},
    is_quick_add: true,
    client_id: v.clientId,
  });
  if (error) return error;
  backToDay(v.date, ctx.today);
}

export async function createCustomFood(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await loggingContext();
  const parsed = customFoodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  if (!(await rateLimitUser("logWrite", ctx.user.id))) return { status: "error", message: SLOW_DOWN };

  // owner_id defaults to auth.uid(); RLS forces source = 'user' and is_verified = false.
  const { data, error } = await ctx.supabase
    .from("foods")
    .insert({
      name: v.name,
      name_local: v.nameLocal || null,
      brand: v.brand || null,
      calories: v.calories,
      protein_g: v.proteinG,
      carbs_g: v.carbsG,
      fat_g: v.fatG,
      fiber_g: v.fiberG ?? null,
      barcode: v.barcode ?? null,
    })
    .select("id")
    .single();
  if (error) return { status: "error", message: GENERIC };

  if (v.servingLabel && v.servingGrams) {
    await ctx.supabase.from("food_servings").insert({ food_id: data.id, label: v.servingLabel, grams: v.servingGrams });
  }
  await audit("custom_food_created", { userId: ctx.user.id });

  const meal = String(formData.get("meal") ?? "");
  const date = String(formData.get("date") ?? "");
  const params = new URLSearchParams({ q: v.name });
  if (/^(breakfast|lunch|dinner|snack)$/.test(meal)) params.set("meal", meal);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) params.set("date", date);
  redirect(`/app/log?${params}`);
}

export async function addWater(formData: FormData): Promise<void> {
  const ctx = await loggingContext();
  const parsed = waterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !reasonableDate(parsed.data.date, ctx.today)) return;
  if (!(await rateLimitUser("logWrite", ctx.user.id))) return;
  await ctx.supabase
    .from("water_logs")
    .insert({ user_id: ctx.user.id, logged_on: parsed.data.date, ml: parsed.data.ml, client_id: parsed.data.clientId });
  refresh();
}

export async function deleteEntry(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const parsed = deleteEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  // RLS limits the delete to the user's own rows, so a guessed id does nothing (item 7).
  await supabase.from(parsed.data.kind === "meal" ? "meal_entries" : "water_logs").delete().eq("id", parsed.data.id);
  refresh();
}


export async function toggleFavorite(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const parsed = favoriteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  if (!(await rateLimitUser("logWrite", user.id))) return;
  if (parsed.data.favorite === "1") {
    // RLS on foods means you can only favourite a food you can see.
    const { data: food } = await supabase.from("foods").select("id").eq("id", parsed.data.foodId).maybeSingle();
    if (food) await supabase.from("favorite_foods").upsert({ food_id: food.id }, { onConflict: "user_id,food_id", ignoreDuplicates: true });
  } else {
    await supabase.from("favorite_foods").delete().eq("food_id", parsed.data.foodId);
  }
  refresh();
}

const MAX_COPY = 100;

/** Copies one meal (or a whole day) from one date to another, keeping the original nutrient snapshots. */
export async function copyEntries(formData: FormData): Promise<void> {
  const ctx = await loggingContext();
  const parsed = copyEntriesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { fromDate, toDate, meal } = parsed.data;
  if (fromDate === toDate || !reasonableDate(fromDate, ctx.today) || !reasonableDate(toDate, ctx.today)) return;
  if (!(await rateLimitUser("logWrite", ctx.user.id))) return;

  let query = ctx.supabase
    .from("meal_entries")
    .select("meal, food_id, recipe_id, label, grams, calories, protein_g, carbs_g, fat_g, nutrients, is_quick_add")
    .eq("logged_on", fromDate)
    .order("created_at")
    .limit(MAX_COPY);
  if (meal) query = query.eq("meal", meal);
  const { data } = await query;
  if (!data?.length) return;

  await ctx.supabase.from("meal_entries").insert(data.map((e) => ({ ...e, logged_on: toDate })));
  refresh();
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------
export async function createRecipe(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const parsed = recipeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimitUser("logWrite", user.id))) return { status: "error", message: SLOW_DOWN };
  const { data, error } = await supabase
    .from("recipes")
    .insert({ name: parsed.data.name, servings: parsed.data.servings })
    .select("id")
    .single();
  if (error) return { status: "error", message: GENERIC };
  redirect(`/app/recipes/${data.id}`);
}

export async function addIngredient(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const parsed = ingredientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimitUser("logWrite", user.id))) return { status: "error", message: SLOW_DOWN };
  // RLS checks that the recipe is yours and the food is one you can see.
  const { error } = await supabase
    .from("recipe_ingredients")
    .insert({ recipe_id: parsed.data.recipeId, food_id: parsed.data.foodId, grams: parsed.data.grams });
  if (error) return { status: "error", message: GENERIC };
  redirect(`/app/recipes/${parsed.data.recipeId}`);
}

export async function removeIngredient(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const parsed = removeIngredientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await supabase.from("recipe_ingredients").delete().eq("id", parsed.data.ingredientId).eq("recipe_id", parsed.data.recipeId);
  refresh();
}

export async function deleteRecipe(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = z.uuid().safeParse(formData.get("recipeId"));
  if (!id.success) return;
  await supabase.from("recipes").delete().eq("id", id.data);
  redirect("/app/recipes");
}

export async function logRecipe(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await loggingContext();
  const parsed = logRecipeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const recipe = await getRecipe(ctx.supabase, v.recipeId);
  if (!recipe) return { status: "error", message: "That recipe couldn't be found." };
  if (recipe.ingredients.length === 0) return { status: "error", message: "Add some ingredients first." };

  const portion = combine([recipe.perServing], 1 / v.servings);
  const error = await insertEntry(ctx, {
    meal: v.meal,
    logged_on: v.date,
    label: `${recipe.name}, ${v.servings} ${v.servings === 1 ? "serving" : "servings"}`.slice(0, 200),
    grams: null,
    food_id: null,
    recipe_id: recipe.id,
    ...portion,
    is_quick_add: false,
    client_id: v.clientId,
  });
  if (error) return error;
  backToDay(v.date, ctx.today);
}

export async function importRecipe(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const parsed = importRecipeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimitUser("recipeImport", user.id))) {
    return { status: "error", message: "You've imported a lot of recipes. Please try again in an hour." };
  }

  let page: { url: string; html: string };
  try {
    page = await safeFetchHtml(parsed.data.url);
  } catch (e) {
    return { status: "error", message: e instanceof UnsafeUrlError ? e.message : "We couldn't open that page." };
  }
  const recipe = parseRecipeHtml(page.html);
  if (!recipe) {
    return { status: "error", message: "We couldn't find a recipe on that page. You can still build it by hand." };
  }

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      name: recipe.name,
      servings: recipe.servings,
      source_url: page.url.slice(0, 2048),
      imported_ingredients: recipe.ingredients,
      site_calories_per_serving: recipe.caloriesPerServing,
    })
    .select("id")
    .single();
  if (error) return { status: "error", message: GENERIC };
  redirect(`/app/recipes/${data.id}`);
}

/** Ticks an imported ingredient line off the to-do list. */
export async function dismissImportedLine(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const parsed = importedLineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { data } = await supabase.from("recipes").select("imported_ingredients").eq("id", parsed.data.recipeId).maybeSingle();
  if (!data) return;
  const lines = (data.imported_ingredients as string[]).filter((_, i) => i !== parsed.data.index);
  await supabase.from("recipes").update({ imported_ingredients: lines }).eq("id", parsed.data.recipeId);
  refresh();
}

/** Applies this week's adaptive target. Recomputed here; nothing from the form is trusted. */
export async function applyAdaptiveTarget(): Promise<void> {
  const { user, supabase } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) redirect("/app/onboarding");
  const suggestion = await getAdaptiveSuggestion(supabase, user.id, profile);
  const today = profileToday(profile);
  const current = await getTargets(supabase, today);
  if (!suggestion || !current) redirect("/app/targets");

  // Keep protein in grams; move carbs and fat in proportion to the calorie change.
  const ratio = (suggestion.calories - current.protein_g * 4) / Math.max(current.calories - current.protein_g * 4, 1);
  const { error } = await supabase.from("nutrition_targets").upsert(
    {
      effective_from: today,
      calories: suggestion.calories,
      protein_g: current.protein_g,
      carbs_g: Math.max(0, Math.round(current.carbs_g * ratio)),
      fat_g: Math.max(0, Math.round(current.fat_g * ratio)),
      water_ml: current.water_ml,
      source: "adaptive",
    },
    { onConflict: "user_id,effective_from" },
  );
  if (!error) await audit("targets_changed", { userId: user.id });
  redirect("/app/targets?adjusted=1");
}
