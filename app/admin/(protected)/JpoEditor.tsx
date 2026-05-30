"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { JpoConfig, JpoJour } from "@/lib/data/jpo-ecole";
import type { Saison } from "@/lib/data/tarifs-types";

interface Props {
  saisonEcole: Saison;
  jpo: JpoConfig | null;
}

/**
 * Éditeur de la config Journées Portes Ouvertes pour la saison école
 * courante. Le bandeau s'affiche sur /ecole tant que visible_jusqu_au
 * est dans le futur.
 */
export default function JpoEditor({ saisonEcole, jpo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [visibleJusquAu, setVisibleJusquAu] = useState(
    jpo?.visible_jusqu_au ?? "",
  );
  const [anneeScolaire, setAnneeScolaire] = useState(jpo?.annee_scolaire ?? "");
  const [dateReprise, setDateReprise] = useState(jpo?.date_reprise ?? "");
  const [jours, setJours] = useState<JpoJour[]>(jpo?.jours ?? []);

  async function withError(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function save() {
    if (!visibleJusquAu || !anneeScolaire || !dateReprise) {
      setError("Date limite, année scolaire et date de reprise sont requises.");
      return;
    }
    await withError(async () => {
      const res = await fetch("/api/admin/jpo-ecole", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saison_id: saisonEcole.id,
          visible_jusqu_au: visibleJusquAu,
          annee_scolaire: anneeScolaire,
          date_reprise: dateReprise,
          jours,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec mise à jour");
      }
    });
  }

  async function supprimer() {
    if (
      !window.confirm(
        "Supprimer la config JPO de cette saison ? Le bandeau ne s'affichera plus sur /ecole.",
      )
    )
      return;
    await withError(async () => {
      const res = await fetch(
        `/api/admin/jpo-ecole?saison_id=${encodeURIComponent(saisonEcole.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec suppression");
      }
    });
  }

  function updateJour(i: number, patch: Partial<JpoJour>) {
    setJours(jours.map((j, idx) => (idx === i ? { ...j, ...patch } : j)));
  }
  function addJour() {
    setJours([...jours, { label: "", creneaux: "" }]);
  }
  function removeJour(i: number) {
    setJours(jours.filter((_, idx) => idx !== i));
  }

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const masqueActuel =
    !!jpo && new Date(jpo.visible_jusqu_au).getTime() < Date.now();

  return (
    <section className="rounded-2xl bg-white border-2 border-ocre/30 shadow-sm overflow-hidden">
      <header className="bg-ocre/10 px-5 py-3 border-b border-ocre/20 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-navy text-lg">
            📅 Bandeau Journées Portes Ouvertes
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Affiché en haut de la page /ecole tant que la date limite est dans
            le futur. Saison école : <strong>{saisonEcole.label}</strong>.
          </p>
        </div>
        {jpo ? (
          <button
            onClick={supprimer}
            disabled={pending}
            className="text-xs px-3 py-1.5 rounded text-red-700 hover:bg-red-50 border border-red-200"
          >
            🗑️ Supprimer le bandeau
          </button>
        ) : null}
      </header>

      <div className="p-5 space-y-4">
        {error ? (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
            ⚠ {error}
          </div>
        ) : null}

        {jpo && masqueActuel ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 text-sm">
            ⚠ La date limite est passée → le bandeau est <strong>masqué</strong>{" "}
            sur la page publique. Modifie « Visible jusqu&apos;au » pour le
            réafficher.
          </div>
        ) : null}

        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 uppercase">
              Visible jusqu&apos;au
            </span>
            <input
              type="date"
              value={visibleJusquAu}
              onChange={(e) => setVisibleJusquAu(e.target.value)}
              min={aujourdHui}
              disabled={pending}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
            <span className="text-[10px] text-gray-500">
              (lendemain de la dernière JPO recommandé)
            </span>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 uppercase">
              Année scolaire
            </span>
            <input
              type="text"
              value={anneeScolaire}
              onChange={(e) => setAnneeScolaire(e.target.value)}
              placeholder="2026/2027"
              disabled={pending}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 uppercase">
              Date de reprise
            </span>
            <input
              type="text"
              value={dateReprise}
              onChange={(e) => setDateReprise(e.target.value)}
              placeholder="mercredi 9 septembre 2026"
              disabled={pending}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase">
              Journées portes ouvertes ({jours.length})
            </span>
            <button
              onClick={addJour}
              disabled={pending}
              className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
              + Ajouter une journée
            </button>
          </div>
          {jours.length === 0 ? (
            <p className="text-xs text-gray-500 italic px-2 py-3 bg-gray-50 rounded">
              Aucune journée enregistrée — clique sur « + Ajouter une journée ».
            </p>
          ) : (
            <ul className="space-y-2">
              {jours.map((j, i) => (
                <li
                  key={i}
                  className="flex gap-2 items-center flex-wrap bg-gray-50 rounded px-2 py-1.5"
                >
                  <input
                    type="text"
                    value={j.label}
                    onChange={(e) => updateJour(i, { label: e.target.value })}
                    placeholder="Mardi 1ᵉʳ septembre"
                    disabled={pending}
                    className="flex-1 min-w-[180px] rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    value={j.creneaux}
                    onChange={(e) =>
                      updateJour(i, { creneaux: e.target.value })
                    }
                    placeholder="17h – 20h"
                    disabled={pending}
                    className="flex-1 min-w-[160px] rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => removeJour(i)}
                    disabled={pending}
                    title="Retirer cette journée"
                    className="text-base opacity-60 hover:opacity-100"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={pending}
            className="rounded bg-navy text-white px-4 py-2 text-sm font-bold hover:bg-navy-dark disabled:opacity-40"
          >
            {pending ? "Enregistrement…" : "Enregistrer le bandeau"}
          </button>
        </div>
      </div>
    </section>
  );
}
