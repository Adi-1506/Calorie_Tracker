"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { giveAiConsent } from "@/app/app/ai/actions";
import { logPhotoMeal } from "@/app/app/actions";
import { AiConsentDialog } from "@/components/app/ai-consent";
import type { PhotoResult } from "@/lib/ai/meal-photo";
import { initialFormState } from "@/lib/validation/auth";

const MAX_SIDE = 1600;

/** Shrinks big phone photos before upload. Drawing to a canvas also drops EXIF and GPS. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

type Row = PhotoResult & { include: boolean; useMatch: boolean; grams: number };

const per100 = (r: Row) =>
  r.useMatch && r.match
    ? { calories: r.match.calories, protein: r.match.protein_g }
    : { calories: r.caloriesPer100g, protein: r.proteinPer100g };

export function MealPhoto({
  meal,
  date,
  consented,
  configured,
  hideNumbers,
}: {
  meal: string;
  date: string;
  consented: boolean;
  configured: boolean;
  hideNumbers: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [hasConsent, setHasConsent] = useState(consented);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [clientId, setClientId] = useState("");
  const [state, action, pending] = useActionState(logPhotoMeal, initialFormState);

  function start() {
    setError(null);
    if (!configured) {
      setError("AI features aren't set up on this site yet.");
      return;
    }
    if (hasConsent) input.current?.click();
    else setAsking(true);
  }

  function yes() {
    setAsking(false);
    // Open the picker while the tap still counts as a user gesture; save the consent alongside.
    input.current?.click();
    setHasConsent(true);
    void giveAiConsent().then((r) => {
      if (!r.ok) setError("We couldn't save your choice. Please try again.");
    });
  }

  function no() {
    setAsking(false);
    router.push("/app");
  }

  async function analyse(file: File) {
    setBusy(true);
    setError(null);
    setRows(null);
    try {
      const body = new FormData();
      body.set("photo", await shrink(file), "meal.jpg");
      const res = await fetch("/app/log/photo", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { items?: PhotoResult[]; error?: string };
      if (!res.ok || !data.items) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (data.items.length === 0) {
        setError("We couldn't spot any food in that photo. Try a clearer, closer shot.");
        return;
      }
      setRows(data.items.map((i) => ({ ...i, include: true, useMatch: Boolean(i.match), grams: i.grams })));
      setClientId(crypto.randomUUID());
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const update = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev?.map((r, i) => (i === index ? { ...r, ...patch } : r)) ?? null);

  const chosen = (rows ?? []).filter((r) => r.include && r.grams > 0);
  const total = chosen.reduce((sum, r) => sum + (per100(r).calories * r.grams) / 100, 0);
  const payload = JSON.stringify(
    chosen.map((r) =>
      r.useMatch && r.match
        ? { kind: "food", foodId: r.match.id, grams: r.grams }
        : {
            kind: "estimate",
            name: r.name,
            grams: r.grams,
            caloriesPer100g: r.caloriesPer100g,
            proteinPer100g: r.proteinPer100g,
            carbsPer100g: r.carbsPer100g,
            fatPer100g: r.fatPer100g,
          },
    ),
  );
  const formError = state.status === "error" ? state.message : null;

  return (
    <section aria-labelledby="photo-heading" className="card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="photo-heading" className="font-display text-lg font-bold">
            Snap your meal
          </h2>
          <p className="text-sm text-muted">AI suggests the foods and portions. You check them before anything is logged.</p>
        </div>
        <button type="button" onClick={start} disabled={busy} className="btn btn-ink shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {busy ? "Looking at your meal…" : rows ? "Try another photo" : "Take a photo"}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void analyse(file);
          }}
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {busy ? "Looking at your meal" : rows ? `Found ${rows.length} foods` : ""}
      </p>

      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}

      {rows && (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="meal" value={meal} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="items" value={payload} />
          <ul className="rows">
            {rows.map((r, i) => {
              const p = per100(r);
              const kcal = Math.round((p.calories * r.grams) / 100);
              const id = `photo-item-${i}`;
              return (
                <li key={id} className="flex flex-col gap-2 py-3">
                  <div className="flex items-start gap-3">
                    <input
                      id={`${id}-include`}
                      type="checkbox"
                      checked={r.include}
                      onChange={(e) => update(i, { include: e.target.checked })}
                      className="mt-1 size-5 shrink-0 accent-[var(--ink)]"
                    />
                    <label htmlFor={`${id}-include`} className="min-w-0 flex-1">
                      <span className="font-semibold">{r.name}</span>
                      {r.confidence === "low" && <span className="badge ml-2 align-middle">Rough guess</span>}
                    </label>
                    {!hideNumbers && (
                      <span className="shrink-0 font-mono text-sm tabular-nums">
                        {kcal} kcal
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-8">
                    <label htmlFor={`${id}-grams`} className="sr-only">
                      Grams of {r.name}
                    </label>
                    <input
                      id={`${id}-grams`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={2000}
                      value={r.grams || ""}
                      onChange={(e) => update(i, { grams: Math.min(2000, Math.max(0, Math.round(Number(e.target.value) || 0))) })}
                      disabled={!r.include}
                      className="input w-24 text-sm"
                    />
                    <span className="text-sm text-muted">g</span>
                    {r.match && (
                      <>
                        <label htmlFor={`${id}-source`} className="sr-only">
                          Nutrition source for {r.name}
                        </label>
                        <select
                          id={`${id}-source`}
                          value={r.useMatch ? "match" : "estimate"}
                          onChange={(e) => update(i, { useMatch: e.target.value === "match" })}
                          disabled={!r.include}
                          className="input min-w-0 flex-1 text-sm"
                        >
                          <option value="match">
                            {r.match.name}
                            {r.match.brand ? ` (${r.match.brand})` : ""} from our foods
                          </option>
                          <option value="estimate">AI estimate</option>
                        </select>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted">AI guesses can be off, especially for portions. Adjust the grams before logging.</p>
          {formError && (
            <p role="alert" className="notice notice-error">
              {formError}
            </p>
          )}
          <button disabled={pending || chosen.length === 0} className="btn btn-primary self-start">
            {pending
              ? "Logging…"
              : `Log ${chosen.length} ${chosen.length === 1 ? "food" : "foods"}${hideNumbers ? "" : ` · ${Math.round(total)} kcal`}`}
          </button>
        </form>
      )}

      <AiConsentDialog open={asking} onYes={yes} onNo={no} />
    </section>
  );
}
