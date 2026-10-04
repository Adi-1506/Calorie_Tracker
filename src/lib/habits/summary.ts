import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/dates";
import { awardBadges } from "./badges";
import { loggingStreak } from "./streak";

/**
 * Today's streak, plus any badges earned since the last visit. Called from the
 * Today page, so a badge appears the next time the user looks at their day.
 */
export async function habitSummary(
  supabase: SupabaseClient,
  userId: string,
  today: string,
  waterGoalMetToday: boolean,
): Promise<{ streak: number; newBadges: { code: string; name: string; description: string }[] }> {
  const since = addDays(today, -400);
  const [days, logs, recipes, weighIns, fasts] = await Promise.all([
    supabase.from("meal_entries").select("logged_on").gte("logged_on", since).order("logged_on", { ascending: false }).limit(5000),
    supabase.from("meal_entries").select("id", { count: "exact", head: true }),
    supabase.from("recipes").select("id", { count: "exact", head: true }),
    supabase.from("weight_logs").select("id", { count: "exact", head: true }),
    supabase.from("fasting_sessions").select("started_at, ended_at, target_hours").not("ended_at", "is", null).limit(100),
  ]);
  const streak = loggingStreak((days.data ?? []).map((d) => d.logged_on as string), today);
  const completedFasts = (fasts.data ?? []).filter(
    (f) => (Date.parse(f.ended_at as string) - Date.parse(f.started_at as string)) / 3_600_000 >= Number(f.target_hours),
  ).length;

  const fresh = await awardBadges(supabase, userId, {
    streak,
    totalLogs: logs.count ?? 0,
    recipes: recipes.count ?? 0,
    weighIns: weighIns.count ?? 0,
    waterGoalMet: waterGoalMetToday,
    completedFasts,
  });
  if (fresh.length === 0) return { streak, newBadges: [] };
  const { data } = await supabase.from("badges").select("code, name, description").in("code", fresh);
  return { streak, newBadges: data ?? [] };
}
