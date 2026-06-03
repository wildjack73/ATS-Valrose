"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  NIVEAUX_TENNIS,
  parseNiveau,
  estAdulte,
  type Niveau,
} from "@/lib/data/niveaux";

/** Badge coloré affiché en lecture seule (tables, listes, annuaire). */
export function NiveauBadge({ value }: { value: string | null | undefined }) {
  const n = parseNiveau(value);
  if (!n) {
    // Niveau libre / legacy non reconnu : on l'affiche en gris
    if (value && value.trim()) {
      return (
        <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-gray-100 text-gray-600 border-gray-300 whitespace-nowrap">
          {value}
        </span>
      );
    }
    return <span className="text-gray-400 text-xs">—</span>;
  }
  return <NiveauPill niveau={n} />;
}

function NiveauPill({ niveau }: { niveau: Niveau }) {
  return (
    <span
      className="inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border whitespace-nowrap"
      style={{
        backgroundColor: niveau.bg,
        color: niveau.text,
        borderColor: niveau.border,
      }}
    >
      {niveau.label}
    </span>
  );
}

/** Select inline éditable. Sauvegarde au changement via onSave.
 *  Conserve un legacy non-reconnu si présent (option « (legacy) »). */
export function NiveauSelect({
  value,
  disabled,
  onSave,
  size = "sm",
}: {
  value: string | null | undefined;
  disabled?: boolean;
  onSave: (newCode: string | null) => void | Promise<void>;
  size?: "sm" | "md";
}) {
  const current = parseNiveau(value);
  const isLegacy = !!value && !current;
  const [pending, setPending] = useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setPending(true);
    try {
      await onSave(v === "" ? null : v);
    } finally {
      setPending(false);
    }
  };

  const cls =
    size === "sm"
      ? "text-xs px-1.5 py-1 rounded border bg-white"
      : "text-sm px-2 py-1.5 rounded border bg-white";

  return (
    <select
      value={current?.code ?? (isLegacy ? "__legacy__" : "")}
      disabled={disabled || pending}
      onChange={onChange}
      className={`${cls} border-gray-300`}
      style={
        current
          ? {
              backgroundColor: current.bg,
              color: current.text,
              borderColor: current.border,
              fontWeight: 600,
            }
          : undefined
      }
    >
      <option value="">— Niveau —</option>
      {isLegacy ? (
        <option value="__legacy__" disabled>
          (legacy : {value})
        </option>
      ) : null}
      {NIVEAUX_TENNIS.map((n) => (
        <option key={n.code} value={n.code}>
          {n.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Sélecteur de niveau attribué PAR ÉLÈVE. Source de vérité = table
 * niveaux_eleves. Autonome : enregistre via l'API et rafraîchit la page
 * (toutes les vues du même élève se synchronisent au refresh).
 *
 * - Pour les adultes (≥ 18 ans), aucun sélecteur (le niveau Galaxie ne les
 *   concerne pas) → on affiche un discret « — ».
 * - Le niveau déclaré par la famille s'affiche en hint si fourni et que le
 *   prof n'a pas encore attribué de niveau.
 */
export function NiveauEleveSelect({
  eleveKey,
  nom,
  prenom,
  dateNaissance,
  value,
  declared,
}: {
  eleveKey: string;
  nom: string | null | undefined;
  prenom: string | null | undefined;
  dateNaissance: string | null | undefined;
  /** Code niveau actuellement attribué (depuis la table niveaux_eleves) */
  value: string | null | undefined;
  /** Niveau déclaré par la famille (affiché en hint) */
  declared?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localValue, setLocalValue] = useState<string | null>(value ?? null);

  if (estAdulte(dateNaissance)) {
    return <span className="text-gray-300 text-xs">—</span>;
  }

  const current = parseNiveau(localValue);

  async function save(newCode: string) {
    const next = newCode === "" ? null : newCode;
    setLocalValue(next); // feedback immédiat
    startTransition(async () => {
      await fetch("/api/admin/niveaux", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eleve_key: eleveKey,
          nom: nom ?? null,
          prenom: prenom ?? null,
          niveau: next,
        }),
      });
      router.refresh();
    });
  }

  return (
    <div>
      <select
        value={current?.code ?? ""}
        disabled={pending}
        onChange={(e) => save(e.target.value)}
        className="text-xs px-1.5 py-1 rounded border border-gray-300"
        style={
          current
            ? {
                backgroundColor: current.bg,
                color: current.text,
                borderColor: current.border,
                fontWeight: 600,
              }
            : undefined
        }
      >
        <option value="">— Niveau —</option>
        {NIVEAUX_TENNIS.map((n) => (
          <option key={n.code} value={n.code}>
            {n.label}
          </option>
        ))}
      </select>
      {!current && declared ? (
        <div className="mt-1 text-[10px] text-gray-400 leading-tight max-w-[130px]">
          Famille&nbsp;: {declared}
        </div>
      ) : null}
    </div>
  );
}

/** Filter dropdown : « Tous » + 11 niveaux + option « Autres (legacy) »
 *  qui matche tout ce qui n'est pas reconnu. */
export function NiveauFilter({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
    >
      <option value="">Tous niveaux</option>
      {NIVEAUX_TENNIS.map((n) => (
        <option key={n.code} value={n.code}>
          {n.label}
        </option>
      ))}
      <option value="__legacy__">Autres (anciens libellés)</option>
      <option value="__none__">Sans niveau</option>
    </select>
  );
}

/** Helper de filtrage : true si `value` matche le filtre `current`. */
export function matchesNiveau(
  rowValue: string | null | undefined,
  filter: string | undefined,
): boolean {
  if (!filter) return true;
  if (filter === "__none__") return !rowValue || rowValue.trim() === "";
  if (filter === "__legacy__") {
    return !!rowValue && rowValue.trim() !== "" && !parseNiveau(rowValue);
  }
  return parseNiveau(rowValue)?.code === filter;
}
