import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Use at the top of every protected page, Server Action and route handler
 * (security item 6). Validates the session with Supabase Auth on each call.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Two-factor (security item 23): a password-only session isn't enough once an authenticator is set up.
  if (await needsSecondFactor(supabase)) redirect("/login/mfa");
  return { user, supabase };
}

/** For route handlers: the user, or null if signed out or still owing a second factor. */
export async function getApiUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || (await needsSecondFactor(supabase))) return { user: null, supabase };
  return { user, supabase };
}

type Client = Awaited<ReturnType<typeof createClient>>;

export async function needsSecondFactor(supabase: Client) {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.nextLevel === "aal2" && data.currentLevel !== "aal2";
}
