"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getApiUser, needsSecondFactor } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/security/audit";
import { isPwnedPassword } from "@/lib/security/password";
import { rateLimit } from "@/lib/security/rate-limit";
import { safeRedirectPath } from "@/lib/security/redirect";
import { clientIp, hashIdentifier } from "@/lib/security/request";
import { withMinimumDuration } from "@/lib/security/timing";
import { verifyTurnstile } from "@/lib/security/turnstile";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  type FormState,
} from "@/lib/validation/auth";

// Server Actions are protected against CSRF by Next.js, which rejects requests
// whose Origin doesn't match the host (security item 21), and by SameSite cookies.

const MIN_AUTH_RESPONSE_MS = 800;
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";
const BOT_CHECK = "Please complete the security check and try again.";

function invalid(error: z.ZodError): FormState {
  return { status: "error", fieldErrors: z.flattenError(error).fieldErrors };
}

async function requestContext() {
  const ip = await clientIp();
  return { ip, ipHash: hashIdentifier(ip) };
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email, password, next, website } = parsed.data;

  const { ip, ipHash } = await requestContext();
  const destination = safeRedirectPath(next);

  const result = await withMinimumDuration(MIN_AUTH_RESPONSE_MS, async (): Promise<FormState | "ok" | "mfa"> => {
    if (website) return { status: "error", message: "Email or password is incorrect." };
    if (!(await rateLimit("login", ipHash, email))) {
      await audit("rate_limited", { ipHash, metadata: { action: "login" } });
      return { status: "error", message: TOO_MANY };
    }
    if (!(await verifyTurnstile(parsed.data["cf-turnstile-response"], ip))) {
      await audit("bot_check_failed", { ipHash, metadata: { action: "login" } });
      return { status: "error", message: BOT_CHECK };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      await audit("login_failed", { ipHash });
      // Same message whether the account exists, is unconfirmed or the password is wrong (item 22).
      return { status: "error", message: "Email or password is incorrect." };
    }
    await audit("login", { userId: data.user.id, ipHash });
    return (await needsSecondFactor(supabase)) ? "mfa" : "ok";
  });

  if (result === "mfa") redirect(`/login/mfa?${new URLSearchParams({ next: destination })}`);
  if (result !== "ok") return result;
  redirect(destination);
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email, password, website } = parsed.data;

  const { ip, ipHash } = await requestContext();

  const result = await withMinimumDuration(MIN_AUTH_RESPONSE_MS, async (): Promise<FormState | "ok"> => {
    if (website) return "ok"; // pretend success for bots
    if (!(await rateLimit("signup", ipHash))) {
      await audit("rate_limited", { ipHash, metadata: { action: "signup" } });
      return { status: "error", message: TOO_MANY };
    }
    if (!(await verifyTurnstile(parsed.data["cf-turnstile-response"], ip))) {
      await audit("bot_check_failed", { ipHash, metadata: { action: "signup" } });
      return { status: "error", message: BOT_CHECK };
    }
    if (await isPwnedPassword(password)) {
      return {
        status: "error",
        fieldErrors: { password: ["This password has appeared in a data breach. Please choose a different one."] },
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${publicEnv().siteUrl}/auth/confirm?next=/app` },
    });

    // For an email that's already registered, Supabase returns a user with no
    // identities and sends no email. Treat it exactly like a new signup (item 22).
    const isNewUser = !error && data.user && (data.user.identities?.length ?? 0) > 0;
    if (isNewUser && data.user) {
      const now = new Date().toISOString();
      await createAdminClient()
        .from("profiles")
        .update({ health_data_consent_at: now, age_confirmed_at: now })
        .eq("id", data.user.id);
      await audit("signup", { userId: data.user.id, ipHash });
    }
    return "ok";
  });

  if (result !== "ok") return result;
  redirect("/signup/check-email");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email, website } = parsed.data;

  const { ip, ipHash } = await requestContext();
  const sent: FormState = {
    status: "success",
    message: "If an account exists for that email, we've sent a link to reset your password.",
  };

  return withMinimumDuration(MIN_AUTH_RESPONSE_MS, async () => {
    if (website) return sent;
    if (!(await rateLimit("passwordReset", ipHash, email))) {
      await audit("rate_limited", { ipHash, metadata: { action: "password_reset" } });
      return { status: "error", message: TOO_MANY } satisfies FormState;
    }
    if (!(await verifyTurnstile(parsed.data["cf-turnstile-response"], ip))) {
      return { status: "error", message: BOT_CHECK } satisfies FormState;
    }

    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${publicEnv().siteUrl}/auth/confirm?next=/reset-password`,
    });
    await audit("password_reset_requested", { ipHash });
    return sent;
  });
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Your reset link has expired. Please request a new one." };

  if (await isPwnedPassword(parsed.data.password)) {
    return {
      status: "error",
      fieldErrors: { password: ["This password has appeared in a data breach. Please choose a different one."] },
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: "We couldn't update your password. Please try again." };

  // Sign out every other device after a password change (item 24).
  await supabase.auth.signOut({ scope: "others" });
  const { ipHash } = await requestContext();
  await audit("password_changed", { userId: user.id, ipHash });
  redirect("/app");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.signOut({ scope: "local" });
  if (user) await audit("logout", { userId: user.id });
  redirect("/login");
}

