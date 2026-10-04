"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getProfile, profileAge } from "@/lib/data/profile";
import { rateLimitUser } from "@/lib/security/rate-limit";
import type { FormState } from "@/lib/validation/auth";
import { endFastSchema, startFastSchema } from "@/lib/validation/habits";

export async function startFast(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase } = await requireUser();
  const parsed = startFastSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Choose a fast length." };
  // User safety (items 49 and 50): no fasting timer for under-18s.
  const age = profileAge(await getProfile(supabase, user.id));
  if (age == null || age < 18) return { status: "error", message: "The fasting timer is for adults only." };
  if (!(await rateLimitUser("logWrite", user.id))) return { status: "error", message: "Please wait a moment and try again." };

  const { error } = await supabase.from("fasting_sessions").insert({ target_hours: parsed.data.targetHours });
  if (error) {
    return { status: "error", message: error.code === "23505" ? "You already have a fast running." : "Something went wrong. Please try again." };
  }
  refresh();
  return { status: "success", message: "Fast started." };
}

export async function endFast(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const parsed = endFastSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await supabase.from("fasting_sessions").update({ ended_at: new Date().toISOString() }).eq("id", parsed.data.id).is("ended_at", null);
  refresh();
}

export async function deleteFast(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const parsed = endFastSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await supabase.from("fasting_sessions").delete().eq("id", parsed.data.id);
  refresh();
}
