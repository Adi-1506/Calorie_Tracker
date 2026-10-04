"use client";

import { useActionState } from "react";
import { createCustomFood } from "@/app/app/actions";
import { errorsFor, Field, FormMessage, SubmitButton, useClientValidation } from "@/components/auth/form-parts";
import { initialFormState } from "@/lib/validation/auth";
import { customFoodSchema } from "@/lib/validation/food";

export function CustomFoodForm({ meal, date, name, barcode }: { meal?: string; date?: string; name?: string; barcode?: string }) {
  const [state, action] = useActionState(createCustomFood, initialFormState);
  const { clientErrors, onSubmit } = useClientValidation(customFoodSchema);
  const err = (field: string) => errorsFor(field, state, clientErrors);
  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormMessage state={state} />
      {meal && <input type="hidden" name="meal" value={meal} />}
      {date && <input type="hidden" name="date" value={date} />}
      {barcode && <input type="hidden" name="barcode" value={barcode} />}
      <Field name="name" label="Name" defaultValue={name} errors={err("name")} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="nameLocal" label="Name in your language (optional)" required={false} errors={err("nameLocal")} />
        <Field name="brand" label="Brand or restaurant (optional)" required={false} errors={err("brand")} />
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Nutrition per 100 g</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Field name="calories" label="Calories" type="number" inputMode="decimal" min={0} max={900} errors={err("calories")} />
          <Field name="proteinG" label="Protein (g)" type="number" inputMode="decimal" min={0} errors={err("proteinG")} />
          <Field name="carbsG" label="Carbs (g)" type="number" inputMode="decimal" min={0} errors={err("carbsG")} />
          <Field name="fatG" label="Fat (g)" type="number" inputMode="decimal" min={0} errors={err("fatG")} />
          <Field name="fiberG" label="Fibre (g)" type="number" inputMode="decimal" min={0} required={false} errors={err("fiberG")} />
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          Check the label on the pack. If it only gives values per serving, divide by the serving weight and multiply by 100.
        </p>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="servingLabel" label="Usual portion (optional)" hint="For example 1 bowl, 1 piece, 1 cup" required={false} errors={err("servingLabel")} />
        <Field name="servingGrams" label="Portion weight (g)" type="number" inputMode="decimal" min={0} required={false} errors={err("servingGrams")} />
      </div>
      <SubmitButton>Save food</SubmitButton>
    </form>
  );
}
