import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type BadgeFacts = {
  streak: number;
  totalLogs: number;
  recipes: number;
  weighIns: number;
  waterGoalMet: boolean;
  completedFasts: number;
};

/** Which badges these facts earn. Pure, so it's easy to test. */
export function earnedBadges(f: BadgeFacts): string[] {
  const codes: string[] = [];
  if (f.totalLogs >= 1) codes.push("first_log");
  if (f.streak >= 3) codes.push("streak_3");
  if (f.streak >= 7) codes.push("streak_7");
  if (f.streak >= 30) codes.push("streak_30");
  if (f.totalLogs >= 100) codes.push("logs_100");
  if (f.recipes >= 1) codes.push("first_recipe");
  if (f.weighIns >= 2) codes.push("first_weigh_in"); // the onboarding weight doesn't count
  if (f.waterGoalMet) codes.push("water_goal");
  if (f.completedFasts >= 1) codes.push("first_fast");
  return codes;
}

/**
 * Awards any newly earned badges and returns the codes that are new. Users
 * can't write user_badges (security item 8), so this uses the service role,
 * always with the signed-in user's own id.
 */
export async function awardBadges(supabase: SupabaseClient, userId: string, facts: BadgeFacts): Promise<string[]> {
  const earned = earnedBadges(facts);
  if (earned.length === 0) return [];
  const { data: have } = await supabase.from("user_badges").select("badge_code");
  const owned = new Set((have ?? []).map((b) => b.badge_code as string));
  const fresh = earned.filter((c) => !owned.has(c));
  if (fresh.length === 0) return [];
  const { error } = await createAdminClient()
    .from("user_badges")
    .upsert(
      fresh.map((badge_code) => ({ user_id: userId, badge_code })),
      { onConflict: "user_id,badge_code", ignoreDuplicates: true },
    );
  return error ? [] : fresh;
}
