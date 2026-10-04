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

  const mealLabel = MEALS.find((m) => m.value === meal)?.label ?? "";

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Link href={date === today ? "/app" : `/app?date=${date}`} className="btn btn-icon btn-round" aria-label="Back to the day">
            ←
          </Link>
          <div>
            <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight">Add to {mealLabel.toLowerCase()}</h1>
            <p className="text-sm text-muted">{formatDayLabel(date, today)}</p>
          </div>
        </div>
        <nav aria-label="Meal" className="flex flex-wrap gap-1.5">
          {MEALS.map((m) => (
            <Link
              key={m.value}
              href={`/app/log?${new URLSearchParams({ meal: m.value, date, q: rawQuery })}`}
              aria-current={m.value === meal ? "true" : undefined}
              className="flex min-h-10 items-center rounded-full border-2 border-ink px-3.5 text-sm font-medium aria-[current=true]:bg-ink aria-[current=true]:font-semibold aria-[current=true]:text-ground"
            >
              {m.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex gap-2">
        <form role="search" action="/app/log" className="flex min-w-0 flex-1 gap-2">
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
            className="input min-h-[3.25rem] min-w-0 flex-1 text-[1.0625rem]"
          />
          <button className="btn btn-ink min-h-[3.25rem]">Search</button>
        </form>
        <BarcodeScanner meal={meal} date={date} />
      </div>

      {limited && (
        <p role="alert" className="notice notice-warn">
          You&apos;re searching very quickly. Please wait a moment and try again.
        </p>
      )}

      {!query.success && favorites.length > 0 && (
        <section aria-labelledby="favorites-heading" className="flex flex-col gap-2.5">
          <h2 id="favorites-heading" className="eyebrow">
            Favourites
          </h2>
          <ul className="card rows px-4">
            {favorites.map((f) => (
              <AddFoodRow key={f.id} food={f} meal={meal} date={date} favorite />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="results-heading" className="flex flex-col gap-2.5">
        <h2 id="results-heading" className="eyebrow">
          {query.success ? "In your kitchen" : heading}
        </h2>
        {foods.length > 0 ? (
          <ul className="card rows px-4">
            {foods.map((f) => (
              <AddFoodRow key={f.id} food={f} meal={meal} date={date} favorite={favoriteIds.has(f.id)} />
            ))}
          </ul>
        ) : (
          <p className="card-flat p-4 text-sm text-muted">
            {query.success ? "Nothing in your foods or our catalogue yet." : "Foods you log will show up here for quick re-adding."}
          </p>
        )}
      </section>

      {query.success && !limited && (
        <section aria-labelledby="external-heading" className="flex flex-col gap-2.5">
          <h2 id="external-heading" className="eyebrow">
            From the world&apos;s shelves
          </h2>
          <Suspense fallback={<p className="card-flat p-4 text-sm text-muted">Searching Open Food Facts and USDA…</p>}>
            <ExternalResults query={query.data} userId={user.id} meal={meal} date={date} country={countryForTimeZone(profile.timezone)} />
          </Suspense>
        </section>
      )}

      <section aria-labelledby="quick-heading" className="flex flex-col gap-4 rounded-[20px] border-2 border-dashed border-ink p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="quick-heading" className="font-display text-lg font-bold">
            Not here?
          </h2>
          <Link href={customHref} className="link text-sm font-semibold">
            Create a custom food
          </Link>
        </div>
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
    return <p className="card-flat p-4 text-sm">Too many searches right now. Please try again in a minute.</p>;
  }
  const results = await searchExternal(query, serverEnv().usdaApiKey, fetch, { country }).catch(() => []);
  if (results.length === 0) {
    return (
      <p className="card-flat p-4 text-sm text-muted">
        No matches, or the databases didn&apos;t answer in time.
      </p>
    );
  }
  return (
    <ul className="card rows px-4">
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
