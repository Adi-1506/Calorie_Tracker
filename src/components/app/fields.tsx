"use client";

type Option = { value: string; label: string; hint?: string; disabled?: boolean };

export function Select({
  name,
  label,
  options,
  defaultValue,
  errors,
  placeholder,
}: {
  name: string;
  label: string;
  options: readonly Option[];
  defaultValue?: string;
  errors?: string[];
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required
        defaultValue={defaultValue ?? ""}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${name}-error` : undefined}
        className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 aria-[invalid=true]:border-red-600 dark:border-neutral-700 dark:bg-neutral-950"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
            {o.hint ? ` (${o.hint})` : ""}
          </option>
        ))}
      </select>
      {errors?.length ? (
        <p id={`${name}-error`} role="alert" className="text-sm text-red-700 dark:text-red-400">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
