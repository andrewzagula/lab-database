"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

type SelectOption = string | { value: string; label: string };

type FieldProps = {
  label: string;
  name: string;
  value: string;
  error?: string;
  helper?: string;
};

const inputClassName =
  "min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";

const textareaClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";

function normalizedOptions(options: readonly SelectOption[], value: string) {
  const mapped = options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );

  if (value && !mapped.some((option) => option.value === value)) {
    return [{ value, label: `${value} (current)` }, ...mapped];
  }

  return mapped;
}

export function FormErrorSummary({ errors }: { errors: Record<string, string> }) {
  const messages = Object.entries(errors);
  if (!messages.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      <p className="font-semibold">Fix the highlighted fields.</p>
      {errors._form ? <p className="mt-1">{errors._form}</p> : null}
    </div>
  );
}

export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}

export function FormActions({
  cancelHref,
  submitLabel,
}: {
  cancelHref: string;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
      <Link
        href={cancelHref}
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
      >
        Cancel
      </Link>
      <SubmitButton label={submitLabel} />
    </div>
  );
}

export function TextField({
  label,
  name,
  value,
  error,
  helper,
  type = "text",
  placeholder,
  mono = false,
}: FieldProps & {
  type?: "text" | "date";
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-slate-950">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={mono ? `${inputClassName} mt-2 font-mono` : `${inputClassName} mt-2`}
      />
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  value,
  error,
  helper,
  rows = 5,
  placeholder,
  mono = false,
}: FieldProps & {
  rows?: number;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-slate-950">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={mono ? `${textareaClassName} mt-2 font-mono` : `${textareaClassName} mt-2`}
      />
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  name,
  value,
  error,
  helper,
  options,
  blankLabel = "None",
}: FieldProps & {
  options: readonly SelectOption[];
  blankLabel?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-slate-950">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={value}
        aria-invalid={Boolean(error)}
        className={`${inputClassName} mt-2`}
      >
        <option value="">{blankLabel}</option>
        {normalizedOptions(options, value).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
