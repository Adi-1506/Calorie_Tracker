"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
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

  const result = await withMinimumDuration(MIN_AUTH_RESPONSE_MS, async (): Promise<FormState | "ok"> => {
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
    return "ok";
  });

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
