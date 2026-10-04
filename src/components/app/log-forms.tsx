"use client";

import { useActionState, useState } from "react";
import { logExternalFood, logFood, quickAdd } from "@/app/app/actions";
import { errorsFor, Field, FormMessage, SubmitButton, useClientValidation } from "@/components/auth/form-parts";
import { initialFormState, type FormState } from "@/lib/validation/auth";
import { quickAddSchema } from "@/lib/validation/food";

const inputClass =
  "w-24 rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-neutral-700 dark:bg-neutral-950";

/** Idempotency key so a double-tap or a retried request logs the food once. */
function useClientId() {
  const [id] = useState(() => crypto.randomUUID());
  return id;
}

function InlineError({ state }: { state: FormState }) {
  if (state.status !== "error") return null;
  const message = state.message ?? Object.values(state.fieldErrors ?? {})[0]?.[0];
  return message ? (
    <p role="alert" className="w-full text-sm text-red-700 dark:text-red-400">
      {message}
    </p>
  ) : null;
}

function AddButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
    >
      Add<span className="sr-only"> {label}</span>
    </button>
  );
}

type Serving = { id: string; label: string; grams: number };

export function AddFoodRow({
  food,
  meal,
  date,
}: {
  food: { id: string; name: string; brand: string | null; name_local: string | null; calories: number; servings: Serving[] };
  meal: string;
  date: string;
}) {
  const [state, action] = useActionState(logFood, initialFormState);
  const clientId = useClientId();
  const [servingId, setServingId] = useState(food.servings[0]?.id ?? "");
  const serving = food.servings.find((s) => s.id === servingId);
  const qtyId = `qty-${food.id}`;

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">
          {food.name}
          {food.name_local && <span className="ml-1 text-neutral-600 dark:text-neutral-400">· {food.name_local}</span>}
        </p>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {food.brand ? `${food.brand} · ` : ""}
          {Math.round(food.calories)} kcal per 100 g
          {serving ? ` · ${Math.round((food.calories * serving.grams) / 100)} kcal per ${serving.label}` : ""}
        </p>
      </div>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="foodId" value={food.id} />
        <input type="hidden" name="meal" value={meal} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="clientId" value={clientId} />
        <label htmlFor={qtyId} className="sr-only">
          Amount of {food.name}
        </label>
        <input
          id={qtyId}
          name="quantity"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          required
          key={servingId}
          defaultValue={servingId ? 1 : 100}
          className={inputClass}
        />
        <label className="sr-only" htmlFor={`unit-${food.id}`}>
          Unit
        </label>
        <select
          id={`unit-${food.id}`}
          name="servingId"
          value={servingId}
          onChange={(e) => setServingId(e.target.value)}
          className={`${inputClass} w-auto max-w-48`}
        >
          {food.servings.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} ({Number(s.grams)} g)
            </option>
          ))}
          <option value="">grams</option>
        </select>
        <AddButton label={food.name} />
        <InlineError state={state} />
      </form>
    </li>
  );
}

export function AddExternalRow({
  food,
  meal,
  date,
}: {
  food: { source: string; externalId: string; name: string; brand: string | null; calories: number; serving: { label: string; grams: number } | null };
  meal: string;
  date: string;
}) {
  const [state, action] = useActionState(logExternalFood, initialFormState);
  const clientId = useClientId();
  const qtyId = `ext-${food.source}-${food.externalId}`;
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{food.name}</p>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {food.brand ? `${food.brand} · ` : ""}
          {Math.round(food.calories)} kcal per 100 g · {food.source === "usda" ? "USDA" : "Open Food Facts"}
          {food.serving ? ` · serving ${food.serving.label}` : ""}
        </p>
      </div>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="source" value={food.source} />
        <input type="hidden" name="externalId" value={food.externalId} />
        <input type="hidden" name="meal" value={meal} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="clientId" value={clientId} />
        <label htmlFor={qtyId} className="sr-only">
          Grams of {food.name}
        </label>
        <input
          id={qtyId}
          name="grams"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          required
          defaultValue={food.serving?.grams ?? 100}
          className={inputClass}
        />
        <span className="text-sm">g</span>
        <AddButton label={food.name} />
        <InlineError state={state} />
      </form>
    </li>
  );
}

export function QuickAddForm({ meal, date }: { meal: string; date: string }) {
  const [state, action] = useActionState(quickAdd, initialFormState);
  const { clientErrors, onSubmit } = useClientValidation(quickAddSchema);
  const clientId = useClientId();
  const err = (name: string) => errorsFor(name, state, clientErrors);
  return (
    <form action={action} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="clientId" value={clientId} />
      <Field name="label" label="What did you eat? (optional)" required={false} errors={err("label")} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field name="calories" label="Calories" type="number" inputMode="decimal" min={0} errors={err("calories")} />
        <Field name="proteinG" label="Protein (g)" type="number" inputMode="decimal" min={0} required={false} errors={err("proteinG")} />
        <Field name="carbsG" label="Carbs (g)" type="number" inputMode="decimal" min={0} required={false} errors={err("carbsG")} />
        <Field name="fatG" label="Fat (g)" type="number" inputMode="decimal" min={0} required={false} errors={err("fatG")} />
      </div>
      <SubmitButton>Quick add</SubmitButton>
    </form>
  );
}
