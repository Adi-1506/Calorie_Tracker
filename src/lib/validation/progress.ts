import { z } from "zod";
import { dateSchema } from "./food";

export const weightSchema = z.object({
  date: dateSchema,
  weightKg: z.coerce
    .number({ error: "Enter your weight" })
    .refine(Number.isFinite, "Enter your weight")
    .min(20, "Enter a weight between 20 and 400 kg")
    .max(400, "Enter a weight between 20 and 400 kg"),
});

export const MEASUREMENTS = [
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "chest", label: "Chest" },
  { key: "arm", label: "Upper arm" },
  { key: "thigh", label: "Thigh" },
  { key: "neck", label: "Neck" },
] as const;

const cm = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number({ error: "Enter a number" }).refine(Number.isFinite, "Enter a number").min(10, "10 to 300 cm").max(300, "10 to 300 cm").optional(),
);

export const measurementsSchema = z
  .object({
    date: dateSchema,
    waist: cm,
    hips: cm,
    chest: cm,
    arm: cm,
    thigh: cm,
    neck: cm,
  })
  .refine((v) => MEASUREMENTS.some((m) => v[m.key] !== undefined), { message: "Enter at least one measurement", path: ["waist"] });

export type Measurements = Partial<Record<(typeof MEASUREMENTS)[number]["key"], number>>;

export const deleteByIdSchema = z.object({ id: z.uuid() });

export const exportSchema = z.object({
  type: z.enum(["food", "weight", "measurements"]),
});
