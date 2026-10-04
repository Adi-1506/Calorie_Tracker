import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "logout_everywhere"
  | "signup"
  | "password_reset_requested"
  | "password_changed"
  | "rate_limited"
  | "bot_check_failed"
  | "onboarding_completed"
  | "targets_changed"
  | "custom_food_created"
  | "mfa_enrolled"
  | "mfa_verified"
  | "mfa_failed"
  | "mfa_disabled"
  | "ai_consent_given"
  | "ai_consent_withdrawn"
  | "ai_quota_reached";

/**
 * Appends to the immutable audit log (security item 31). Never pass health
 * data, passwords or tokens in metadata. Failures are swallowed so auditing
 * can't break the user's request.
 */
export async function audit(action: AuditAction, opts: { userId?: string; ipHash?: string; metadata?: Record<string, string> } = {}) {
  try {
    await createAdminClient()
      .from("audit_logs")
      .insert({ action, user_id: opts.userId ?? null, ip_hash: opts.ipHash ?? null, metadata: opts.metadata ?? {} });
  } catch {
    // ignore
  }
}
