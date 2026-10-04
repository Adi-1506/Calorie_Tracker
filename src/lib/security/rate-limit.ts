import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIdentifier } from "./request";

export const LIMITS = {
  login: { limit: 5, windowSeconds: 15 * 60 },
  signup: { limit: 5, windowSeconds: 60 * 60 },
  passwordReset: { limit: 3, windowSeconds: 60 * 60 },
  mfaVerify: { limit: 10, windowSeconds: 15 * 60 },
  contact: { limit: 5, windowSeconds: 60 * 60 },
  accountDelete: { limit: 5, windowSeconds: 60 * 60 },
  // Per signed-in user. External lookups hit third-party APIs, so they're tighter.
  foodSearch: { limit: 60, windowSeconds: 60 },
  externalFood: { limit: 30, windowSeconds: 60 },
  logWrite: { limit: 120, windowSeconds: 60 },
  recipeImport: { limit: 10, windowSeconds: 60 * 60 },
  photoUpload: { limit: 20, windowSeconds: 60 * 60 },
  dataExport: { limit: 20, windowSeconds: 60 * 60 },
  // AI (item 36): a short burst limit per user, plus one cap for the whole site
  // so the provider's free-tier quota can't be drained. Daily per-user quotas
  // live in ai_usage (src/lib/ai/access.ts).
  aiBurst: { limit: 6, windowSeconds: 60 },
  aiGlobal: { limit: 1000, windowSeconds: 24 * 60 * 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

/**
 * Returns true if the action is allowed. Keys are checked per IP and, when
 * given, per account (email), so one attacker can't hammer many accounts and
 * many IPs can't hammer one account (security item 11). Fails closed.
 */
export async function rateLimit(name: LimitName, ipHash: string, account?: string): Promise<boolean> {
  const { limit, windowSeconds } = LIMITS[name];
  const keys = [`${name}:ip:${ipHash}`, ...(account ? [`${name}:acct:${hashIdentifier(account.toLowerCase())}`] : [])];
  const admin = createAdminClient();

  const results = await Promise.all(
    keys.map((key) =>
      admin.rpc("check_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds }),
    ),
  );
  return results.every(({ data, error }) => !error && data === true);
}

/** Per-user limit for signed-in features (search, logging). Fails closed. */
export async function rateLimitUser(name: LimitName, userId: string): Promise<boolean> {
  const { limit, windowSeconds } = LIMITS[name];
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: `${name}:user:${hashIdentifier(userId)}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  return !error && data === true;
}

/** One shared counter for the whole site (cost caps). Fails closed. */
export async function rateLimitGlobal(name: LimitName): Promise<boolean> {
  const { limit, windowSeconds } = LIMITS[name];
  const { data, error } = await createAdminClient().rpc("check_rate_limit", {
    p_key: `${name}:global`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  return !error && data === true;
}
