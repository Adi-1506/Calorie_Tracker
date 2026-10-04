"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { logWeight, saveMeasurements } from "@/app/app/progress/actions";
import {
  errorsFor,
  Field,
  FormMessage,
  SubmitButton,
  useClientValidation,
} from "@/components/auth/form-parts";
import { initialFormState } from "@/lib/validation/auth";
import {
  MEASUREMENTS,
  measurementsSchema,
  weightSchema,
} from "@/lib/validation/progress";

export function WeightForm({
  today,
  last,
}: {
  today: string;
  last: number | null;
}) {
  const [state, action] = useActionState(logWeight, initialFormState);
  const { clientErrors, onSubmit } = useClientValidation(weightSchema);
  const err = (name: string) => errorsFor(name, state, clientErrors);
  return (
    <form
      action={action}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      <FormMessage state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field
          name="weightKg"
          label="Weight (kg)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={20}
          max={400}
          defaultValue={last ?? undefined}
          errors={err("weightKg")}
        />
        <Field
          name="date"
          label="Date"
          type="date"
          max={today}
          defaultValue={today}
          errors={err("date")}
        />
      </div>
      <SubmitButton>Save weight</SubmitButton>
    </form>
  );
}

export function MeasurementsForm({
  today,
  startCollapsed,
}: {
  today: string;
  startCollapsed: boolean;
}) {
  const [state, action] = useActionState(saveMeasurements, initialFormState);
  // Local state, so saving (which refreshes the page) doesn't snap it shut.
  const [open, setOpen] = useState(!startCollapsed);
  const { clientErrors, onSubmit } = useClientValidation(measurementsSchema);
  const err = (name: string) => errorsFor(name, state, clientErrors);
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-semibold">
        Add new measurements
      </summary>
      <form
        action={action}
        onSubmit={onSubmit}
        noValidate
        className="mt-4 flex flex-col gap-4"
      >
        <FormMessage state={state} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MEASUREMENTS.map((m) => (
            <Field
              key={m.key}
              name={m.key}
              label={`${m.label} (cm)`}
              type="number"
              inputMode="decimal"
              step="0.1"
              min={10}
              max={300}
              required={false}
              errors={err(m.key)}
            />
          ))}
        </div>
        <Field
          name="date"
          label="Date"
          type="date"
          max={today}
          defaultValue={today}
          errors={err("date")}
        />
        <SubmitButton>Save measurements</SubmitButton>
      </form>
    </details>
  );
}

const MAX_BYTES = 5 * 1024 * 1024;

export function PhotoUpload({ today }: { today: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{
    kind: "idle" | "busy" | "error" | "ok";
    message?: string;
  }>({ kind: "idle" });

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      setStatus({ kind: "error", message: "Photos can be up to 5 MB." });
      return;
    }
    setStatus({ kind: "busy" });
    const body = new FormData();
    body.set("photo", file);
    body.set("date", today);
    try {
      const res = await fetch("/app/progress/photos", { method: "POST", body });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus({
          kind: "error",
          message: data.error ?? "Upload failed. Please try again.",
        });
        return;
      }
      setStatus({ kind: "ok", message: "Photo added. Only you can see it." });
      router.refresh();
    } catch {
      setStatus({
        kind: "error",
        message: "Upload failed. Check your connection and try again.",
      });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="btn btn-primary cursor-pointer self-start has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-turmeric">
        {status.kind === "busy" ? "Uploading…" : "Add a progress photo"}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={status.kind === "busy"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      <p className="text-xs text-muted">
        JPEG, PNG or WebP up to 5 MB. Location and camera details are removed
        before saving.
      </p>
      {status.kind === "error" && (
        <p role="alert" className="notice notice-error">
          {status.message}
        </p>
      )}
      {status.kind === "ok" && (
        <p role="status" className="notice notice-ok">
          {status.message}
        </p>
      )}
    </div>
  );
}
