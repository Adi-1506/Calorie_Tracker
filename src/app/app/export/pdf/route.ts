import { getApiUser } from "@/lib/auth";
import { getProfile, getTargets, profileToday } from "@/lib/data/profile";
import { getWeights } from "@/lib/data/progress";
import { addDays } from "@/lib/dates";
import { buildReport, type ReportDay } from "@/lib/export/pdf";
import { rateLimitUser } from "@/lib/security/rate-limit";

// A 30-day PDF summary of the signed-in user's own log.

export async function GET() {
  const { user, supabase } = await getApiUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!(await rateLimitUser("dataExport", user.id))) return new Response("Too many exports. Please try again later.", { status: 429 });

  const profile = await getProfile(supabase, user.id);
  const to = profile ? profileToday(profile) : new Date().toISOString().slice(0, 10);
  const from = addDays(to, -29);

  const [{ data: entries }, targets, weights] = await Promise.all([
    supabase.from("meal_entries").select("logged_on, calories, protein_g, carbs_g, fat_g").gte("logged_on", from).lte("logged_on", to).limit(5000),
    getTargets(supabase, to),
    getWeights(supabase, user.id),
  ]);

  const byDay = new Map<string, ReportDay>();
  for (let d = from; d <= to; d = addDays(d, 1)) byDay.set(d, { date: d, calories: 0, protein: 0, carbs: 0, fat: 0 });
  for (const e of entries ?? []) {
    const day = byDay.get(e.logged_on);
    if (!day) continue;
    day.calories += Number(e.calories);
    day.protein += Number(e.protein_g);
    day.carbs += Number(e.carbs_g);
    day.fat += Number(e.fat_g);
  }

  const pdf = await buildReport({
    name: profile?.display_name ?? null,
    from,
    to,
    target: targets?.calories ?? null,
    days: [...byDay.values()],
    weights: weights.filter((w) => w.date >= from).reverse(),
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="calorie-tracker-report-${to}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
