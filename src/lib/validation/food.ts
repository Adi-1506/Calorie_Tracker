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
    barcode: z
      .string()
      .regex(/^[0-9]{8,14}$/, "Barcodes are 8 to 14 digits")
      .optional()
      .or(z.literal("").transform(() => undefined)),
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

export const favoriteSchema = z.object({ foodId: z.uuid(), favorite: z.enum(["0", "1"]) });

export const copyEntriesSchema = z.object({
  fromDate: dateSchema,
  toDate: dateSchema,
  meal: mealSchema.optional().or(z.literal("").transform(() => undefined)),
});

export const recipeSchema = z.object({
  name: z.string().trim().min(1, "Give your recipe a name").max(200),
  servings: z.coerce.number({ error: "Enter how many servings it makes" }).min(0.5, "At least half a serving").max(100, "At most 100"),
});

export const ingredientSchema = z.object({
  recipeId: z.uuid(),
  foodId: z.uuid(),
  grams: amount("grams", 10000).refine((n) => n > 0, "Enter grams"),
});

export const removeIngredientSchema = z.object({ recipeId: z.uuid(), ingredientId: z.uuid() });

export const logRecipeSchema = z.object({
  recipeId: z.uuid(),
  servings: amount("servings", 50).refine((n) => n > 0, "Enter servings"),
  meal: mealSchema,
  date: dateSchema,
  clientId,
});

export const importRecipeSchema = z.object({
  url: z.string().trim().min(1, "Paste a link to a recipe").max(2048, "That link is too long").url("Paste a full link, starting with https://"),
});

export const importedLineSchema = z.object({ recipeId: z.uuid(), index: z.coerce.number().int().min(0).max(59) });

/** Foods confirmed from a meal photo (step 3d). Catalogue foods are re-read on the server; estimates are bounded like quick add. */
const photoGrams = amount("grams", 2000).refine((n) => n > 0, "Enter grams");
export const photoLogItemSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("food"), foodId: z.uuid(), grams: photoGrams }),
  z
    .object({
      kind: z.literal("estimate"),
      name: z.string().trim().min(1, "Enter a name").max(120),
      grams: photoGrams,
      caloriesPer100g: amount("calories", 900),
      proteinPer100g: amount("protein", 100),
      carbsPer100g: amount("carbs", 100),
      fatPer100g: amount("fat", 100),
    })
    .refine((v) => v.proteinPer100g + v.carbsPer100g + v.fatPer100g <= 100.5, "Macros can't add up to more than 100 g per 100 g"),
]);

export const photoLogSchema = z.object({
  meal: mealSchema,
  date: dateSchema,
  clientId,
  items: z
    .string()
    .max(20_000)
    .transform((s, ctx) => {
      try {
        return JSON.parse(s) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid items" });
        return z.NEVER;
      }
    })
    .pipe(z.array(photoLogItemSchema).min(1, "Pick at least one food").max(12)),
});
