import { describe, expect, it } from "vitest";
import { offlineBatchSchema, offlineItemSchema } from "./schema";

const id = "6f1c3c1e-8a7b-4d2e-9f00-1a2b3c4d5e6f";
const food = { kind: "food", clientId: id, date: "2026-10-04", meal: "lunch", label: "Dal rice", calories: 450, proteinG: 15, carbsG: 70, fatG: 10 };

describe("offline items", () => {
  it("accepts food and water entries", () => {
    expect(offlineItemSchema.safeParse(food).success).toBe(true);
    expect(offlineItemSchema.safeParse({ kind: "water", clientId: id, date: "2026-10-04", ml: 250 }).success).toBe(true);
  });

  it("requires a UUID so retries are deduplicated", () => {
    expect(offlineItemSchema.safeParse({ ...food, clientId: "1" }).success).toBe(false);
  });

  it("rejects out-of-range numbers, unknown meals and bad dates", () => {
    expect(offlineItemSchema.safeParse({ ...food, calories: 0 }).success).toBe(false);
    expect(offlineItemSchema.safeParse({ ...food, calories: 1e9 }).success).toBe(false);
    expect(offlineItemSchema.safeParse({ ...food, proteinG: -1 }).success).toBe(false);
    expect(offlineItemSchema.safeParse({ ...food, meal: "brunch" }).success).toBe(false);
    expect(offlineItemSchema.safeParse({ ...food, date: "2026-13-40" }).success).toBe(false);
    expect(offlineItemSchema.safeParse({ kind: "water", clientId: id, date: "2026-10-04", ml: 9000 }).success).toBe(false);
  });

  it("rejects unknown kinds", () => {
    expect(offlineItemSchema.safeParse({ ...food, kind: "weight" }).success).toBe(false);
  });

  it("caps the batch size", () => {
    expect(offlineBatchSchema.safeParse({ items: [] }).success).toBe(false);
    expect(offlineBatchSchema.safeParse({ items: Array(51).fill(food) }).success).toBe(false);
    expect(offlineBatchSchema.safeParse({ items: Array(50).fill(food) }).success).toBe(true);
  });
});
