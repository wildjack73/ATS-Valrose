import * as React from "react";

export function Section({
  title,
  description,
  children,
  step,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  step?: number;
}) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 sm:p-8">
      <header className="mb-5 flex items-start gap-3">
        {typeof step === "number" ? (
          <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-navy text-white text-sm font-bold">
            {step}
          </span>
        ) : null}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-navy">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
