import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayIn } from "@/lib/dates";
import { decryptHealthValue, hasHealthDataKey } from "@/lib/security/health-crypto";
import { ageOn, type ActivityLevel, type Goal, type Sex } from "@/lib/nutrition/targets";

export type Profile = {
  id: string;
  display_name: string | null;
  date_of_birth: string | null;
  sex: Sex | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  diet_type: string | null;
  allergies: string[];
  timezone: string;
  hide_numbers: boolean;
  onboarding_completed_at: string | null;
};

export type TargetsRow = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  water_ml: number | null;
  source: string;
  effective_from: string;
};

const PROFILE_COLUMNS =
  "id, display_name, date_of_birth, sex, height_cm, activity_level, goal, diet_type, allergies, timezone, hide_numbers, onboarding_completed_at";

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
  return (data as Profile | null) ?? null;
}

export function profileToday(profile: Pick<Profile, "timezone"> | null) {
  return todayIn(profile?.timezone ?? "UTC");
}

export function profileAge(profile: Pick<Profile, "date_of_birth"> | null) {
  return profile?.date_of_birth ? ageOn(new Date(`${profile.date_of_birth}T00:00:00Z`)) : null;
}

/** The targets in force on a given day (the latest row on or before it). */
export async function getTargets(supabase: SupabaseClient, date: string): Promise<TargetsRow | null> {
  const { data } = await supabase
    .from("nutrition_targets")
    .select("calories, protein_g, carbs_g, fat_g, fiber_g, water_ml, source, effective_from")
    .lte("effective_from", date)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as TargetsRow | null) ?? null;
}

/** Most recent weight in kg, decrypted on the server. Null if none or no key configured. */
export async function getLatestWeightKg(supabase: SupabaseClient, userId: string): Promise<number | null> {
  if (!hasHealthDataKey()) return null;
  const { data } = await supabase
    .from("weight_logs")
    .select("weight_kg_enc")
    .order("measured_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  try {
    const kg = Number(decryptHealthValue(userId, data.weight_kg_enc));
    return Number.isFinite(kg) ? kg : null;
  } catch {
    return null;
  }
}