export async function logoutEverywhere(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.signOut({ scope: "global" });
  if (user) await audit("logout_everywhere", { userId: user.id });
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Two-factor login (security item 23)
// ---------------------------------------------------------------------------

const codeSchema = z.object({ code: z.string().trim().regex(/^[0-9]{6}$/, "Enter the 6-digit code"), next: z.string().optional() });

async function verifiedTotp(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp.find((f) => f.status === "verified") ?? null;
}

export async function verifyMfaLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = codeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await rateLimit("mfaVerify", hashIdentifier(user.id)))) return { status: "error", message: TOO_MANY };

  const factor = await verifiedTotp(supabase);
  if (!factor) redirect(safeRedirectPath(parsed.data.next));
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: parsed.data.code });
  if (error) {
    await audit("mfa_failed", { userId: user.id });
    return { status: "error", fieldErrors: { code: ["That code didn't work. Check the time on your phone and try again."] } };
  }
  await audit("mfa_verified", { userId: user.id });
  redirect(safeRedirectPath(parsed.data.next));
}

export type EnrollState = FormState & { factorId?: string; qr?: string; secret?: string };

export async function startTotpEnrollment(): Promise<EnrollState> {
  const { user, supabase } = await getApiUser();
  if (!user) return { status: "error", message: "Please log in again." };
  // Clear any half-finished setup first, so only one pending factor exists.
  const { data } = await supabase.auth.mfa.listFactors();
  for (const f of data?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
  const { data: enrolled, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
  if (error || !enrolled) return { status: "error", message: "Couldn't start two-factor setup. Please try again." };
  return { status: "idle", factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret };
}

export async function confirmTotpEnrollment(prev: EnrollState, formData: FormData): Promise<EnrollState> {
  const { user, supabase } = await getApiUser();
  if (!user) return { status: "error", message: "Please log in again." };
  const parsed = codeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ...prev, ...invalid(parsed.error) };
  if (!prev.factorId) return { status: "error", message: "Start setup again." };
  if (!(await rateLimit("mfaVerify", hashIdentifier(user.id)))) return { ...prev, status: "error", message: TOO_MANY };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: prev.factorId, code: parsed.data.code });
  if (error) return { ...prev, status: "error", fieldErrors: { code: ["That code didn't work. Try the newest code from your app."] } };
  await audit("mfa_enrolled", { userId: user.id });
  return { status: "success", message: "Two-factor login is on." };
}

export async function disableTotp(): Promise<void> {
  const { user, supabase } = await getApiUser();
  if (!user) redirect("/login");
  const { data } = await supabase.auth.mfa.listFactors();
  // Removing a verified factor needs an aal2 session, which getApiUser guarantees.
  for (const f of data?.all ?? []) await supabase.auth.mfa.unenroll({ factorId: f.id });
  await audit("mfa_disabled", { userId: user.id });
  redirect("/app/settings?mfa=off");
}
