import { describe, expect, it } from "vitest";
import { onboardingSchema, parseAllergies, targetsSchema } from "./profile";

const valid = {
  dateOfBirth: "1995-06-15",
  sex: "female",
  heightCm: "160",
  weightKg: "60",
  activity: "light",
  goal: "lose",
  timezone: "Asia/Kolkata",
};

describe("onboardingSchema", () => {
  it("accepts a complete adult profile", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("blocks weight-loss and keto goals for under-18s (item 50)", () => {
    const dob = `${new Date().getFullYear() - 15}-01-01`;
    for (const goal of ["lose", "keto"]) {
      const r = onboardingSchema.safeParse({ ...valid, dateOfBirth: dob, goal });
      expect(r.success).toBe(false);
    }
    expect(onboardingSchema.safeParse({ ...valid, dateOfBirth: dob, goal: "maintain" }).success).toBe(true);
  });

  it("rejects under-13s, impossible numbers and unknown enums", () => {
    expect(onboardingSchema.safeParse({ ...valid, dateOfBirth: `${new Date().getFullYear() - 10}-01-01` }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, heightCm: "3000" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, weightKg: "abc" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, goal: "starve" }).success).toBe(false);
  });

  it("falls back to UTC for a bogus time zone", () => {
    const r = onboardingSchema.safeParse({ ...valid, timezone: "Nowhere/Land" });
    expect(r.success && r.data.timezone).toBe("UTC");
  });

  it("drops fields it doesn't know (mass assignment, item 8)", () => {
    const r = onboardingSchema.safeParse({ ...valid, role: "admin", is_premium: "true" });
    expect(r.success && Object.keys(r.data)).not.toContain("role");
  });
});

describe("parseAllergies", () => {
  it("normalises and caps the list", () => {
    expect(parseAllergies(" Peanuts, ,Gluten ")).toEqual(["peanuts", "gluten"]);
    expect(parseAllergies(Array(50).fill("x").join(","))).toHaveLength(30);
  });
});

describe("targetsSchema", () => {
  const base = { calories: "1800", proteinG: "100", carbsG: "200", fatG: "60", waterMl: "2000" };
  it("enforces the floor passed by the server (item 49)", () => {
    expect(targetsSchema.safeParse({ ...base, floor: 1500 }).success).toBe(true);
    expect(targetsSchema.safeParse({ ...base, calories: "1400", floor: 1500 }).success).toBe(false);
    expect(targetsSchema.safeParse({ ...base, calories: "1000" }).success).toBe(false);
    expect(targetsSchema.safeParse({ ...base, calories: "7000" }).success).toBe(false);
  });
});
