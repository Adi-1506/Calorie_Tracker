"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProfile, profileAge, profileToday } from "@/lib/data/profile";
import { serverEnv, isProduction } from "@/lib/env.server";
import { getOpenFoodFactsProduct, getUsdaFood, type ExternalFood } from "@/lib/food/external";
import { CALORIE_FLOOR, suggestTargets } from "@/lib/nutrition/targets";
import { snapshotFor } from "@/lib/nutrition/snapshot";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/security/audit";
import { encryptHealthValue, hasHealthDataKey } from "@/lib/security/health-crypto";
import { rateLimitUser } from "@/lib/security/rate-limit";
import type { FormState } from "@/lib/validation/auth";
import {
  customFoodSchema,
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

/** Stores an external product in the shared catalogue (service role) and returns its id. */
async function importExternalFood(food: ExternalFood): Promise<string | null> {
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

