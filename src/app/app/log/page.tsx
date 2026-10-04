import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BarcodeScanner } from "@/components/app/barcode-scanner";
import { AddExternalRow, AddFoodRow, QuickAddForm } from "@/components/app/log-forms";
import { requireUser } from "@/lib/auth";
import { getProfile, profileToday } from "@/lib/data/profile";
import { formatDayLabel, isIsoDate } from "@/lib/dates";
import { serverEnv } from "@/lib/env.server";
import { countryForTimeZone, searchExternal } from "@/lib/food/external";
import { rateLimitUser } from "@/lib/security/rate-limit";
import { MEALS, mealSchema, searchQuerySchema, type Meal } from "@/lib/validation/food";

export const metadata: Metadata = { title: "Add food | Calorie Tracker", robots: { index: false } };

type FoodRow = {
  id: string;
  name: string;
  name_local: string | null;
  brand: string | null;
  calories: number;
  food_servings?: { id: string; label: string; grams: number }[];
};

function defaultMeal(timeZone: string): Meal {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
  if (hour >= 4 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 18 && hour < 23) return "dinner";
  return "snack";
}

const toRow = (f: FoodRow) => ({
  id: f.id,
  name: f.name,
  name_local: f.name_local,
  brand: f.brand,
  calories: Number(f.calories),
  servings: (f.food_servings ?? []).map((s) => ({ ...s, grams: Number(s.grams) })),
});

const linkClass = "underline underline-offset-4";
const card = "rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800";

