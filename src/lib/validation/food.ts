import { z } from "zod";
import { isIsoDate } from "@/lib/dates";

// Shared by the logging forms and their Server Actions (item 14).

export const MEALS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
] as const;

export type Meal = (typeof MEALS)[number]["value"];

export const mealSchema = z.enum(["breakfast", "lunch", "dinner", "snack"], { error: "Choose a meal" });
export const dateSchema = z.string().refine(isIsoDate, "Invalid date");
const clientId = z.uuid().optional().or(z.literal("").transform(() => undefined));

const amount = (label: string, max: number) =>
  z.coerce.number({ error: `Enter ${label}` }).refine(Number.isFinite, `Enter ${label}`).min(0, "Can't be negative").max(max, `At most ${max}`);

const optionalAmount = (max: number) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), amount("a number", max).optional());

/** Log a food that's already in the database (catalogue or the user's own). */
export const logFoodSchema = z.object({
  foodId: z.uuid(),
  meal: mealSchema,
  date: dateSchema,
  servingId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  quantity: amount("an amount", 10000).refine((n) => n > 0, "Enter an amount"),
  clientId,
});

/** Log a product found on Open Food Facts or USDA. The server re-fetches it; nutrients from the form are never trusted. */
export const logExternalFoodSchema = z.object({
  source: z.enum(["open_food_facts", "usda"]),
  externalId: z.string().regex(/^[0-9]{1,14}$/, "Invalid product"),
  meal: mealSchema,
  date: dateSchema,
  grams: amount("an amount", 10000).refine((n) => n > 0, "Enter an amount"),
  clientId,
});

export const quickAddSchema = z.object({
  label: z.string().trim().max(200).optional().or(z.literal("")),
  calories: amount("calories", 10000).refine((n) => n > 0, "Enter calories"),
  proteinG: optionalAmount(1000),
  carbsG: optionalAmount(1000),
  fatG: optionalAmount(1000),
  meal: mealSchema,
  date: dateSchema,
  clientId,
});

export const customFoodSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(200),
    nameLocal: z.string().trim().max(200).optional().or(z.literal("")),
    brand: z.string().trim().max(120).optional().or(z.literal("")),
    calories: amount("calories", 900),
    proteinG: amount("protein", 100),
    carbsG: amount("carbs", 100),
    fatG: amount("fat", 100),
    fiberG: optionalAmount(100),
    servingLabel: z.string().trim().max(80).optional().or(z.literal("")),
    servingGrams: optionalAmount(5000),
  })
  .refine((v) => v.proteinG + v.carbsG + v.fatG <= 100, {
    message: "Protein, carbs and fat can't add up to more than 100 g per 100 g",
    path: ["fatG"],
  })
  .refine((v) => !v.servingLabel || (v.servingGrams ?? 0) > 0, {
    message: "Enter how many grams this portion weighs",
    path: ["servingGrams"],
  });

export const waterSchema = z.object({
  ml: z.coerce.number().int().min(1, "Enter an amount").max(5000, "At most 5000 ml at once"),
  date: dateSchema,
  clientId,
});

export const deleteEntrySchema = z.object({
  kind: z.enum(["meal", "water"]),
  id: z.uuid(),
});

export const searchQuerySchema = z.string().trim().min(2).max(100);
