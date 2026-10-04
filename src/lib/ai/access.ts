import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/security/audit";
import { rateLimitGlobal, rateLimitUser } from "@/lib/security/rate-limit";
import { AiError } from "./provider";

// Gatekeeper for every AI request: consent first, then a burst limit, the
// user's daily quota and the site-wide cap (items 36, 37).

export const AI_DAILY_LIMITS = { photo: 10, coach: 30 } as const;
export type AiFeature = keyof typeof AI_DAILY_LIMITS;

export type AiGate = { ok: true } | { ok: false; status: number; error: string };

export async function hasAiConsent(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("profiles").select("ai_consent_at").eq("id", userId).maybeSingle();
  return Boolean(data?.ai_consent_at);
}

export async function startAiRequest(supabase: SupabaseClient, userId: string, feature: AiFeature): Promise<AiGate> {
  if (!(await hasAiConsent(supabase, userId))) {
    return { ok: false, status: 403, error: "Please agree to the AI notice first." };
  }
  if (!(await rateLimitUser("aiBurst", userId))) {
    return { ok: false, status: 429, error: "You're going a bit fast. Please wait a minute and try again." };
  }
  const { data, error } = await createAdminClient().rpc("consume_ai_quota", {
    p_user: userId,
    p_feature: feature,
    p_limit: AI_DAILY_LIMITS[feature],
  });
  if (error || data !== true) {
    if (!error) await audit("ai_quota_reached", { userId, metadata: { feature } });
    const what = feature === "photo" ? `${AI_DAILY_LIMITS.photo} meal photos` : `${AI_DAILY_LIMITS.coach} coach messages`;
    return { ok: false, status: 429, error: `You've used today's ${what}. They reset tomorrow.` };
  }
  if (!(await rateLimitGlobal("aiGlobal"))) {
    return { ok: false, status: 503, error: "The AI is very busy today. Please try again tomorrow." };
  }
  return { ok: true };
}

export async function recordAiTokens(userId: string, feature: AiFeature, tokens: number) {
  if (tokens > 0) await createAdminClient().rpc("record_ai_tokens", { p_user: userId, p_feature: feature, p_tokens: tokens });
}

export function aiFailure(e: unknown): { status: number; error: string } {
  const kind = e instanceof AiError ? e.kind : "failed";
  switch (kind) {
    case "not_configured":
      return { status: 503, error: "AI features aren't set up on this site yet." };
    case "blocked":
      return { status: 422, error: "The AI couldn't help with that one. Try a different photo or question." };
    case "busy":
      return { status: 503, error: "The AI is busy right now. Please try again in a minute." };
    default:
      return { status: 502, error: "The AI didn't answer. Please try again." };
  }
}
