"use client";

import { useRef, useState, useEffect } from "react";
import { statutLabel, statutBadgeClass } from "@/lib/admin/format";

const STATUTS = ["en_attente", "paye", "annule"] as const;
type Statut = (typeof STATUTS)[number];

/**
 * Badge de statut éditable inline.
 * Clic sur le badge → menu de choix → sauvegarde immédiate via onChange.
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer si clic à l'extérieur
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${statutBadgeClass(
          value,
        )} disabled:cursor-not-allowed disabled:opacity-50`}
        title="Cliquer pour changer le statut"
      >
        {statutLabel(value)}
        <span className="text-[10px] opacity-60">▾</span>
      </button>
      <div className="flex gap-1 text-base leading-none mt-1">
        {paiementInfo ? (
          <span title={`Règlement : ${paiementInfo}`}>💳</span>
        ) : null}
        {notesAdmin ? <span title={`Note : ${notesAdmin}`}>💬</span> : null}
      </div>
      {open ? (
        <div className="absolute z-20 mt-1 left-0 rounded-lg bg-white border border-gray-200 shadow-lg py-1 min-w-[140px]">
          {STATUTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              disabled={s === value}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              <span
                className={`inline-block rounded-full px-2 py-0.5 ${statutBadgeClass(s)}`}
              >
                {statutLabel(s)}
              </span>
              {s === value ? (
                <span className="text-xs text-gray-400">✓ actuel</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
