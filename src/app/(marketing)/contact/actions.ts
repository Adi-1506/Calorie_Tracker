"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp, hashIdentifier } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import type { FormState } from "@/lib/validation/auth";
import { contactSchema } from "@/lib/validation/contact";

// contact_messages is server-only (no client grants), so this writes with the
// service role after validation, a honeypot, a rate limit and the bot check.
export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { name, email, message, website } = parsed.data;
  if (website) redirect("/thank-you?from=contact"); // pretend success for bots

  const ip = await clientIp();
  if (!(await rateLimit("contact", hashIdentifier(ip), email))) {
    return { status: "error", message: "You've sent a few messages already. Please try again in an hour." };
  }
  if (!(await verifyTurnstile(parsed.data["cf-turnstile-response"], ip))) {
    return { status: "error", message: "We couldn't confirm you're human. Please try again." };
  }

  const { error } = await createAdminClient().from("contact_messages").insert({ name, email, message });
  if (error) return { status: "error", message: "Something went wrong. Please try again." };
  redirect("/thank-you?from=contact");
}
