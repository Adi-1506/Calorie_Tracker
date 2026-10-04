import { describe, expect, it } from "vitest";
import { ageOn, bmr, CALORIE_FLOOR, suggestTargets, tdee } from "./targets";

describe("ageOn", () => {
  it("counts birthdays correctly", () => {
    expect(ageOn(new Date("2000-10-05"), new Date("2026-10-04"))).toBe(25);
    expect(ageOn(new Date("2000-10-04"), new Date("2026-10-04"))).toBe(26);
  });
});

describe("bmr / tdee (Mifflin-St Jeor)", () => {
  it("matches reference values", () => {
    expect(bmr({ sex: "male", weightKg: 70, heightCm: 175, age: 30 })).toBeCloseTo(1648.75);
    expect(bmr({ sex: "female", weightKg: 60, heightCm: 165, age: 30 })).toBeCloseTo(1320.25);
    expect(tdee(1500, "moderate")).toBeCloseTo(2325);
  });
});

describe("suggestTargets", () => {
  const adult = { sex: "male" as const, weightKg: 70, heightCm: 175, age: 30, activity: "moderate" as const };

  it("creates a 500 kcal deficit to lose weight", () => {
    const maintain = suggestTargets({ ...adult, goal: "maintain" });
    const lose = suggestTargets({ ...adult, goal: "lose" });
    expect(maintain.calories - lose.calories).toBe(500);
  });

  it("macros add up to roughly the calorie target", () => {
    for (const goal of ["maintain", "gain", "keto", "high_protein", "diabetic_friendly"] as const) {
      const t = suggestTargets({ ...adult, goal });
      const kcal = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
      expect(Math.abs(kcal - t.calories)).toBeLessThan(40);
    }
  });

  it("keeps keto carbs low", () => {
    expect(suggestTargets({ ...adult, goal: "keto" }).carbsG).toBeLessThanOrEqual(30);
  });

  it("never goes below the safe floor (item 49)", () => {
    const tiny = suggestTargets({ sex: "female", weightKg: 40, heightCm: 145, age: 70, activity: "sedentary", goal: "lose" });
    expect(tiny.calories).toBe(CALORIE_FLOOR.female);
  });

  it("never gives minors a deficit (item 50)", () => {
    const teen = { sex: "female" as const, weightKg: 55, heightCm: 160, age: 16, activity: "light" as const };
    expect(suggestTargets({ ...teen, goal: "lose" }).calories).toBe(suggestTargets({ ...teen, goal: "maintain" }).calories);
  });
});
