// CSV that is safe to open in a spreadsheet: values that start with = + - @
// (or a tab/CR) are prefixed with ' so they can't run as formulas.
export function csvCell(value: unknown): string {
  if (value == null) return "";
  let s = typeof value === "number" ? String(value) : String(value);
  if (typeof value !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
