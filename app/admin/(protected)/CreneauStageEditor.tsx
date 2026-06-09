"use client";

import { useEffect, useState } from "react";
import type { Semaine } from "@/lib/data/tarifs-types";

/** Édition de la semaine et, pour la Formule 2, du créneau matin/après-midi
 *  d'une inscription stage (panneau déplié admin). La Formule 4 a déjà son
 *  éditeur par jour ; ici on ne touche pas au créneau pour F1/F3/F4. */
export default function CreneauStageEditor({
  row,
  semaines,
  patch,
  pending,
}: {
  row: { semaine: string; formule: string; formule_creneau: string | null };
  semaines: Semaine[];
  patch: (p: object) => void;
  pending: boolean;
}) {
  const [sem, setSem] = useState(row.semaine ?? "");
  const [cre, setCre] = useState<string>(row.formule_creneau ?? "");

  useEffect(() => {
    setSem(row.semaine ?? "");
    setCre(row.formule_creneau ?? "");
  }, [row.semaine, row.formule_creneau]);

  const isF2 = row.formule === "formule_2";
  const dirty =
    sem !== (row.semaine ?? "") ||
    (isF2 && cre !== (row.formule_creneau ?? ""));

  // La semaine actuelle est-elle dans la liste ? (sinon on l'ajoute en tête)
  const codes = new Set(semaines.map((s) => s.code));

  function save() {
    const p: Record<string, string | null> = {};
    if (sem !== (row.semaine ?? "")) p.semaine = sem;
    if (isF2 && cre !== (row.formule_creneau ?? "")) {
      p.formule_creneau = cre || null;
    }
    patch(p);
  }

  const field =
    "mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white";
  const lbl = "text-[11px] font-semibold text-gray-600 uppercase";

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-bold text-navy uppercase tracking-wide mb-2">
        Semaine &amp; créneau{" "}
        <span className="font-normal text-gray-400 normal-case">
          (modifiable)
        </span>
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="block">
          <span className={lbl}>Semaine</span>
          <select
            className={field}
            value={sem}
            disabled={pending}
            onChange={(e) => setSem(e.target.value)}
          >
            {!codes.has(sem) && sem ? (
              <option value={sem}>{row.semaine} (actuelle)</option>
            ) : null}
            {semaines.map((s) => (
              <option key={s.code} value={s.code}>
                {s.periode} — {s.label}
                {s.ouverte ? "" : " (fermée)"}
              </option>
            ))}
          </select>
        </label>
        {isF2 ? (
          <label className="block">
            <span className={lbl}>Créneau (Formule 2)</span>
            <select
              className={field}
              value={cre}
              disabled={pending}
              onChange={(e) => setCre(e.target.value)}
            >
              <option value="">— Non précisé —</option>
              <option value="matin">Matin</option>
              <option value="apres_midi">Après-midi</option>
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="rounded bg-navy text-white px-3 py-1.5 text-xs font-bold hover:bg-navy-dark disabled:opacity-40"
        >
          {pending ? "…" : "Enregistrer la semaine / le créneau"}
        </button>
      </div>
    </div>
  );
}
