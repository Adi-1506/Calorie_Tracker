import { CALORIE_CEILING, CALORIE_FLOOR, type Goal, type Sex } from "./targets";

// Weekly adaptive targets (spec section 1): compare what was eaten with how
// the weight trend moved to estimate real maintenance, then nudge the target
// toward the goal's pace. Changes are small and always shown to the user to
// accept; nothing changes on its own.

const KCAL_PER_KG = 7700;
const MAX_STEP = 150; // kcal per weekly adjustment
const PACE_KG_PER_WEEK: Record<Goal, number> = {
  lose: -0.5,
  maintain: 0,
  gain: 0.25,
  keto: 0,
  high_protein: 0,
  diabetic_friendly: 0,
};

export type AdaptiveInput = {
  goal: Goal;
  sex: Sex;
  isMinor: boolean;
  currentCalories: number;
  /** Average kcal on days with food logged, over the last 14 days. */
  avgIntake: number;
  loggedDays: number;
  /** Smoothed weight change in kg per week (from the trend line). */
  weeklyChangeKg: number | null;
};

export type AdaptiveSuggestion = { calories: number; maintenance: number; reason: string };

export function adaptiveSuggestion(i: AdaptiveInput): AdaptiveSuggestion | null {
  // Need most days logged, or the intake average says more about logging gaps than eating.
  if (i.weeklyChangeKg == null || i.loggedDays < 10 || i.avgIntake <= 0) return null;

  const maintenance = Math.round(i.avgIntake - (i.weeklyChangeKg * KCAL_PER_KG) / 7);
  let pace = PACE_KG_PER_WEEK[i.goal];
  if (i.isMinor) pace = Math.max(0, pace); // never a deficit for under-18s (item 50)
  const ideal = maintenance + (pace * KCAL_PER_KG) / 7;

  const step = Math.max(-MAX_STEP, Math.min(MAX_STEP, ideal - i.currentCalories));
  const floor = i.isMinor ? Math.max(CALORIE_FLOOR[i.sex], maintenance) : CALORIE_FLOOR[i.sex];
  const calories = Math.round(Math.min(CALORIE_CEILING, Math.max(floor, i.currentCalories + step)) / 10) * 10;
  if (Math.abs(calories - i.currentCalories) < 50) return null;

  const direction = calories > i.currentCalories ? "up" : "down";
  const trend =
    i.weeklyChangeKg === 0 ? "held steady" : `${i.weeklyChangeKg < 0 ? "dropped" : "risen"} about ${Math.abs(i.weeklyChangeKg)} kg a week`;
  return {
    calories,
    maintenance,
    reason: `Over the last two weeks you ate about ${Math.round(i.avgIntake)} kcal a day and your weight has ${trend}, so your real maintenance looks like about ${maintenance} kcal. Moving your target ${direction} to ${calories} kcal keeps you on pace for your goal.`,
  };
}
