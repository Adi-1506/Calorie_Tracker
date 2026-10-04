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
  // AI features (step 3d). Without a key the photo and coach features say they aren't set up.
  geminiApiKey: z.string().min(1).optional(),
  geminiModel: z.string().regex(/^[a-z0-9.-]{1,64}$/).optional(),
  // Test-only override so browser tests can point at a local fake. Ignored in production.
  geminiBaseUrl: z.url().optional(),
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
      geminiApiKey: process.env.GEMINI_API_KEY || undefined,
      geminiModel: process.env.GEMINI_MODEL || undefined,
      geminiBaseUrl: process.env.NODE_ENV === "production" ? undefined : process.env.GEMINI_BASE_URL || undefined,
    },
    {
      supabaseServiceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
      turnstileSecretKey: "TURNSTILE_SECRET_KEY",
      ipHashSalt: "IP_HASH_SALT (at least 16 characters)",
      healthDataEncryptionKey: "HEALTH_DATA_ENCRYPTION_KEY",
      usdaApiKey: "USDA_API_KEY",
      geminiApiKey: "GEMINI_API_KEY",
      geminiModel: "GEMINI_MODEL (a model code such as gemini-flash-latest)",
      geminiBaseUrl: "GEMINI_BASE_URL",
    },
  );
  return cached;
}

export const isProduction = process.env.NODE_ENV === "production";
