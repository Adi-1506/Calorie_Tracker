import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { addWater, copyEntries, deleteEntry } from "@/app/app/actions";
import { CalorieRing, Ring } from "@/components/app/rings";
import { requireUser } from "@/lib/auth";
import { getProfile, getTargets, profileToday } from "@/lib/data/profile";
import { addDays, formatDayLabel, isIsoDate } from "@/lib/dates";
import { sumEntries } from "@/lib/nutrition/snapshot";
import { MEALS } from "@/lib/validation/food";

export const metadata: Metadata = { title: "Today | Calorie Tracker", robots: { index: false } };

type Entry = {
  id: string;
  meal: string;
  label: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: Record<string, number>;
};

const buttonClass =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-emerald-700 dark:border-neutral-700 dark:hover:bg-neutral-900";

export default async function DashboardPage({ searchParams }: PageProps<"/app">) {
  const { user, supabase } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) redirect("/app/onboarding");

  const today = profileToday(profile);
  const requested = (await searchParams).date;
  const date = isIsoDate(requested) ? requested : today;

  const [targets, entriesResult, waterResult] = await Promise.all([
    getTargets(supabase, date),
    supabase
      .from("meal_entries")
      .select("id, meal, label, calories, protein_g, carbs_g, fat_g, nutrients")
      .eq("logged_on", date)
      .order("created_at"),
    supabase.from("water_logs").select("id, ml").eq("logged_on", date).order("created_at"),
  ]);
  const entries = (entriesResult.data ?? []) as Entry[];
  const water = waterResult.data ?? [];
  const totals = sumEntries(entries);
  const waterMl = water.reduce((sum, w) => sum + w.ml, 0);
  const hide = profile.hide_numbers;
  const lastWater = water.at(-1);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Link href={`/app?date=${addDays(date, -1)}`} className={buttonClass} aria-label="Previous day">
          ←
        </Link>
        <h1 className="text-2xl font-semibold">
          {profile.display_name && date === today ? `Hi ${profile.display_name}` : formatDayLabel(date, today)}
        </h1>
        <Link href={`/app?date=${addDays(date, 1)}`} className={buttonClass} aria-label="Next day">
          →
        </Link>
      </div>

      <section aria-labelledby="summary-heading" className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        <h2 id="summary-heading" className="sr-only">
          Summary
        </h2>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
          <CalorieRing eaten={totals.calories} target={targets?.calories ?? null} hideNumbers={hide} />
          <div className="flex gap-4">
            <Ring label="Protein" value={totals.protein_g} target={targets?.protein_g ?? null} unit="g" color="#2563eb" hideNumbers={hide} />
            <Ring label="Carbs" value={totals.carbs_g} target={targets?.carbs_g ?? null} unit="g" color="#d97706" hideNumbers={hide} />
            <Ring label="Fat" value={totals.fat_g} target={targets?.fat_g ?? null} unit="g" color="#db2777" hideNumbers={hide} />
          </div>
        </div>
        {!targets && (
          <p className="mt-4 text-center text-sm">
            <Link href="/app/targets" className="underline underline-offset-4">
              Set your targets
            </Link>{" "}
            to see progress.
          </p>
        )}
      </section>

      {entries.length === 0 && (
        <form action={copyEntries} className="-mt-2 text-center text-sm">
          <input type="hidden" name="fromDate" value={addDays(date, -1)} />
          <input type="hidden" name="toDate" value={date} />
          <button className="underline underline-offset-4">Copy everything from the day before</button>
        </form>
      )}

      {MEALS.map((meal) => {
        const items = entries.filter((e) => e.meal === meal.value);
        const kcal = Math.round(items.reduce((s, e) => s + Number(e.calories), 0));
        return (
          <section key={meal.value} aria-labelledby={`${meal.value}-heading`} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-2">
              <h2 id={`${meal.value}-heading`} className="font-semibold">
                {meal.label}
                {!hide && items.length > 0 && <span className="ml-2 text-sm font-normal text-neutral-600 dark:text-neutral-400">{kcal} kcal</span>}
              </h2>
              <Link href={`/app/log?meal=${meal.value}&date=${date}`} className={buttonClass}>
                Add<span className="sr-only"> to {meal.label}</span>
              </Link>
            </div>
            {items.length === 0 && entries.length > 0 && (
              <form action={copyEntries} className="mt-2 text-sm">
                <input type="hidden" name="fromDate" value={addDays(date, -1)} />
                <input type="hidden" name="toDate" value={date} />
                <input type="hidden" name="meal" value={meal.value} />
                <button className="text-neutral-600 underline underline-offset-4 dark:text-neutral-400">
                  Copy {meal.label.toLowerCase()} from the day before
                </button>
              </form>
            )}
            {items.length > 0 && (
              <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">
                {items.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{e.label}</span>
                    {!hide && (
                      <span className="shrink-0 tabular-nums text-neutral-600 dark:text-neutral-400">
                        {Math.round(Number(e.calories))} kcal
                      </span>
                    )}
                    <form action={deleteEntry}>
                      <input type="hidden" name="kind" value="meal" />
                      <input type="hidden" name="id" value={e.id} />
                      <button className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100 hover:text-red-700 dark:hover:bg-neutral-900" aria-label={`Remove ${e.label}`}>
                        ✕
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <section aria-labelledby="water-heading" className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="water-heading" className="font-semibold">
            Water{" "}
            <span className="text-sm font-normal tabular-nums text-neutral-600 dark:text-neutral-400">
              {waterMl} ml{targets?.water_ml ? ` of ${targets.water_ml} ml` : ""}
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {[250, 500].map((ml) => (
              <form key={ml} action={addWater}>
                <input type="hidden" name="ml" value={ml} />
                <input type="hidden" name="date" value={date} />
                <button className={buttonClass}>+{ml} ml</button>
              </form>
            ))}
            {lastWater && (
              <form action={deleteEntry}>
                <input type="hidden" name="kind" value="water" />
                <input type="hidden" name="id" value={lastWater.id} />
                <button className={buttonClass}>Undo last</button>
              </form>
            )}
          </div>
        </div>
        {targets?.water_ml ? (
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
            role="progressbar"
            aria-label="Water"
            aria-valuemin={0}
            aria-valuemax={targets.water_ml}
            aria-valuenow={waterMl}
          >
            <div
              className="h-full origin-left rounded-full bg-sky-600 transition-transform duration-300 motion-reduce:transition-none"
              style={{ transform: `scaleX(${Math.min(waterMl / targets.water_ml, 1)})` }}
            />
          </div>
        ) : null}
      </section>
    </>
  );
}
