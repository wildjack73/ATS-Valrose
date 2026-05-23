"use client";

import { statutLabel, statutBadgeClass } from "@/lib/admin/format";

const STATUTS = ["en_attente", "paye", "annule"] as const;
type Statut = (typeof STATUTS)[number];

/**
 * Statut éditable inline : 3 boutons côte à côte.
 * Le bouton actif est coloré, les inactifs sont gris (clic pour changer).
 */
export default function InlineStatusBadge({
  value,
  onChange,
  disabled,
  paiementInfo,
  notesAdmin,
}: {
  value: string;
  onChange: (newStatut: Statut) => void;
  disabled?: boolean;
  paiementInfo?: string | null;
  notesAdmin?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="inline-flex rounded-md overflow-hidden border border-gray-300 text-[10px] font-semibold">
        {STATUTS.map((s, idx) => {
          const isActive = s === value;
          const cls = isActive
            ? `${statutBadgeClass(s)} ring-0`
            : "bg-white text-gray-500 hover:bg-gray-50";
          return (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!isActive) onChange(s);
              }}
              className={`px-2 py-1 transition ${cls} ${
                idx < STATUTS.length - 1 ? "border-r border-gray-300" : ""
              } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
              title={
                isActive
                  ? "Statut actuel"
                  : `Marquer comme ${statutLabel(s).toLowerCase()}`
              }
            >
              {isActive ? "✓ " : ""}
              {s === "en_attente"
                ? "Att."
                : s === "paye"
                  ? "Payé"
                  : "Annulé"}
            </button>
          );
        })}
      </div>
      {paiementInfo || notesAdmin ? (
        <div className="flex gap-1 text-sm leading-none">
          {paiementInfo ? (
            <span title={`Règlement : ${paiementInfo}`}>💳</span>
          ) : null}
          {notesAdmin ? (
            <span title={`Note : ${notesAdmin}`}>💬</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
