// Calendar-day helpers. Log entries are stored by the user's local date
// (profiles.timezone) so "today" doesn't flip at midnight UTC.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTimeZone(tz: string) {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function todayIn(timeZone: string, now = new Date()): string {
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDayLabel(isoDate: string, today: string): string {
  if (isoDate === today) return "Today";
  if (isoDate === addDays(today, -1)) return "Yesterday";
  if (isoDate === addDays(today, 1)) return "Tomorrow";
  return new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
