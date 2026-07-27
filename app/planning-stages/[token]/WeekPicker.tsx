"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface WeekOption {
  code: string;
  label: string;
  enCours: boolean;
}

/**
 * Sélecteur de semaine (client). Navigue vers ?semaine=<code> en conservant le
 * jeton (déjà présent dans le chemin) et les autres paramètres.
 */
export default function WeekPicker({
  weeks,
  current,
}: {
  weeks: WeekOption[];
  /** Code sélectionné, ou "all". */
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(value: string) {
    const p = new URLSearchParams(params.toString());
    p.set("semaine", value);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="font-semibold text-gray-600">Semaine :</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-navy shadow-sm focus:border-navy focus:outline-none"
      >
        {weeks.map((w) => (
          <option key={w.code} value={w.code}>
            {w.label}
            {w.enCours ? "  — en cours" : ""}
          </option>
        ))}
        <option value="all">Toutes les semaines d&apos;août</option>
      </select>
    </label>
  );
}
