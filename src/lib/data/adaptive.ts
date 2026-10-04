import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/dates";
import { adaptiveSuggestion, type AdaptiveSuggestion } from "@/lib/nutrition/adaptive";
import { isMinor } from "@/lib/nutrition/targets";
import { weeklyChange } from "@/lib/nutrition/trend";
import { getTargets, profileAge, profileToday, type Profile } from "./profile";
import { getWeights } from "./progress";

/** Works out this week's suggestion from the user's own log. Used by the page and, again, by the action that applies it. */
export async function getAdaptiveSuggestion(supabase: SupabaseClient, userId: string, profile: Profile): Promise<AdaptiveSuggestion | null> {
  if (!profile.goal || !profile.sex) return null;
  const today = profileToday(profile);
  const from = addDays(today, -14);
  const [targets, weights, { data: entries }] = await Promise.all([
    getTargets(supabase, today),
    getWeights(supabase, userId),
    // The last 14 full days; today is still in progress.
    supabase.from("meal_entries").select("logged_on, calories").gte("logged_on", from).lt("logged_on", today).limit(5000),
  ]);
  if (!targets) return null;
  // One check-in a week: after accepting one, wait seven days before suggesting again.
  if (targets.source === "adaptive" && targets.effective_from > addDays(today, -7)) return null;

  const perDay = new Map<string, number>();
  for (const e of entries ?? []) perDay.set(e.logged_on, (perDay.get(e.logged_on) ?? 0) + Number(e.calories));
  const totals = [...perDay.values()];
  const avgIntake = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  const recent = weights.filter((w) => w.date >= addDays(today, -28)).map((w) => ({ date: w.date, kg: w.kg }));
  const age = profileAge(profile);

  return adaptiveSuggestion({
    goal: profile.goal,
    sex: profile.sex,
    isMinor: age == null || isMinor(age),
    currentCalories: targets.calories,
    avgIntake,
    loggedDays: totals.length,
    weeklyChangeKg: weeklyChange(recent),
  });
}
