import { addDays } from "@/lib/dates";

export type WeightPoint = { date: string; kg: number };

/**
 * Smooths day-to-day water swings with a trailing average over the last
 * `windowDays` calendar days (not the last N entries, so gaps don't distort it).
 */
export function trailingAverage(points: WeightPoint[], windowDays = 7): WeightPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((p) => {
    const from = addDays(p.date, -(windowDays - 1));
    const window = sorted.filter((q) => q.date >= from && q.date <= p.date);
    const kg = window.reduce((s, q) => s + q.kg, 0) / window.length;
    return { date: p.date, kg: Math.round(kg * 100) / 100 };
  });
}

/** Change in the smoothed weight per week over the given span, or null without enough data. */
export function weeklyChange(points: WeightPoint[], spanDays = 28): number | null {
  const avg = trailingAverage(points);
  if (avg.length < 2) return null;
  const last = avg[avg.length - 1];
  const from = addDays(last.date, -spanDays);
  const first = avg.find((p) => p.date >= from) ?? avg[0];
  const days = (Date.parse(last.date) - Date.parse(first.date)) / 86_400_000;
  if (days < 6) return null;
  return Math.round(((last.kg - first.kg) / days) * 7 * 100) / 100;
}
