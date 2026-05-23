import * as React from "react";

type FieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
};

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-navy"
      >
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-gray-500">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-cyan-club focus:ring-2 focus:ring-cyan-club/30 disabled:bg-gray-100";
