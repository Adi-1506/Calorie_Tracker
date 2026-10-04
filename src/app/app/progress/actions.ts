"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProfile, profileToday } from "@/lib/data/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptHealthValue, hasHealthDataKey } from "@/lib/security/health-crypto";
import { rateLimitUser } from "@/lib/security/rate-limit";
import type { FormState } from "@/lib/validation/auth";
import { deleteByIdSchema, MEASUREMENTS, measurementsSchema, weightSchema, type Measurements } from "@/lib/validation/progress";

// Weight and measurements are encrypted here before they reach the database
// (security item 5); RLS keeps every row to its owner (item 4).

const GENERIC = "Something went wrong. Please try again.";
const NO_KEY = "Saving body data isn't available right now.";

function invalid(error: z.ZodError): FormState {
  return { status: "error", fieldErrors: z.flattenError(error).fieldErrors };
}

async function context() {
  const { user, supabase } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  return { user, supabase, today: profile ? profileToday(profile) : new Date().toISOString().slice(0, 10) };
}

/** No future dates, and nothing more than ten years back. */
function pastDate(date: string, today: string) {
  const diffDays = (Date.parse(date) - Date.parse(today)) / 86_400_000;
  return diffDays <= 0 && diffDays >= -3653;
}

export async function logWeight(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase, today } = await context();
  const parsed = weightSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  if (!pastDate(parsed.data.date, today)) return { status: "error", fieldErrors: { date: ["Choose today or an earlier date"] } };
  if (!hasHealthDataKey()) return { status: "error", message: NO_KEY };
  if (!(await rateLimitUser("logWrite", user.id))) return { status: "error", message: "Please wait a moment and try again." };

  const kg = Math.round(parsed.data.weightKg * 100) / 100;
  const { error } = await supabase
    .from("weight_logs")
    .upsert({ measured_on: parsed.data.date, weight_kg_enc: encryptHealthValue(user.id, String(kg)) }, { onConflict: "user_id,measured_on" });
  if (error) return { status: "error", message: GENERIC };
  refresh();
  return { status: "success", message: `Saved ${kg} kg.` };
}

export async function saveMeasurements(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, supabase, today } = await context();
  const parsed = measurementsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  if (!pastDate(parsed.data.date, today)) return { status: "error", fieldErrors: { date: ["Choose today or an earlier date"] } };
  if (!hasHealthDataKey()) return { status: "error", message: NO_KEY };
  if (!(await rateLimitUser("logWrite", user.id))) return { status: "error", message: "Please wait a moment and try again." };

  const values: Measurements = {};
  for (const m of MEASUREMENTS) {
    const v = parsed.data[m.key];
    if (v !== undefined) values[m.key] = Math.round(v * 10) / 10;
  }
  const { error } = await supabase
    .from("body_measurements")
    .insert({ measured_on: parsed.data.date, data_enc: encryptHealthValue(user.id, JSON.stringify(values)) });
  if (error) return { status: "error", message: GENERIC };
  refresh();
  return { status: "success", message: "Measurements saved." };
}

export async function deleteWeight(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const parsed = deleteByIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await supabase.from("weight_logs").delete().eq("id", parsed.data.id);
  refresh();
}

export async function deleteMeasurement(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const parsed = deleteByIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await supabase.from("body_measurements").delete().eq("id", parsed.data.id);
  refresh();
}

export async function deletePhoto(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const parsed = deleteByIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  // Ownership comes from RLS: the user's client only sees their own rows.
  const { data } = await supabase.from("progress_photos").delete().eq("id", parsed.data.id).select("storage_path").maybeSingle();
  if (data) await createAdminClient().storage.from("progress-photos").remove([data.storage_path]);
  refresh();
}
