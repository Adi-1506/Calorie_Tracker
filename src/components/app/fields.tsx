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
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required
        defaultValue={defaultValue ?? ""}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${name}-error` : undefined}
        className="input"
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
        <p id={`${name}-error`} role="alert" className="text-sm font-medium text-danger">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
