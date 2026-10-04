import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoachDay } from "@/lib/ai/coach";
import { getTargets, profileAge, profileToday, type Profile } from "@/lib/data/profile";
import { sumEntries } from "@/lib/nutrition/snapshot";
import { isMinor } from "@/lib/nutrition/targets";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_DAILY_LIMITS, type AiFeature } from "@/lib/ai/access";

/** Today's numbers for the coach, read through the user's own client (RLS). */
export async function getCoachDay(supabase: SupabaseClient, profile: Profile): Promise<CoachDay> {
  const today = profileToday(profile);
  const [targets, { data }] = await Promise.all([
    getTargets(supabase, today),
    supabase
      .from("meal_entries")
      .select("meal, label, calories, protein_g, carbs_g, fat_g")
      .eq("logged_on", today)
      .order("created_at")
      .limit(60),
  ]);
  const entries = data ?? [];
  const totals = sumEntries(entries);
  const age = profileAge(profile);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: profile.timezone }).format(new Date()));
  return {
    goal: profile.goal,
    dietType: profile.diet_type,
    allergies: profile.allergies ?? [],
    minor: age === null ? false : isMinor(age),
    hideNumbers: profile.hide_numbers,
    hour,
    targets: targets
      ? { calories: Number(targets.calories), proteinG: Number(targets.protein_g), carbsG: Number(targets.carbs_g), fatG: Number(targets.fat_g) }
      : null,
    eaten: { calories: totals.calories, proteinG: totals.protein_g, carbsG: totals.carbs_g, fatG: totals.fat_g },
    meals: entries.map((e) => ({ meal: e.meal as string, label: e.label as string, calories: Number(e.calories) })),
  };
}

/** How many requests the user has left today for a feature. */
export async function aiRemaining(userId: string, feature: AiFeature) {
  const { data } = await createAdminClient()
    .from("ai_usage")
    .select("requests")
    .eq("user_id", userId)
    .eq("feature", feature)
    .eq("usage_date", new Date().toISOString().slice(0, 10))
    .maybeSingle();
  return Math.max(0, AI_DAILY_LIMITS[feature] - (data?.requests ?? 0));
}
