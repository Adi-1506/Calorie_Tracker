import { z } from "zod";
import { isIsoDate, isValidTimeZone } from "@/lib/dates";
import { ageOn, CALORIE_CEILING, CALORIE_FLOOR, isMinor } from "@/lib/nutrition/targets";

// Shared by the onboarding/target forms and their Server Actions (item 14).

export const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Prefer not to say" },
] as const;

export const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Mostly sitting", hint: "Desk job, little exercise" },
  { value: "light", label: "Lightly active", hint: "Exercise 1 to 3 days a week" },
  { value: "moderate", label: "Moderately active", hint: "Exercise 3 to 5 days a week" },
  { value: "active", label: "Very active", hint: "Hard exercise 6 to 7 days a week" },
  { value: "very_active", label: "Extremely active", hint: "Physical job or training twice a day" },
] as const;

export const GOAL_OPTIONS = [
  { value: "lose", label: "Lose weight", adultOnly: true },
  { value: "maintain", label: "Maintain weight", adultOnly: false },
  { value: "gain", label: "Gain weight or muscle", adultOnly: false },
  { value: "high_protein", label: "High protein", adultOnly: false },
  { value: "keto", label: "Keto (low carb)", adultOnly: true },
  { value: "diabetic_friendly", label: "Diabetes-friendly (lower carb)", adultOnly: false },
] as const;

const enumOf = <T extends readonly { value: string }[]>(options: T, message: string) =>
  z.enum(options.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]], { error: message });

const number = (label: string, min: number, max: number) =>
  z.coerce
    .number({ error: `Enter your ${label}` })
    .refine(Number.isFinite, `Enter your ${label}`)
    .min(min, `${label[0].toUpperCase()}${label.slice(1)} must be at least ${min}`)
    .max(max, `${label[0].toUpperCase()}${label.slice(1)} must be at most ${max}`);

export const onboardingSchema = z
  .object({
    displayName: z.string().trim().max(60, "Use at most 60 characters").optional().or(z.literal("")),
    dateOfBirth: z.string().refine(isIsoDate, "Enter your date of birth"),
    sex: enumOf(SEX_OPTIONS, "Choose an option"),
    heightCm: number("height", 50, 272),
    weightKg: number("weight", 20, 400),
    activity: enumOf(ACTIVITY_OPTIONS, "Choose your activity level"),
    goal: enumOf(GOAL_OPTIONS, "Choose a goal"),
    dietType: z.string().trim().max(40).optional().or(z.literal("")),
    allergies: z.string().trim().max(500, "Too long").optional().or(z.literal("")),
    timezone: z.string().refine(isValidTimeZone).catch("UTC"),
  })
  .superRefine((v, ctx) => {
    if (!isIsoDate(v.dateOfBirth)) return;
    const age = ageOn(new Date(`${v.dateOfBirth}T00:00:00Z`));
    if (age < 13 || age > 120) {
      ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "You must be at least 13 to use this app" });
      return;
    }
    // Item 50: no weight-loss or restrictive goals for under-18s.
    const goal = GOAL_OPTIONS.find((g) => g.value === v.goal);
    if (isMinor(age) && goal?.adultOnly) {
      ctx.addIssue({ code: "custom", path: ["goal"], message: "This goal isn't available for people under 18" });
    }
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export function parseAllergies(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .map((a) => a.slice(0, 40))
    .slice(0, 30);
}

export const targetsSchema = z
  .object({
    calories: z.coerce.number().int("Use a whole number").max(CALORIE_CEILING, `At most ${CALORIE_CEILING} kcal`),
    proteinG: z.coerce.number().int("Use a whole number").min(0).max(500),
    carbsG: z.coerce.number().int("Use a whole number").min(0).max(1000),
    fatG: z.coerce.number().int("Use a whole number").min(0).max(400),
    waterMl: z.coerce.number().int("Use a whole number").min(0).max(10000),
    // Set by the server from the profile, never trusted from the form.
    floor: z.number().int().optional(),
  })
  .superRefine((v, ctx) => {
    const floor = v.floor ?? CALORIE_FLOOR.female;
    if (v.calories < floor) {
      ctx.addIssue({
        code: "custom",
        path: ["calories"],
        message: `For safety, daily calories can't go below ${floor} kcal. Talk to a doctor or dietitian about very low calorie plans.`,
      });
    }
  });

export type TargetsInput = z.infer<typeof targetsSchema>;
