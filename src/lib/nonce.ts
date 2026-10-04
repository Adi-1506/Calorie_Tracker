import "server-only";
import { headers } from "next/headers";

/** The per-request CSP nonce set by src/proxy.ts. */
export async function getNonce() {
  return (await headers()).get("x-nonce") ?? undefined;
}

export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;
