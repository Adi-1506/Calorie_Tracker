import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIdentifier } from "./request";

export const LIMITS = {
  login: { limit: 5, windowSeconds: 15 * 60 },
  signup: { limit: 5, windowSeconds: 60 * 60 },
  passwordReset: { limit: 3, windowSeconds: 60 * 60 },
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
