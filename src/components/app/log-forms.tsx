"use client";

import { useActionState, useState } from "react";
import { logExternalFood, logFood, quickAdd, toggleFavorite } from "@/app/app/actions";
import { errorsFor, Field, FormMessage, SubmitButton, useClientValidation } from "@/components/auth/form-parts";
import { initialFormState, type FormState } from "@/lib/validation/auth";
import { quickAddSchema } from "@/lib/validation/food";

const inputClass =
  "input w-20 shrink-0 text-sm";

/** Idempotency key so a double-tap or a retried request logs the food once. */
function useClientId() {
  const [id] = useState(() => crypto.randomUUID());
  return id;
}

function InlineError({ state }: { state: FormState }) {
  if (state.status !== "error") return null;
  const message = state.message ?? Object.values(state.fieldErrors ?? {})[0]?.[0];
  return message ? (
    <p role="alert" className="w-full text-sm text-danger">
      {message}
    </p>
  ) : null;
}

function AddButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="btn btn-primary"
    >
      Add<span className="sr-only"> {label}</span>
    </button>
  );
}

type Serving = { id: string; label: string; grams: number };

function FavoriteButton({ foodId, name, favorite }: { foodId: string; name: string; favorite: boolean }) {
  return (
    <form action={toggleFavorite}>
      <input type="hidden" name="foodId" value={foodId} />
      <input type="hidden" name="favorite" value={favorite ? "0" : "1"} />
      <button
        aria-label={favorite ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
        aria-pressed={favorite}
        className="flex size-10 items-center justify-center rounded-lg text-lg hover:bg-well"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill={favorite ? "var(--turmeric)" : "none"} stroke={favorite ? "var(--ink)" : "currentColor"} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z" />
        </svg>
      </button>
    </form>
  );
}

export function AddFoodRow({
  food,
  meal,
  date,
  favorite = false,
}: {
  food: { id: string; name: string; brand: string | null; name_local: string | null; calories: number; servings: Serving[] };
  meal: string;
  date: string;
  favorite?: boolean;
}) {
  const [state, action] = useActionState(logFood, initialFormState);
  const clientId = useClientId();
  const [servingId, setServingId] = useState(food.servings[0]?.id ?? "");
  const serving = food.servings.find((s) => s.id === servingId);
  const qtyId = `qty-${food.id}`;

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-1">
        <FavoriteButton foodId={food.id} name={food.name} favorite={favorite} />
        <div className="min-w-0">
        <p className="font-semibold">
          {food.name}
          {food.name_local && <span className="ml-1 text-muted">· {food.name_local}</span>}
        </p>
        <p className="text-xs text-muted">
          {food.brand ? `${food.brand} · ` : ""}
          {Math.round(food.calories)} kcal per 100 g
          {serving ? ` · ${Math.round((food.calories * serving.grams) / 100)} kcal per ${serving.label}` : ""}
        </p>
        </div>
      </div>
      <form action={action} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
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
          className={`${inputClass} w-auto min-w-0 max-w-48 flex-1 sm:flex-none`}
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
        <p className="font-semibold">{food.name}</p>
        <p className="text-xs text-muted">
          {food.brand ? `${food.brand} · ` : ""}
          {Math.round(food.calories)} kcal / 100 g · <span className="badge">{food.source === "usda" ? "USDA" : "Open Food Facts"}</span>
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
