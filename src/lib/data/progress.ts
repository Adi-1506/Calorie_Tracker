import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptHealthValue, hasHealthDataKey } from "@/lib/security/health-crypto";
import type { Measurements } from "@/lib/validation/progress";

export type WeightEntry = { id: string; date: string; kg: number };
export type MeasurementEntry = { id: string; date: string; values: Measurements };
export type PhotoEntry = { id: string; date: string };

const MAX_ROWS = 400;

function decrypt<T>(userId: string, payload: string, parse: (s: string) => T): T | null {
  try {
    return parse(decryptHealthValue(userId, payload));
  } catch {
    return null; // tampered or encrypted with another key: skip rather than crash the page
  }
}

export async function getWeights(supabase: SupabaseClient, userId: string): Promise<WeightEntry[]> {
  if (!hasHealthDataKey()) return [];
  const { data } = await supabase
    .from("weight_logs")
    .select("id, measured_on, weight_kg_enc")
    .order("measured_on", { ascending: false })
    .limit(MAX_ROWS);
  return (data ?? []).flatMap((r) => {
    const kg = decrypt(userId, r.weight_kg_enc, Number);
    return kg != null && Number.isFinite(kg) ? [{ id: r.id, date: r.measured_on, kg }] : [];
  });
}

export async function getMeasurements(supabase: SupabaseClient, userId: string): Promise<MeasurementEntry[]> {
  if (!hasHealthDataKey()) return [];
  const { data } = await supabase
    .from("body_measurements")
    .select("id, measured_on, data_enc")
    .order("measured_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  return (data ?? []).flatMap((r) => {
    const values = decrypt(userId, r.data_enc, (s) => JSON.parse(s) as Measurements);
    return values ? [{ id: r.id, date: r.measured_on, values }] : [];
  });
}

export async function getPhotos(supabase: SupabaseClient): Promise<PhotoEntry[]> {
  const { data } = await supabase.from("progress_photos").select("id, taken_on").order("taken_on", { ascending: false }).limit(60);
  return (data ?? []).map((r) => ({ id: r.id, date: r.taken_on }));
}
