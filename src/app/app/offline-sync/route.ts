import { getApiUser } from "@/lib/auth";
import { isIsoDate } from "@/lib/dates";
import { getProfile, profileToday } from "@/lib/data/profile";
import { offlineBatchSchema } from "@/lib/offline/schema";
import { rateLimitUser } from "@/lib/security/rate-limit";
import { isSameOrigin } from "@/lib/security/same-origin";

// Receives entries logged while offline (spec: offline mode with sync). Items
// are validated like the online forms, written with the user's own session so
// RLS applies, and deduplicated on (user_id, client_id), so retries are safe.

const json = (status: number, body: Record<string, unknown>) => Response.json(body, { status });
const MAX_BODY = 64 * 1024;

function reasonableDate(date: string, today: string) {
  const diffDays = (Date.parse(date) - Date.parse(today)) / 86_400_000;
  return isIsoDate(date) && diffDays >= -366 && diffDays <= 7;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request.headers)) return json(403, { error: "Forbidden" });
  const length = Number(request.headers.get("content-length"));
  if (!length || length > MAX_BODY) return json(413, { error: "Too much at once." });

  const { user, supabase } = await getApiUser();
  if (!user) return json(401, { error: "Please log in again." });
  if (!(await rateLimitUser("offlineSync", user.id))) return json(429, { error: "Please try again in a minute." });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid request." });
  }
  const parsed = offlineBatchSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: "Invalid request." });

  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) return json(409, { error: "Finish setting up your account first." });
  const today = profileToday(profile);

  const items = parsed.data.items;
  const rejected = items.filter((i) => !reasonableDate(i.date, today)).map((i) => i.clientId);
  const ok = items.filter((i) => !rejected.includes(i.clientId));

  const meals = ok.flatMap((i) =>
    i.kind === "food"
      ? [
          {
            user_id: user.id,
            client_id: i.clientId,
            meal: i.meal,
            logged_on: i.date,
            label: i.label || "Quick add",
            grams: null,
            food_id: null,
            calories: i.calories,
            protein_g: i.proteinG,
            carbs_g: i.carbsG,
            fat_g: i.fatG,
            nutrients: {},
            is_quick_add: true,
          },
        ]
      : [],
  );
  const water = ok.flatMap((i) => (i.kind === "water" ? [{ user_id: user.id, client_id: i.clientId, logged_on: i.date, ml: i.ml }] : []));

  const [m, w] = await Promise.all([
    meals.length ? supabase.from("meal_entries").upsert(meals, { onConflict: "user_id,client_id", ignoreDuplicates: true }) : null,
    water.length ? supabase.from("water_logs").upsert(water, { onConflict: "user_id,client_id", ignoreDuplicates: true }) : null,
  ]);
  if (m?.error || w?.error) return json(500, { error: "Couldn't save. We'll try again." });

  return json(200, { synced: ok.map((i) => i.clientId), rejected });
}
