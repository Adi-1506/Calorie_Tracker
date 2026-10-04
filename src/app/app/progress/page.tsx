import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { deleteMeasurement, deletePhoto, deleteWeight } from "@/app/app/progress/actions";
import { MeasurementsForm, PhotoUpload, WeightForm } from "@/components/app/progress-forms";
import { WeightChart } from "@/components/app/weight-chart";
import { requireUser } from "@/lib/auth";
import { getProfile, profileToday } from "@/lib/data/profile";
import { getMeasurements, getPhotos, getWeights } from "@/lib/data/progress";
import { formatDayLabel } from "@/lib/dates";
import { trailingAverage, weeklyChange } from "@/lib/nutrition/trend";
import { MEASUREMENTS } from "@/lib/validation/progress";

export const metadata: Metadata = { title: "Progress | Calorie Tracker", robots: { index: false } };

const removeButton = "flex size-9 items-center justify-center rounded-lg text-muted hover:bg-well hover:text-danger";

export default async function ProgressPage() {
  const { user, supabase } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) redirect("/app/onboarding");
  const today = profileToday(profile);
  const hide = profile.hide_numbers;

  const [weights, measurements, photos] = await Promise.all([getWeights(supabase, user.id), getMeasurements(supabase, user.id), getPhotos(supabase)]);
  const recent = weights.filter((w) => w.date >= new Date(Date.parse(today) - 90 * 86_400_000).toISOString().slice(0, 10)).reverse();
  const points = recent.map((w) => ({ date: w.date, kg: w.kg }));
  const trend = trailingAverage(points);
  const change = weeklyChange(points);
  const latest = weights[0] ?? null;
  const summary =
    change == null
      ? `Weight over the last 90 days, ${points.length} weigh-ins.`
      : `Weight trend over the last 90 days: ${change > 0 ? "up" : change < 0 ? "down" : "steady"} ${Math.abs(change)} kg a week.`;

  return (
    <>
      <div>
        <h1 className="font-display text-[1.75rem] font-bold tracking-tight">Progress</h1>
        <p className="text-sm text-muted">Weight, measurements and photos are encrypted or kept private. Only you can see them.</p>
      </div>

      <section aria-labelledby="weight-heading" className="card flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="weight-heading" className="font-display text-xl font-bold">
            Weight
          </h2>
          {!hide && latest && (
            <p className="text-sm text-muted">
              <span className="font-mono text-2xl font-semibold text-ink tabular-nums">{latest.kg}</span> kg
              {latest.date === today ? " today" : `, ${formatDayLabel(latest.date, today)}`}
            </p>
          )}
        </div>
        {!hide && points.length >= 2 ? (
          <div className="flex flex-col gap-2">
            <WeightChart points={points} trend={trend} summary={summary} />
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1 w-5 rounded-full bg-turmeric" aria-hidden="true" /> 7-day trend
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full border-[1.5px] border-ink bg-surface" aria-hidden="true" /> Weigh-ins
              </span>
              {change != null && (
                <span className="font-semibold text-ink">
                  {change === 0 ? "Holding steady" : `${change > 0 ? "Up" : "Down"} ${Math.abs(change)} kg a week`}
                </span>
              )}
            </p>
          </div>
        ) : (
          !hide && <p className="text-sm text-muted">Log your weight on two or more days to see a trend line.</p>
        )}
        <WeightForm today={today} last={latest?.kg ?? null} />
        {!hide && weights.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">All weigh-ins ({weights.length})</summary>
            <ul className="rows mt-2">
              {weights.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span>{formatDayLabel(w.date, today)}</span>
                  <span className="ml-auto font-mono tabular-nums">{w.kg} kg</span>
                  <form action={deleteWeight}>
                    <input type="hidden" name="id" value={w.id} />
                    <button className={removeButton} aria-label={`Remove weight for ${w.date}`}>
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section aria-labelledby="measure-heading" className="card flex flex-col gap-5 p-5 sm:p-6">
        <h2 id="measure-heading" className="font-display text-xl font-bold">
          Measurements
        </h2>
        {measurements.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Body measurements in centimetres</caption>
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="py-1 pr-3 font-semibold">
                    Date
                  </th>
                  {MEASUREMENTS.map((m) => (
                    <th key={m.key} scope="col" className="py-1 pr-3 font-semibold">
                      {m.label}
                    </th>
                  ))}
                  <th scope="col">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {measurements.slice(0, 12).map((e) => (
                  <tr key={e.id} className="border-t-2 border-dashed border-line">
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium whitespace-nowrap">
                      {formatDayLabel(e.date, today)}
                    </th>
                    {MEASUREMENTS.map((m) => (
                      <td key={m.key} className="py-1.5 pr-3 font-mono tabular-nums">
                        {e.values[m.key] ?? "–"}
                      </td>
                    ))}
                    <td>
                      <form action={deleteMeasurement}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className={removeButton} aria-label={`Remove measurements for ${e.date}`}>
                          ✕
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <MeasurementsForm today={today} startCollapsed={measurements.length > 0} />
      </section>

      <section aria-labelledby="photos-heading" className="card flex flex-col gap-5 p-5 sm:p-6">
        <h2 id="photos-heading" className="font-display text-xl font-bold">
          Progress photos
        </h2>
        {photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <li key={p.id} className="flex flex-col gap-1.5">
                <Image
                  src={`/app/progress/photos/${p.id}`}
                  alt={`Progress photo from ${p.date}`}
                  width={400}
                  height={400}
                  unoptimized
                  className="aspect-square w-full rounded-[14px] border-2 border-ink bg-well object-cover"
                />
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{formatDayLabel(p.date, today)}</span>
                  <form action={deletePhoto}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="link text-danger" aria-label={`Delete photo from ${p.date}`}>
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <PhotoUpload today={today} />
      </section>

      <section aria-labelledby="export-heading" className="flex flex-col gap-3 rounded-[20px] border-2 border-dashed border-ink p-5">
        <h2 id="export-heading" className="font-display text-lg font-bold">
          Download your data
        </h2>
        <p className="text-sm text-muted">Spreadsheets of everything you&apos;ve logged, or a 30-day PDF summary to share with a doctor or dietitian.</p>
        <div className="flex flex-wrap gap-2">
          <a href="/app/export/csv?type=food" className="btn btn-sm" download>
            Food log (CSV)
          </a>
          <a href="/app/export/csv?type=weight" className="btn btn-sm" download>
            Weight (CSV)
          </a>
          <a href="/app/export/csv?type=measurements" className="btn btn-sm" download>
            Measurements (CSV)
          </a>
          <a href="/app/export/pdf" className="btn btn-sm btn-ink" download>
            30-day report (PDF)
          </a>
        </div>
      </section>
    </>
  );
}
