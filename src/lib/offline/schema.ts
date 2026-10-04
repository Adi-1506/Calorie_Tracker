import { z } from "zod";
import { dateSchema, mealSchema } from "@/lib/validation/food";

// Entries logged while offline and sent later by src/components/pwa/offline-sync.tsx.
// Every item carries a client-made UUID, so a batch sent twice is stored once.

const amount = (max: number) => z.number().finite().min(0).max(max);

export const offlineFoodSchema = z.object({
  kind: z.literal("food"),
  clientId: z.uuid(),
  date: dateSchema,
  meal: mealSchema,
  label: z.string().trim().max(200),
  calories: amount(10000).refine((n) => n > 0, "Enter calories"),
  proteinG: amount(1000),
  carbsG: amount(1000),
  fatG: amount(1000),
});

export const offlineWaterSchema = z.object({
  kind: z.literal("water"),
  clientId: z.uuid(),
  date: dateSchema,
  ml: z.number().int().min(1).max(5000),
});

export const offlineItemSchema = z.discriminatedUnion("kind", [offlineFoodSchema, offlineWaterSchema]);
export type OfflineItem = z.infer<typeof offlineItemSchema>;

export const MAX_OFFLINE_BATCH = 50;
export const offlineBatchSchema = z.object({ items: z.array(offlineItemSchema).min(1).max(MAX_OFFLINE_BATCH) });
