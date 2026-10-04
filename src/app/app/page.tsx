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

  const glassCount = Math.min(Math.max(Math.ceil((targets?.water_ml ?? 2000) / 250), 4), 12);
  const glassesFull = Math.min(Math.floor(waterMl / 250), glassCount);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Link href={`/app?date=${addDays(date, -1)}`} className="btn btn-icon btn-round" aria-label="Previous day">
          ←
        </Link>
        <div className="text-center">
          <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight">
            {profile.display_name && date === today ? `Hi ${profile.display_name}` : formatDayLabel(date, today)}
          </h1>
          <p className="text-sm text-muted">
            {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}
          </p>
        </div>
        <Link href={`/app?date=${addDays(date, 1)}`} className="btn btn-icon btn-round" aria-label="Next day">
          →
        </Link>
      </div>

      <section aria-labelledby="summary-heading" className="card flex flex-col items-center gap-5 p-5 sm:flex-row sm:justify-around sm:p-7">
        <h2 id="summary-heading" className="sr-only">
          Summary
        </h2>
        <CalorieRing eaten={totals.calories} target={targets?.calories ?? null} hideNumbers={hide} />
        <div className="flex gap-4 sm:flex-col sm:gap-3 md:flex-row md:gap-4">
          <Ring label="Protein" value={totals.protein_g} target={targets?.protein_g ?? null} unit="g" color="var(--leaf)" hideNumbers={hide} />
          <Ring label="Carbs" value={totals.carbs_g} target={targets?.carbs_g ?? null} unit="g" color="var(--carb)" hideNumbers={hide} />
          <Ring label="Fat" value={totals.fat_g} target={targets?.fat_g ?? null} unit="g" color="var(--chili)" hideNumbers={hide} />
        </div>
        {!targets && (
          <p className="text-center text-sm">
            <Link href="/app/targets" className="link">
              Set your targets
            </Link>{" "}
            to see progress.
          </p>
        )}
      </section>

      <div className="-mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold">Your tiffin</h2>
        {!hide && entries.length > 0 && (
          <span className="font-mono text-sm text-muted tabular-nums">{Math.round(totals.calories)} kcal</span>
        )}
      </div>

      {entries.length === 0 && (
        <form action={copyEntries} className="-mb-2 text-sm">
          <input type="hidden" name="fromDate" value={addDays(date, -1)} />
          <input type="hidden" name="toDate" value={date} />
          <button className="link">Copy everything from the day before</button>
        </form>
      )}

      <div className="flex flex-col">
        {MEALS.map((meal, index) => {
          const items = entries.filter((e) => e.meal === meal.value);
          const kcal = Math.round(items.reduce((s, e) => s + Number(e.calories), 0));
          const first = index === 0;
          const last = index === MEALS.length - 1;
          return (
            <section
              key={meal.value}
              aria-labelledby={`${meal.value}-heading`}
              className={`border-2 border-ink bg-surface px-4 py-3.5 ${first ? "rounded-t-[20px]" : "border-t-0"} ${last ? "rounded-b-[20px] shadow-plate" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 id={`${meal.value}-heading`} className="font-semibold">
                  {meal.label}
                  {!hide && items.length > 0 && <span className="ml-2 font-mono text-[13px] font-medium text-muted tabular-nums">{kcal} kcal</span>}
                </h3>
                <Link href={`/app/log?meal=${meal.value}&date=${date}`} className="btn btn-icon" aria-label={`Add to ${meal.label}`}>
                  +
                </Link>
              </div>
              {items.length === 0 && entries.length > 0 && (
                <form action={copyEntries} className="mt-1 text-sm">
                  <input type="hidden" name="fromDate" value={addDays(date, -1)} />
                  <input type="hidden" name="toDate" value={date} />
                  <input type="hidden" name="meal" value={meal.value} />
                  <span className="text-muted">Nothing yet. </span>
                  <button className="link text-muted">Copy {meal.label.toLowerCase()} from the day before</button>
                </form>
              )}
              {items.length === 0 && entries.length === 0 && <p className="mt-1 text-sm text-muted">Nothing yet.</p>}
              {items.length > 0 && (
                <ul className="mt-1">
                  {items.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-1 text-sm">
                      <span className="min-w-0 flex-1 truncate">{e.label}</span>
                      {!hide && <span className="shrink-0 font-mono text-muted tabular-nums">{Math.round(Number(e.calories))}</span>}
                      <form action={deleteEntry}>
                        <input type="hidden" name="kind" value="meal" />
                        <input type="hidden" name="id" value={e.id} />
                        <button className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-well hover:text-danger" aria-label={`Remove ${e.label}`}>
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
      </div>

      <section aria-labelledby="water-heading" className="flex flex-col gap-3.5 rounded-[22px] bg-night p-5 text-on-night">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="water-heading" className="font-display text-xl font-bold">
            Water
          </h2>
          <span className="font-mono text-sm tabular-nums">
            {waterMl} ml{targets?.water_ml ? ` of ${targets.water_ml} ml` : ""}
          </span>
        </div>
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${glassCount}, minmax(0, 1fr))` }}
          role="progressbar"
          aria-label="Water"
          aria-valuemin={0}
          aria-valuemax={targets?.water_ml ?? undefined}
          aria-valuenow={waterMl}
        >
          {Array.from({ length: glassCount }, (_, i) => (
            <div
              key={i}
              className={`h-9 rounded-t-md rounded-b-[10px] border-2 transition-colors duration-300 motion-reduce:transition-none ${i < glassesFull ? "border-water bg-water" : "border-night-muted/40"}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[250, 500].map((ml) => (
            <form key={ml} action={addWater} className="flex-1">
              <input type="hidden" name="ml" value={ml} />
              <input type="hidden" name="date" value={date} />
              <button className="btn w-full border-on-night bg-transparent text-on-night hover:bg-white/10">+{ml} ml</button>
            </form>
          ))}
          {lastWater && (
            <form action={deleteEntry}>
              <input type="hidden" name="kind" value="water" />
              <input type="hidden" name="id" value={lastWater.id} />
              <button className="btn border-transparent bg-transparent font-medium text-night-muted hover:bg-white/10">Undo last</button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
