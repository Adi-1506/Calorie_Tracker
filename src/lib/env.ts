import { z } from "zod";
import { parseEnv } from "./env-parse";

// Values that are safe to ship to the browser. Each one is referenced by its
// full name so Next.js can inline it at build time.
const publicSchema = z.object({
  siteUrl: z.url(),
  supabaseUrl: z.url(),
  supabaseAnonKey: z.string().min(1),
  turnstileSiteKey: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let cached: PublicEnv | undefined;

export function publicEnv(): PublicEnv {
  cached ??= parseEnv(
    publicSchema,
    {
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
    },
    {
      siteUrl: "NEXT_PUBLIC_SITE_URL",
      supabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
      supabaseAnonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      turnstileSiteKey: "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    },
  );
  return cached;
}
