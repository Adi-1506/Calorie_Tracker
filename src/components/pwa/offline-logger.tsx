"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useOnline } from "@/lib/offline/online";
import { enqueue, listQueued, QUEUE_EVENT, type QueuedItem } from "@/lib/offline/queue";
import { offlineItemSchema } from "@/lib/offline/schema";
import { MEALS } from "@/lib/validation/food";

const localToday = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in the device's time zone
const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? 0 : Number(v));

function defaultMeal() {
  const h = new Date().getHours();
  return h < 11 ? "breakfast" : h < 16 ? "lunch" : h < 21 ? "dinner" : "snack";
}

export function OfflineLogger() {
  const [queued, setQueued] = useState<QueuedItem[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const online = useOnline();
  const [meal, setMeal] = useState("snack");

  useEffect(() => {
    const load = async () => setQueued(await listQueued().catch(() => []));
    void load();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the meal default depends on the device clock
    setMeal(defaultMeal());
    window.addEventListener(QUEUE_EVENT, load);
    return () => {
      window.removeEventListener(QUEUE_EVENT, load);
    };
  }, []);

  async function addFood(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const item = {
      kind: "food" as const,
      clientId: crypto.randomUUID(),
      date: localToday(),
      meal: String(f.get("meal")),
      label: String(f.get("label") ?? ""),
      calories: num(f.get("calories")),
      proteinG: num(f.get("proteinG")),
      carbsG: num(f.get("carbsG")),
      fatG: num(f.get("fatG")),
    };
    const parsed = offlineItemSchema.safeParse(item);
    if (!parsed.success) {
      setError("Enter calories between 1 and 10,000, and macros between 0 and 1,000 g.");
      return;
    }
    await enqueue(parsed.data);
    setError("");
    setSaved(`Saved ${item.label || "quick add"} on this device.`);
    form.reset();
  }

  async function addWater(ml: number) {
    await enqueue({ kind: "water", clientId: crypto.randomUUID(), date: localToday(), ml });
    setSaved(`Saved ${ml} ml of water on this device.`);
  }

  return (
    <div className="flex flex-col gap-6">
      {online && (
        <p role="status" className="notice notice-ok">
          You&apos;re back online.{" "}
          <a href="/app" className="link">
            Open Kalo
          </a>{" "}
          to sync these entries.
        </p>
      )}
      {saved && (
        <p role="status" className="notice notice-ok">
          {saved}
        </p>
      )}

      <form onSubmit={addFood} noValidate className="card flex flex-col gap-4 p-5 sm:p-6" aria-labelledby="offline-food">
        <h2 id="offline-food" className="font-display text-xl font-bold">
          Quick-add food
        </h2>
        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="meal" className="text-sm font-semibold">
            Meal
          </label>
          <select id="meal" name="meal" className="input" value={meal} onChange={(e) => setMeal(e.target.value)}>
            {MEALS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="label" className="text-sm font-semibold">
            What did you eat? <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="label" name="label" className="input" maxLength={200} placeholder="e.g. 2 chapati and dal" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { name: "calories", label: "Calories", required: true },
            { name: "proteinG", label: "Protein (g)" },
            { name: "carbsG", label: "Carbs (g)" },
            { name: "fatG", label: "Fat (g)" },
          ].map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label htmlFor={f.name} className="text-sm font-semibold">
                {f.label}
              </label>
              <input id={f.name} name={f.name} className="input" type="number" inputMode="decimal" min="0" step="any" required={f.required} />
            </div>
          ))}
        </div>
        <button className="btn btn-primary self-start">Save on this device</button>
      </form>

      <section aria-labelledby="offline-water" className="card flex flex-col gap-3 p-5 sm:p-6">
        <h2 id="offline-water" className="font-display text-xl font-bold">
          Water
        </h2>
        <div className="flex flex-wrap gap-2">
          {[250, 500, 750].map((ml) => (
            <button key={ml} type="button" className="btn btn-sm" onClick={() => addWater(ml)}>
              + {ml} ml
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="offline-queue" className="flex flex-col gap-3">
        <h2 id="offline-queue" className="font-display text-xl font-bold">
          Waiting to sync ({queued.length})
        </h2>
        {queued.length ? (
          <ul className="rows card-flat">
            {queued.map((q) => (
              <li key={q.clientId} className="flex justify-between gap-3 px-4 py-3 text-sm">
                <span>{q.kind === "food" ? `${q.label || "Quick add"} · ${MEALS.find((m) => m.value === q.meal)?.label}` : "Water"}</span>
                <span className="font-mono tabular-nums">{q.kind === "food" ? `${q.calories} kcal` : `${q.ml} ml`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nothing yet. Entries you save here are added to your log the next time you open Kalo online.</p>
        )}
      </section>
    </div>
  );
}
