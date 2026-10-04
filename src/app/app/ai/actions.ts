"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/security/audit";

// AI consent (item 37). Recorded server-side; every AI route checks it.

export async function giveAiConsent(): Promise<{ ok: boolean }> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase.from("profiles").update({ ai_consent_at: new Date().toISOString() }).eq("id", user.id);
  if (error) return { ok: false };
  await audit("ai_consent_given", { userId: user.id });
  return { ok: true };
}

export async function withdrawAiConsent(): Promise<void> {
  const { user, supabase } = await requireUser();
  await supabase.from("profiles").update({ ai_consent_at: null }).eq("id", user.id);
  await audit("ai_consent_withdrawn", { userId: user.id });
  refresh();
}
