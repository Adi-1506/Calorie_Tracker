import type { z } from "zod";

/**
 * Parses env vars and, on failure, throws a message that names the missing
 * variables (never their values) and says how to fix it.
 */
export function parseEnv<T extends z.ZodType>(schema: T, values: Record<string, unknown>, names: Record<string, string>): z.infer<T> {
  const result = schema.safeParse(values);
  if (result.success) return result.data;
  const bad = [...new Set(result.error.issues.map((i) => names[String(i.path[0])] ?? String(i.path[0])))];
  throw new Error(
    `Missing or invalid environment variable${bad.length > 1 ? "s" : ""}: ${bad.join(", ")}. ` +
      "Copy .env.example to .env.local, fill these in (see the README setup section), then restart the server.",
  );
}
