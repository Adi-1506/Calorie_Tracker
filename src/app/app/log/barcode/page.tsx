import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddFoodRow } from "@/components/app/log-forms";
import { requireUser } from "@/lib/auth";
import { getProfile, profileToday } from "@/lib/data/profile";
import { isIsoDate } from "@/lib/dates";
import { getOpenFoodFactsProduct } from "@/lib/food/external";
import { importExternalFood } from "@/lib/food/import";
import { rateLimitUser } from "@/lib/security/rate-limit";
import { mealSchema } from "@/lib/validation/food";

export const metadata: Metadata = { title: "Scanned product | Kalo", robots: { index: false } };

type FoodRow = {
  id: string;
  name: string;
  name_local: string | null;
  brand: string | null;
  calories: number;
  food_servings: { id: string; label: string; grams: number }[];
};

const SELECT = "id, name, name_local, brand, calories, food_servings (id, label, grams)";

export default async function BarcodePage({ searchParams }: PageProps<"/app/log/barcode">) {
  const { user, supabase } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) redirect("/app/onboarding");

  const params = await searchParams;
  const code = typeof params.code === "string" && /^[0-9]{8,14}$/.test(params.code) ? params.code : null;
  const mealParsed = mealSchema.safeParse(params.meal);
  const meal = mealParsed.success ? mealParsed.data : "snack";
  const date = isIsoDate(params.date) ? params.date : profileToday(profile);
  const back = `/app/log?${new URLSearchParams({ meal, date })}`;

  let foods: FoodRow[] = [];
  let problem: string | null = code ? null : "That doesn't look like a barcode. Barcodes are 8 to 14 digits.";

  if (code) {
    // Catalogue and the user's own foods first (RLS decides visibility).
    const local = await supabase.from("foods").select(SELECT).eq("barcode", code).limit(5);
    foods = (local.data ?? []) as FoodRow[];

    if (foods.length === 0) {
      if (!(await rateLimitUser("externalFood", user.id))) {
        problem = "You're scanning very quickly. Please wait a moment and try again.";
      } else {
        const product = await getOpenFoodFactsProduct(code).catch(() => null);
        const id = product ? await importExternalFood(product) : null;
        if (id) {
          const imported = await supabase.from("foods").select(SELECT).eq("id", id).maybeSingle();
          if (imported.data) foods = [imported.data as FoodRow];
        }
      }
    }
  }

  const rows = foods.map((f) => ({
    id: f.id,
    name: f.name,
    name_local: f.name_local,
    brand: f.brand,
    calories: Number(f.calories),
    servings: f.food_servings.map((s) => ({ ...s, grams: Number(s.grams) })),
  }));

  return (
    <>
      <div>
        <Link href={back} className="text-sm link">
          ← Back to search
        </Link>
        <h1 className="mt-2 font-display text-[1.75rem] font-bold tracking-tight">Scanned product</h1>
        {code && <p className="font-mono text-sm text-muted">{code}</p>}
      </div>

      {problem && (
        <p role="alert" className="notice notice-warn">
          {problem}
        </p>
      )}

      {rows.length > 0 ? (
        <section aria-label="Product" className="card p-4 sm:p-5">
          <ul className="rows">
            {rows.map((f) => (
              <AddFoodRow key={f.id} food={f} meal={meal} date={date} />
            ))}
          </ul>
        </section>
      ) : (
        !problem && (
          <section className="card p-4 sm:p-5">
            <p>We couldn&apos;t find this product in Open Food Facts yet.</p>
            <p className="mt-2 text-sm">
              <Link
                href={`/app/foods/new?${new URLSearchParams({ meal, date, barcode: code ?? "" })}`}
                className="link"
              >
                Add it as a custom food
              </Link>{" "}
              using the nutrition label, and it will come up next time you scan it.
            </p>
          </section>
        )
      )}
    </>
  );
}
