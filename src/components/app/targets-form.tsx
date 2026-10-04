"use client";

import { useActionState } from "react";
import { saveTargets } from "@/app/app/actions";
import { errorsFor, Field, FormMessage, SubmitButton } from "@/components/auth/form-parts";
import { initialFormState } from "@/lib/validation/auth";

type Values = { calories: number; proteinG: number; carbsG: number; fatG: number; waterMl: number };

export function TargetsForm({ current, floor }: { current: Values; floor: number }) {
  const [state, action] = useActionState(saveTargets, initialFormState);
  const err = (name: string) => errorsFor(name, state, {});
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      <Field
        name="calories"
        label="Calories (kcal per day)"
        type="number"
        inputMode="numeric"
        min={floor}
        max={6000}
        defaultValue={current.calories}
        hint={`Minimum ${floor} kcal for safety.`}
        errors={err("calories")}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field name="proteinG" label="Protein (g)" type="number" inputMode="numeric" min={0} defaultValue={current.proteinG} errors={err("proteinG")} />
        <Field name="carbsG" label="Carbs (g)" type="number" inputMode="numeric" min={0} defaultValue={current.carbsG} errors={err("carbsG")} />
        <Field name="fatG" label="Fat (g)" type="number" inputMode="numeric" min={0} defaultValue={current.fatG} errors={err("fatG")} />
      </div>
      <Field name="waterMl" label="Water (ml per day)" type="number" inputMode="numeric" min={0} step="50" defaultValue={current.waterMl} errors={err("waterMl")} />
      <SubmitButton>Save targets</SubmitButton>
    </form>
  );
}
