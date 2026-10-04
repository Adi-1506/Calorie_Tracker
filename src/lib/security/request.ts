import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env.server";

/** Best-effort client IP. On Vercel, x-forwarded-for is set by the platform. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** IPs and emails used as rate-limit keys are stored only as salted hashes (security item 31). */
export function hashIdentifier(value: string) {
  return createHmac("sha256", serverEnv().ipHashSalt).update(value).digest("hex");
}
