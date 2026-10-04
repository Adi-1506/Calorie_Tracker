"use client";

import { useActionState, useSyncExternalStore } from "react";
import { completeOnboarding } from "@/app/app/actions";
import { errorsFor, Field, FormMessage, SubmitButton, useClientValidation } from "@/components/auth/form-parts";
import { initialFormState } from "@/lib/validation/auth";
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, onboardingSchema, SEX_OPTIONS } from "@/lib/validation/profile";
import { Select } from "./fields";

const noopSubscribe = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export type OnboardingDefaults = Partial<Record<
  "displayName" | "dateOfBirth" | "sex" | "heightCm" | "weightKg" | "activity" | "goal" | "dietType" | "allergies",
  string
>>;

export function OnboardingForm({ defaults = {} }: { defaults?: OnboardingDefaults }) {
  const [state, action] = useActionState(completeOnboarding, initialFormState);
  const { clientErrors, onSubmit } = useClientValidation(onboardingSchema);
  // The browser's time zone, so "today" in the app matches the user's day.
  const timezone = useSyncExternalStore(noopSubscribe, browserTimeZone, () => "UTC");
  const err = (name: string) => errorsFor(name, state, clientErrors);

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      <Field name="displayName"
        defaultValue={defaults.displayName} label="What should we call you? (optional)" autoComplete="given-name" required={false} errors={err("displayName")} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="dateOfBirth"
        defaultValue={defaults.dateOfBirth} label="Date of birth" type="date" autoComplete="bday" errors={err("dateOfBirth")} />
        <Select name="sex"
        defaultValue={defaults.sex} label="Sex (for the calorie formula)" options={SEX_OPTIONS} placeholder="Choose" errors={err("sex")} />
        <Field name="heightCm"
        defaultValue={defaults.heightCm} label="Height (cm)" type="number" inputMode="decimal" step="0.1" min={50} max={272} errors={err("heightCm")} />
        <Field
          name="weightKg"
        defaultValue={defaults.weightKg}
          label="Current weight (kg)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={20}
          max={400}
          hint="Stored encrypted. Only you can see it."
          errors={err("weightKg")}
        />
      </div>
      <Select name="activity"
        defaultValue={defaults.activity} label="How active are you?" options={ACTIVITY_OPTIONS} placeholder="Choose" errors={err("activity")} />
      <Select
        name="goal"
        defaultValue={defaults.goal}
        label="Your goal"
        options={GOAL_OPTIONS.map((g) => ({ ...g, hint: g.adultOnly ? "18+" : undefined }))}
        placeholder="Choose"
        errors={err("goal")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="dietType"
        defaultValue={defaults.dietType} label="Diet (optional)" hint="For example vegetarian, vegan, eggetarian, halal, Jain" required={false} errors={err("dietType")} />
        <Field name="allergies"
        defaultValue={defaults.allergies} label="Allergies (optional)" hint="Separate with commas, for example peanuts, gluten" required={false} errors={err("allergies")} />
      </div>
      <input type="hidden" name="timezone" value={timezone} />
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        This app gives general guidance, not medical advice. If you are pregnant, have a medical condition or a history of
        eating disorders, please check with a doctor or dietitian before changing what you eat.
      </p>
      <SubmitButton>Calculate my targets</SubmitButton>
    </form>
  );
}
