import "server-only";
import { z } from "zod";

// Server-only secrets (security items 1 and 3). Importing this file from a
// Client Component fails the build because of the "server-only" import.
const serverSchema = z.object({
  supabaseServiceRoleKey: z.string().min(1),
  turnstileSecretKey: z.string().min(1).optional(),
  ipHashSalt: z.string().min(16),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= serverSchema.parse({
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || undefined,
    ipHashSalt: process.env.IP_HASH_SALT,
  });
  return cached;
}

export const isProduction = process.env.NODE_ENV === "production";
