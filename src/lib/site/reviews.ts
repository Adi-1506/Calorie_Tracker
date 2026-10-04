import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PublicReview = { id: string; rating: number; title: string | null; body: string; created_at: string };

/**
 * Published reviews only (RLS enforces this for anonymous visitors too).
 * Reviews come from signed-in accounts and are moderated; nothing is seeded.
 */
export async function getPublishedReviews(limit = 6) {
  try {
    const supabase = await createClient();
    const [{ data }, { count }, { data: ratings }] = await Promise.all([
      supabase.from("reviews").select("id, rating, title, body, created_at").eq("status", "published").order("created_at", { ascending: false }).limit(limit),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("reviews").select("rating").eq("status", "published").limit(10000),
    ]);
    const all = (ratings ?? []).map((r) => Number(r.rating));
    const average = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
    return { reviews: (data ?? []) as PublicReview[], count: count ?? 0, average };
  } catch {
    return { reviews: [] as PublicReview[], count: 0, average: null };
  }
}
