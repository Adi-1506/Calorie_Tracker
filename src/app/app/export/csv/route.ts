import { getApiUser } from "@/lib/auth";
import { getMeasurements, getWeights } from "@/lib/data/progress";
import { toCsv } from "@/lib/export/csv";
import { rateLimitUser } from "@/lib/security/rate-limit";
import { MEASUREMENTS, exportSchema } from "@/lib/validation/progress";

// Downloads the signed-in user's own data as CSV. Reads go through the user's
// client, so RLS limits them to their rows. Cells are formula-safe.

const PAGE = 1000;
const MAX_ROWS = 50_000;

export async function GET(request: Request) {
  const parsed = exportSchema.safeParse({ type: new URL(request.url).searchParams.get("type") });
  if (!parsed.success) return new Response("Unknown export", { status: 400 });

  const { user, supabase } = await getApiUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!(await rateLimitUser("dataExport", user.id))) return new Response("Too many exports. Please try again later.", { status: 429 });

  let csv: string;
  if (parsed.data.type === "food") {
    const rows: unknown[][] = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const { data, error } = await supabase
        .from("meal_entries")
        .select("logged_on, meal, label, grams, calories, protein_g, carbs_g, fat_g")
        .order("logged_on")
        .order("created_at")
        .range(from, from + PAGE - 1);
      if (error) return new Response("Export failed", { status: 500 });
      for (const e of data) rows.push([e.logged_on, e.meal, e.label, e.grams, e.calories, e.protein_g, e.carbs_g, e.fat_g]);
      if (data.length < PAGE) break;
    }
    csv = toCsv(["date", "meal", "food", "grams", "calories", "protein_g", "carbs_g", "fat_g"], rows);
  } else if (parsed.data.type === "weight") {
    const weights = (await getWeights(supabase, user.id)).reverse();
    csv = toCsv(["date", "weight_kg"], weights.map((w) => [w.date, w.kg]));
  } else {
    const entries = (await getMeasurements(supabase, user.id)).reverse();
    csv = toCsv(["date", ...MEASUREMENTS.map((m) => `${m.key}_cm`)], entries.map((e) => [e.date, ...MEASUREMENTS.map((m) => e.values[m.key] ?? null)]));
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calorie-tracker-${parsed.data.type}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
