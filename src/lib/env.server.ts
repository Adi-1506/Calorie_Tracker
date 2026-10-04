import "server-only";
import { z } from "zod";
import { parseEnv } from "./env-parse";

// Server-only secrets (security items 1 and 3). Importing this file from a
// Client Component fails the build because of the "server-only" import.
const serverSchema = z.object({
  supabaseServiceRoleKey: z.string().min(1),
  turnstileSecretKey: z.string().min(1).optional(),
  ipHashSalt: z.string().min(16),
  // 32 random bytes, base64. Optional at boot so pages that don't touch health
  // data still work; healthDataKey() throws when it's missing.
  healthDataEncryptionKey: z.string().optional(),
  usdaApiKey: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= parseEnv(
    serverSchema,
    {
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || undefined,
      ipHashSalt: process.env.IP_HASH_SALT,
      healthDataEncryptionKey: process.env.HEALTH_DATA_ENCRYPTION_KEY || undefined,
      usdaApiKey: process.env.USDA_API_KEY || undefined,
    },
    {
      supabaseServiceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
      turnstileSecretKey: "TURNSTILE_SECRET_KEY",
      ipHashSalt: "IP_HASH_SALT (at least 16 characters)",
      healthDataEncryptionKey: "HEALTH_DATA_ENCRYPTION_KEY",
      usdaApiKey: "USDA_API_KEY",
    },
  );
  return cached;
}

export const isProduction = process.env.NODE_ENV === "production";
