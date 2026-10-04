import { describe, expect, it } from "vitest";
import { measurementsSchema, weightSchema } from "./progress";

describe("progress schemas", () => {
  it("weight must be realistic", () => {
    expect(weightSchema.safeParse({ date: "2026-10-04", weightKg: "12" }).success).toBe(false);
    expect(weightSchema.safeParse({ date: "2026-10-04", weightKg: "abc" }).success).toBe(false);
    expect(weightSchema.parse({ date: "2026-10-04", weightKg: "72.4" }).weightKg).toBe(72.4);
  });
  it("measurements need at least one value and drop blanks", () => {
    expect(measurementsSchema.safeParse({ date: "2026-10-04", waist: "", hips: "" }).success).toBe(false);
    const v = measurementsSchema.parse({ date: "2026-10-04", waist: "82", hips: "" });
    expect(v).toEqual({ date: "2026-10-04", waist: 82 });
    expect(measurementsSchema.safeParse({ date: "2026-10-04", waist: "5" }).success).toBe(false);
  });
});
