import { describe, expect, it } from "vitest";
import { adaptiveSuggestion, type AdaptiveInput } from "./adaptive";

const base: AdaptiveInput = { goal: "lose", sex: "female", isMinor: false, currentCalories: 1600, avgIntake: 1600, loggedDays: 12, weeklyChangeKg: 0 };

describe("adaptiveSuggestion", () => {
  it("needs enough logged days and a trend", () => {
    expect(adaptiveSuggestion({ ...base, loggedDays: 6 })).toBeNull();
    expect(adaptiveSuggestion({ ...base, weeklyChangeKg: null })).toBeNull();
  });
  it("lowers the target in small steps when weight isn't moving on a loss goal", () => {
    const s = adaptiveSuggestion(base)!;
    expect(s.maintenance).toBe(1600);
    expect(s.calories).toBe(1450); // capped at 150 kcal per week
  });
  it("leaves it alone when already on pace", () => {
    expect(adaptiveSuggestion({ ...base, weeklyChangeKg: -0.5 })).toBeNull();
  });
  it("raises the target if weight drops much faster than planned", () => {
    expect(adaptiveSuggestion({ ...base, weeklyChangeKg: -1.2 })!.calories).toBe(1750);
  });
  it("never goes below the safety floor", () => {
    expect(adaptiveSuggestion({ ...base, currentCalories: 1250, avgIntake: 1250 })!.calories).toBe(1200);
    expect(adaptiveSuggestion({ ...base, currentCalories: 1200, avgIntake: 1200 })).toBeNull();
  });
  it("never suggests a deficit for minors", () => {
    const s = adaptiveSuggestion({ ...base, isMinor: true, goal: "maintain", currentCalories: 2000, avgIntake: 2000, weeklyChangeKg: 0.3 });
    expect(s === null || s.calories >= s.maintenance).toBe(true);
  });
});
