"use client";

import { useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import type { z } from "zod";
import type { FieldErrors, FormState } from "@/lib/validation/auth";

/** Runs the same Zod schema as the server before submitting (security item 14). */
export function useClientValidation(schema: z.ZodType) {
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const result = schema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (result.success) {
      setClientErrors({});
      return;
    }
    event.preventDefault();
    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (errors[key] ??= []).push(issue.message);
    }
    setClientErrors(errors);
  }

  return { clientErrors, onSubmit };
}

export function errorsFor(name: string, state: FormState, clientErrors: FieldErrors) {
  return clientErrors[name] ?? (state.status === "error" ? state.fieldErrors?.[name] : undefined);
}

type FieldProps = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  errors?: string[];
  hint?: string;
  required?: boolean;
  defaultValue?: string | number;
  inputMode?: "numeric" | "decimal" | "text";
  step?: string;
  min?: string | number;
  max?: string | number;
};

export function Field({
  name,
  label,
  type = "text",
  autoComplete,
  errors,
  hint,
  required = true,
  defaultValue,
  inputMode,
  step,
  min,
  max,
}: FieldProps) {
  const describedBy = [hint ? `${name}-hint` : null, errors?.length ? `${name}-error` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        inputMode={inputMode}
        step={step}
        min={min}
        max={max}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="input"
      />
      {hint && (
        <p id={`${name}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${name}-error`} role="alert" className="text-sm font-medium text-danger">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({ name, children, errors }: { name: string; children: React.ReactNode; errors?: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name={name}
          required
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={errors?.length ? `${name}-error` : undefined}
          className="mt-0.5 size-4 accent-turmeric"
        />
        <span>{children}</span>
      </label>
      {errors?.length ? (
        <p id={`${name}-error`} role="alert" className="text-sm font-medium text-danger">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

/** Hidden from people and assistive tech; bots tend to fill it in (security item 12). */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "error" && state.message) {
    return (
      <p role="alert" className="notice notice-error">
        {state.message}
      </p>
    );
  }
  if (state.status === "success") {
    return (
      <p role="status" className="notice notice-ok">
        {state.message}
      </p>
    );
  }
  return null;
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="btn btn-primary min-h-12 text-base"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
