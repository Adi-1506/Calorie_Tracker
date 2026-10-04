"use client";

import { useActionState, useState } from "react";
import { addIngredient, createRecipe, importRecipe, logRecipe } from "@/app/app/actions";
import { errorsFor, Field, FormMessage, SubmitButton, useClientValidation } from "@/components/auth/form-parts";
import { initialFormState, type FormState } from "@/lib/validation/auth";
import { MEALS, recipeSchema } from "@/lib/validation/food";

const small =
  "input text-sm";
const primary =
  "btn btn-primary";

function InlineError({ state }: { state: FormState }) {
  if (state.status !== "error") return null;
  const message = state.message ?? Object.values(state.fieldErrors ?? {})[0]?.[0];
  return message ? (
    <p role="alert" className="w-full text-sm text-danger">
      {message}
    </p>
  ) : null;
}

export function NewRecipeForm() {
  const [state, action] = useActionState(createRecipe, initialFormState);
  const { clientErrors, onSubmit } = useClientValidation(recipeSchema);
  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field name="name" label="Recipe name" errors={errorsFor("name", state, clientErrors)} />
      <Field
        name="servings"
        label="How many servings does it make?"
        type="number"
        inputMode="decimal"
        step="0.5"
        min={0.5}
        defaultValue={2}
        errors={errorsFor("servings", state, clientErrors)}
      />
      <SubmitButton>Create recipe</SubmitButton>
    </form>
  );
}

export function AddIngredientRow({
  recipeId,
  food,
}: {
  recipeId: string;
  food: { id: string; name: string; brand: string | null; calories: number; servings: { id: string; label: string; grams: number }[] };
}) {
  const [state, action] = useActionState(addIngredient, initialFormState);
  const [grams, setGrams] = useState(String(food.servings[0]?.grams ?? 100));
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{food.name}</p>
        <p className="text-xs text-muted">
          {food.brand ? `${food.brand} · ` : ""}
          {Math.round(food.calories)} kcal per 100 g
        </p>
      </div>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="recipeId" value={recipeId} />
        <input type="hidden" name="foodId" value={food.id} />
        <label htmlFor={`g-${food.id}`} className="sr-only">
          Grams of {food.name}
        </label>
        <input
          id={`g-${food.id}`}
          name="grams"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          className={`${small} w-24`}
        />
        <span className="text-sm">g</span>
        {food.servings.slice(0, 2).map((s) => (
          <button key={s.id} type="button" onClick={() => setGrams(String(s.grams))} className={`${small} text-xs`}>
            {s.label}
          </button>
        ))}
        <button className={primary}>
          Add<span className="sr-only"> {food.name}</span>
        </button>
        <InlineError state={state} />
      </form>
    </li>
  );
}

export function LogRecipeForm({ recipeId, date, defaultMeal }: { recipeId: string; date: string; defaultMeal: string }) {
  const [state, action] = useActionState(logRecipe, initialFormState);
  const [clientId] = useState(() => crypto.randomUUID());
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="recipeId" value={recipeId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="clientId" value={clientId} />
      <label className="flex flex-col gap-1 text-sm">
        Servings
        <input name="servings" type="number" inputMode="decimal" min="0" step="0.5" defaultValue={1} className={`${small} w-24`} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Meal
        <select name="meal" defaultValue={defaultMeal} className={small}>
          {MEALS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <button className="btn btn-primary">Log it</button>
      <InlineError state={state} />
    </form>
  );
}

export function ImportRecipeForm() {
  const [state, action] = useActionState(importRecipe, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage state={state} />
      <Field
        name="url"
        label="Import from a recipe website"
        type="url"
        hint="Paste a link. We read the recipe's name, servings and ingredient list; you then match each ingredient to a food."
        errors={errorsFor("url", state, {})}
      />
      <SubmitButton>Import recipe</SubmitButton>
    </form>
  );
}
