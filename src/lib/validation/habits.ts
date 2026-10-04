import { z } from "zod";

export const FAST_TARGETS = [12, 14, 16, 18, 20, 24] as const;

export const startFastSchema = z.object({
  targetHours: z.coerce.number().refine((n) => (FAST_TARGETS as readonly number[]).includes(n), "Choose a fast length"),
});

export const endFastSchema = z.object({ id: z.uuid() });
