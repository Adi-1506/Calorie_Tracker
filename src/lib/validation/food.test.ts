import { describe, expect, it } from "vitest";
import {
  copyEntriesSchema,
  customFoodSchema,
  favoriteSchema,
  importedLineSchema,
  importRecipeSchema,
  ingredientSchema,
  logExternalFoodSchema,
  logFoodSchema,
  logRecipeSchema,
  quickAddSchema,
  recipeSchema,
  waterSchema,
} from "./food";

const id = "6f7b9a53-8044-4cfd-81b1-5dcaecde191a";

describe("food validation", () => {
  it("accepts a normal log entry and ignores nutrient fields from the form", () => {
    const r = logFoodSchema.safeParse({ foodId: id, meal: "lunch", date: "2026-10-04", quantity: "1.5", calories: "1" });
    expect(r.success).toBe(true);
    expect(r.success && "calories" in r.data).toBe(false);
  });

  it("rejects bad ids, meals, dates and amounts", () => {
    expect(logFoodSchema.safeParse({ foodId: "1 or 1=1", meal: "lunch", date: "2026-10-04", quantity: "1" }).success).toBe(false);
    expect(logFoodSchema.safeParse({ foodId: id, meal: "brunch", date: "2026-10-04", quantity: "1" }).success).toBe(false);
    expect(logFoodSchema.safeParse({ foodId: id, meal: "lunch", date: "2026-13-01", quantity: "1" }).success).toBe(false);
    expect(logFoodSchema.safeParse({ foodId: id, meal: "lunch", date: "2026-10-04", quantity: "0" }).success).toBe(false);
    expect(logFoodSchema.safeParse({ foodId: id, meal: "lunch", date: "2026-10-04", quantity: "-5" }).success).toBe(false);
  });

  it("only accepts numeric external product ids", () => {
    const base = { source: "open_food_facts", meal: "snack", date: "2026-10-04", grams: "30" };
    expect(logExternalFoodSchema.safeParse({ ...base, externalId: "8901063010338" }).success).toBe(true);
    expect(logExternalFoodSchema.safeParse({ ...base, externalId: "../admin" }).success).toBe(false);
    expect(logExternalFoodSchema.safeParse({ ...base, source: "evil.example", externalId: "1" }).success).toBe(false);
  });

  it("quick add needs calories; macros are optional", () => {
    expect(quickAddSchema.safeParse({ calories: "250", meal: "snack", date: "2026-10-04", proteinG: "" }).success).toBe(true);
    expect(quickAddSchema.safeParse({ calories: "", meal: "snack", date: "2026-10-04" }).success).toBe(false);
  });

  it("custom foods must be physically possible", () => {
    const base = { name: "Moilee", calories: "140", proteinG: "12", carbsG: "4", fatG: "8" };
    expect(customFoodSchema.safeParse(base).success).toBe(true);
    expect(customFoodSchema.safeParse({ ...base, proteinG: "60", carbsG: "60" }).success).toBe(false);
    expect(customFoodSchema.safeParse({ ...base, calories: "1200" }).success).toBe(false);
    expect(customFoodSchema.safeParse({ ...base, servingLabel: "1 bowl" }).success).toBe(false);
  });

  it("caps water per entry", () => {
    expect(waterSchema.safeParse({ ml: "250", date: "2026-10-04" }).success).toBe(true);
    expect(waterSchema.safeParse({ ml: "99999", date: "2026-10-04" }).success).toBe(false);
  });
});

describe("faster logging schemas", () => {
  it("copyEntries treats an empty meal as the whole day", () => {
    const r = copyEntriesSchema.parse({ fromDate: "2026-10-03", toDate: "2026-10-04", meal: "" });
    expect(r.meal).toBeUndefined();
    expect(copyEntriesSchema.safeParse({ fromDate: "2026-10-03", toDate: "2026-10-04", meal: "brunch" }).success).toBe(false);
  });

  it("recipes need a name and sensible servings", () => {
    expect(recipeSchema.safeParse({ name: " ", servings: "2" }).success).toBe(false);
    expect(recipeSchema.safeParse({ name: "Sambar", servings: "0" }).success).toBe(false);
    expect(recipeSchema.parse({ name: "Sambar", servings: "4" }).servings).toBe(4);
  });

  it("ingredients and recipe logs need a positive amount", () => {
    expect(ingredientSchema.safeParse({ recipeId: id, foodId: id, grams: "0" }).success).toBe(false);
    expect(ingredientSchema.parse({ recipeId: id, foodId: id, grams: "150" }).grams).toBe(150);
    const log = { recipeId: id, servings: "0", meal: "lunch", date: "2026-10-04", clientId: id };
    expect(logRecipeSchema.safeParse(log).success).toBe(false);
    expect(logRecipeSchema.safeParse({ ...log, servings: "1.5" }).success).toBe(true);
  });

  it("import needs a full link", () => {
    expect(importRecipeSchema.safeParse({ url: "" }).success).toBe(false);
    expect(importRecipeSchema.safeParse({ url: "example.com/recipe" }).success).toBe(false);
    expect(importRecipeSchema.safeParse({ url: "https://example.com/recipe" }).success).toBe(true);
  });

  it("imported line index stays within the list limit", () => {
    expect(importedLineSchema.safeParse({ recipeId: id, index: "60" }).success).toBe(false);
    expect(importedLineSchema.parse({ recipeId: id, index: "3" }).index).toBe(3);
    expect(favoriteSchema.safeParse({ foodId: id, favorite: "yes" }).success).toBe(false);
  });
});