export default async function LogPage({ searchParams }: PageProps<"/app/log">) {
  const { user, supabase } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) redirect("/app/onboarding");

  const params = await searchParams;
  const today = profileToday(profile);
  const date = isIsoDate(params.date) ? params.date : today;
  const mealParsed = mealSchema.safeParse(params.meal);
  const meal = mealParsed.success ? mealParsed.data : defaultMeal(profile.timezone);
  const rawQuery = typeof params.q === "string" ? params.q : "";
  const query = searchQuerySchema.safeParse(rawQuery);

  let foods: ReturnType<typeof toRow>[] = [];
  let limited = false;
  let heading = "Recent foods";

  if (query.success) {
    heading = "Results";
    if (await rateLimitUser("foodSearch", user.id)) {
      const { data } = await supabase.rpc("search_foods", { p_query: query.data, p_limit: 25 });
      const ids = ((data ?? []) as FoodRow[]).map((f) => f.id);
      if (ids.length) {
        const { data: servings } = await supabase.from("food_servings").select("id, food_id, label, grams").in("food_id", ids);
        foods = ((data ?? []) as FoodRow[]).map((f) =>
          toRow({ ...f, food_servings: (servings ?? []).filter((s) => s.food_id === f.id) }),
        );
      }
    } else {
      limited = true;
    }
  } else {
    // Recently logged foods, newest first, without duplicates.
    const { data } = await supabase
      .from("meal_entries")
      .select("food_id, foods (id, name, name_local, brand, calories, food_servings (id, label, grams))")
      .not("food_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(40);
    const seen = new Set<string>();
    for (const row of (data ?? []) as unknown as { foods: FoodRow | null }[]) {
      if (row.foods && !seen.has(row.foods.id)) {
        seen.add(row.foods.id);
        foods.push(toRow(row.foods));
      }
      if (foods.length >= 10) break;
    }
  }

  // Favourites: shown on their own when there's no search, and as stars on every row.
  const { data: favRows } = await supabase
    .from("favorite_foods")
    .select("food_id, foods (id, name, name_local, brand, calories, food_servings (id, label, grams))")
    .order("created_at", { ascending: false })
    .limit(30);
  const favorites = ((favRows ?? []) as unknown as { foods: FoodRow | null }[]).flatMap((r) => (r.foods ? [toRow(r.foods)] : []));
  const favoriteIds = new Set(favorites.map((f) => f.id));

  const customHref = `/app/foods/new?${new URLSearchParams({ meal, date, ...(query.success ? { name: query.data } : {}) })}`;

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Add food</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDayLabel(date, today)} ·{" "}
          {MEALS.map((m, i) => (
            <span key={m.value}>
              {i > 0 && " · "}
              {m.value === meal ? (
                <strong aria-current="true">{m.label}</strong>
              ) : (
                <Link href={`/app/log?${new URLSearchParams({ meal: m.value, date, q: rawQuery })}`} className={linkClass}>
                  {m.label}
                </Link>
              )}
            </span>
          ))}
        </p>
      </div>

      <form role="search" action="/app/log" className="flex gap-2">
        <input type="hidden" name="meal" value={meal} />
        <input type="hidden" name="date" value={date} />
        <label htmlFor="q" className="sr-only">
          Search foods
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={rawQuery}
          minLength={2}
          maxLength={100}
          placeholder="Search any food, dish or brand"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-neutral-700"
        />
        <button className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          Search
        </button>
      </form>
      <div className="-mt-3 flex items-center gap-2 text-sm">
        <BarcodeScanner meal={meal} date={date} />
        <span>Scan a packet&apos;s barcode</span>
      </div>

      {limited && (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          You&apos;re searching very quickly. Please wait a moment and try again.
        </p>
      )}

      {!query.success && favorites.length > 0 && (
        <section aria-labelledby="favorites-heading" className={card}>
          <h2 id="favorites-heading" className="font-semibold">
            Favourites
          </h2>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {favorites.map((f) => (
              <AddFoodRow key={f.id} food={f} meal={meal} date={date} favorite />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="results-heading" className={card}>
        <h2 id="results-heading" className="font-semibold">
          {heading}
        </h2>
        {foods.length > 0 ? (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {foods.map((f) => (
              <AddFoodRow key={f.id} food={f} meal={meal} date={date} favorite={favoriteIds.has(f.id)} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {query.success ? "Nothing in your foods or our catalogue yet." : "Foods you log will show up here for quick re-adding."}
          </p>
        )}
      </section>

      {query.success && !limited && (
        <section aria-labelledby="external-heading" className={card}>
          <h2 id="external-heading" className="font-semibold">
            From Open Food Facts and USDA
          </h2>
          <Suspense fallback={<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Searching worldwide databases…</p>}>
            <ExternalResults query={query.data} userId={user.id} meal={meal} date={date} country={countryForTimeZone(profile.timezone)} />
          </Suspense>
        </section>
      )}

      <p className="text-sm">
        Can&apos;t find it?{" "}
        <Link href={customHref} className={linkClass}>
          Create a custom food
        </Link>{" "}
        or use quick add below.
      </p>

      <section aria-labelledby="quick-heading" className={card}>
        <h2 id="quick-heading" className="mb-3 font-semibold">
          Quick add calories
        </h2>
        <QuickAddForm meal={meal} date={date} />
      </section>
    </>
  );
}

async function ExternalResults({
  query,
  userId,
  meal,
  date,
  country,
}: {
  query: string;
  userId: string;
  meal: string;
  date: string;
  country?: string;
}) {
  if (!(await rateLimitUser("externalFood", userId))) {
    return <p className="mt-2 text-sm">Too many searches right now. Please try again in a minute.</p>;
  }
  const results = await searchExternal(query, serverEnv().usdaApiKey, fetch, { country }).catch(() => []);
  if (results.length === 0) {
    return (
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        No matches, or the databases didn&apos;t answer in time.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {results.map((f) => (
        <AddExternalRow
          key={`${f.source}-${f.externalId}`}
          food={{ source: f.source, externalId: f.externalId, name: f.name, brand: f.brand, calories: f.per100g.calories, serving: f.serving }}
          meal={meal}
          date={date}
        />
      ))}
    </ul>
  );
}
