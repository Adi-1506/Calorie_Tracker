"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { audit } from "@/lib/security/audit";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp, hashIdentifier } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteAccountSchema } from "@/lib/validation/account";
import type { FormState } from "@/lib/validation/auth";

/** Hide-numbers mode (security item 49): hides calories and weights across the app. */
export async function setHideNumbers(formData: FormData): Promise<void> {
  const { user, supabase } = await requireUser();
  const hide = formData.get("hide") === "1";
  await supabase.from("profiles").update({ hide_numbers: hide }).eq("id", user.id);
  refresh();
}

/** Checks the password on a throwaway client so the signed-in session isn't touched. */
async function passwordMatches(email: string, password: string) {
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  const probe = createSupabaseClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}

/**
 * Account deletion (GDPR / DPDP right to erasure). Re-checks the password,
 * removes stored photos, then deletes the auth user; every table with user
 * data cascades from auth.users. The audit log keeps only the user id.
 */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase } = await requireUser();
  const parsed = deleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const ipHash = hashIdentifier(await clientIp());
  if (!(await rateLimit("accountDelete", ipHash, user.id))) {
    return { status: "error", message: "Too many attempts. Please wait a while and try again." };
  }
  if (!user.email || !(await passwordMatches(user.email, parsed.data.password))) {
    await audit("account_delete_failed", { userId: user.id, ipHash, metadata: { reason: "password" } });
    return { status: "error", fieldErrors: { password: ["That password isn't right"] } };
  }

  const admin = createAdminClient();
  // Storage objects don't cascade, so remove them first.
  const { data: photos } = await admin.from("progress_photos").select("storage_path").eq("user_id", user.id);
  const paths = (photos ?? []).map((p) => p.storage_path);
  if (paths.length) await admin.storage.from("progress-photos").remove(paths);
  // Recipe ingredients block deleting foods they use, so drop the recipes before the foods go.
  await admin.from("recipes").delete().eq("user_id", user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    await audit("account_delete_failed", { userId: user.id, ipHash, metadata: { reason: "delete" } });
    return { status: "error", message: "We couldn't delete your account. Please try again, or contact us and we'll do it for you." };
  }
  await audit("account_deleted", { userId: user.id, ipHash });
  await supabase.auth.signOut({ scope: "local" });
  redirect("/account-deleted");
}
