// BMR / TDEE and calorie + macro targets (spec section 1, security item 49).
// Pure functions so they can be unit-tested and reused on client and server.

export type Sex = "female" | "male" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain" | "keto" | "high_protein" | "diabetic_friendly";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Safe daily minimums. Targets are never suggested or accepted below these. */
export const CALORIE_FLOOR: Record<Sex, number> = { female: 1200, male: 1500, other: 1200 };
export const CALORIE_CEILING = 6000;

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export function ageOn(dateOfBirth: Date, today = new Date()): number {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const beforeBirthday =
    today.getMonth() < dateOfBirth.getMonth() ||
    (today.getMonth() === dateOfBirth.getMonth() && today.getDate() < dateOfBirth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Mifflin-St Jeor. "other" uses the midpoint of the male and female constants. */
export function bmr({ sex, weightKg, heightCm, age }: { sex: Sex; weightKg: number; heightCm: number; age: number }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const offset = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  return base + offset;
}

export function tdee(bmrValue: number, activity: ActivityLevel) {
  return bmrValue * ACTIVITY_FACTORS[activity];
}

export type Targets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
};

export type TargetInput = {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activity: ActivityLevel;
  goal: Goal;
};

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
  keto: 0,
  high_protein: 0,
  diabetic_friendly: 0,
};

export function isMinor(age: number) {
  return age < 18;
}

export function clampCalories(calories: number, sex: Sex) {
  return Math.min(CALORIE_CEILING, Math.max(CALORIE_FLOOR[sex], Math.round(calories)));
}

export function suggestTargets(input: TargetInput): Targets {
  const maintenance = tdee(bmr(input), input.activity);
  // No deficit for under-18s (item 50), whatever goal is passed in.
  const adjustment = isMinor(input.age) ? Math.max(0, GOAL_ADJUSTMENT[input.goal]) : GOAL_ADJUSTMENT[input.goal];
  const calories = clampCalories(maintenance + adjustment, input.sex);

  let proteinG: number;
  let fatG: number;
  let carbsG: number;

  switch (input.goal) {
    case "keto": {
      carbsG = 25;
      proteinG = Math.round(1.6 * input.weightKg);
      fatG = Math.round((calories - carbsG * KCAL_PER_G.carbs - proteinG * KCAL_PER_G.protein) / KCAL_PER_G.fat);
      break;
    }
    case "high_protein": {
      proteinG = Math.round(2.0 * input.weightKg);
      fatG = Math.round((calories * 0.25) / KCAL_PER_G.fat);
      carbsG = Math.round((calories - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat) / KCAL_PER_G.carbs);
      break;
    }
    case "diabetic_friendly": {
      carbsG = Math.round((calories * 0.4) / KCAL_PER_G.carbs);
      proteinG = Math.round((calories * 0.25) / KCAL_PER_G.protein);
      fatG = Math.round((calories * 0.35) / KCAL_PER_G.fat);
      break;
    }
    default: {
      proteinG = Math.round(1.6 * input.weightKg);
      fatG = Math.round((calories * 0.3) / KCAL_PER_G.fat);
      carbsG = Math.round((calories - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat) / KCAL_PER_G.carbs);
    }
  }

  return {
    calories,
    proteinG: Math.max(0, proteinG),
    carbsG: Math.max(0, carbsG),
    fatG: Math.max(0, fatG),
    fiberG: Math.round((calories / 1000) * 14),
    waterMl: Math.round((input.weightKg * 35) / 50) * 50,
  };
}
