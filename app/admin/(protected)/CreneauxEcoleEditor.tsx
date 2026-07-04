"use client";

import { useEffect, useState } from "react";
import {
  CRENEAUX_ECOLE,
  categorieLabel,
  type CreneauCategorie,
} from "@/lib/data/creneaux-ecole";

/** Édition des disponibilités (créneaux) d'une inscription école, dans le
 *  panneau déplié de l'admin. Coche/décoche les créneaux → enregistre dans
 *  dispo_semaine (CSV de libellés). Les valeurs déjà stockées mais absentes
 *  de la liste centralisée sont préservées sous « Autres ». */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function parseStored(v: string | null | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

const CATS: CreneauCategorie[] = [
  "jeunes",
  "adultes_tennis",
  "padel",
  "pickleball",
];

export default function CreneauxEcoleEditor({
  row,
  patch,
  pending,
}: {
  row: { dispo_semaine?: string | null };
  patch: (p: object) => void;
  pending: boolean;
}) {
  const knownByNorm = new Map(
    CRENEAUX_ECOLE.map((c) => [norm(c.label), c.label] as const),
  );

  function buildSelected(): Set<string> {
    const set = new Set<string>();
    for (const piece of parseStored(row.dispo_semaine)) {
      set.add(knownByNorm.get(norm(piece)) ?? piece);
    }
    return set;
  }

  const [selected, setSelected] = useState<Set<string>>(buildSelected);

  useEffect(() => {
    setSelected(buildSelected());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.dispo_semaine]);

  // Pièces stockées non reconnues (à préserver)
  const unknown = parseStored(row.dispo_semaine).filter(
    (p) => !knownByNorm.has(norm(p)),
  );

  const originalNorm = new Set(parseStored(row.dispo_semaine).map(norm));
  const currentNorm = new Set(Array.from(selected).map(norm));
  const dirty =
    originalNorm.size !== currentNorm.size ||
    [...currentNorm].some((k) => !originalNorm.has(k));

  function toggle(label: string) {
    const next = new Set(selected);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setSelected(next);
  }
  function save() {
    patch({ dispo_semaine: Array.from(selected).join(", ") });
  }

  function Pill({ label, display }: { label: string; display?: string }) {
    const on = selected.has(label);
    return (
      <label
        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition ${
          on
            ? "border-navy bg-navy text-white"
            : "border-gray-300 bg-white hover:border-navy"
        }`}
      >
        <input
          type="checkbox"
          className="accent-navy"
          checked={on}
          disabled={pending}
          onChange={() => toggle(label)}
        />
        <span>{display ?? label}</span>
      </label>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-bold text-navy uppercase tracking-wide mb-2">
        Créneaux / disponibilités{" "}
        <span className="font-normal text-gray-400 normal-case">
          (modifiable)
        </span>
      </p>
      <div className="space-y-3">
        {CATS.map((cat) => {
          const items = CRENEAUX_ECOLE.filter((c) => c.categorie === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <p className="text-[11px] font-bold uppercase text-gray-500 tracking-wide mb-1.5">
                {categorieLabel(cat)}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((c) => (
                  <Pill key={c.label} label={c.label} />
                ))}
              </div>
            </div>
          );
        })}
        {unknown.length > 0 ? (
          <div>
            <p className="text-[11px] font-bold uppercase text-gray-500 tracking-wide mb-1.5">
              Autres (déjà enregistrés)
            </p>
            <div className="flex flex-wrap gap-2">
              {unknown.map((p) => (
                <Pill key={p} label={p} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">
          {selected.size} créneau{selected.size > 1 ? "x" : ""} sélectionné
          {selected.size > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="rounded bg-navy text-white px-3 py-1.5 text-xs font-bold hover:bg-navy-dark disabled:opacity-40"
        >
          {pending ? "…" : "Enregistrer les créneaux"}
        </button>
      </div>
    </div>
  );
}
