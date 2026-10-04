import { addDays } from "@/lib/dates";

/**
 * Consecutive days with at least one logged food, counting back from today.
 * Today not being logged yet doesn't break the streak until the day is over,
 * so the count runs from yesterday in that case.
 */
export function loggingStreak(loggedDays: Iterable<string>, today: string): number {
  const days = new Set(loggedDays);
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

/** Hours and minutes between two instants, for the fasting timer. */
export function elapsed(fromIso: string, toMs: number): { hours: number; minutes: number; totalHours: number } {
  const ms = Math.max(0, toMs - Date.parse(fromIso));
  const totalMinutes = Math.floor(ms / 60_000);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, totalHours: ms / 3_600_000 };
}
