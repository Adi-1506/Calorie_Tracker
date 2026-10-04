import "server-only";
import { isProduction, serverEnv } from "@/lib/env.server";

/** Verifies a Cloudflare Turnstile token (security item 12). */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = serverEnv().turnstileSecretKey;
  if (!secret) return !isProduction; // allow local development without keys; fail closed in production
  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
