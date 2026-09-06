"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SECTIONS_CRENEAUX } from "@/lib/data/creneaux-ecole";

/** Les créneaux perfectionnement padel (source unique). */
const PERF_OPTIONS =
  SECTIONS_CRENEAUX.find((s) => s.categorie === "padel_jeunes")?.groupes.flatMap(
    (g) => g.options,
  ) ?? [];
const PERF_LABELS = new Set(PERF_OPTIONS.map((o) => o.label));

type Row = {
  id: string;
  prenom: string;
  nom: string;
  dispo_semaine: string | null;
};

export default function AffectationPadel({
  rows,
  saisonLabel,
}: {
  rows: Row[];
  saisonLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Sélection courante par inscription (initialisée sur la dispo si déjà un
  // créneau perf, sinon vide = à affecter).
  const initial = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of rows) {
      m[r.id] = r.dispo_semaine && PERF_LABELS.has(r.dispo_semaine.trim())
        ? r.dispo_semaine.trim()
        : "";
    }
    return m;
  }, [rows]);

  const [sel, setSel] = useState<Record<string, string>>(initial);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [errorId, setErrorId] = useState<{ id: string; msg: string } | null>(
    null,
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  const restant = rows.filter((r) => !sel[r.id]).length;

  async function save(id: string) {
    const value = sel[id];
    if (!value) return;
    setErrorId(null);
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/inscriptions/ecole/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispo_semaine: value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec");
      }
      setSavedIds((prev) => new Set(prev).add(id));
      startTransition(() => router.refresh());
    } catch (e) {
      setErrorId({ id, msg: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h1 className="text-lg font-bold text-navy">
          Affectation — Perfectionnement Padel
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Saison <strong>{saisonLabel}</strong> · {rows.length} inscrit
          {rows.length > 1 ? "s" : ""} · <strong>{restant}</strong> encore à
          affecter. Choisissez un créneau pour chacun puis cliquez «
          Enregistrer ». Le créneau choisi remplace la disponibilité actuelle.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2 font-bold">Élève</th>
              <th className="px-4 py-2 font-bold">Dispo actuelle</th>
              <th className="px-4 py-2 font-bold">Créneau perfectionnement</th>
              <th className="px-4 py-2 font-bold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const current = sel[r.id] ?? "";
              const dirty = current !== (initial[r.id] ?? "");
              const dejaOk =
                !!r.dispo_semaine && PERF_LABELS.has(r.dispo_semaine.trim());
              const saved = savedIds.has(r.id);
              return (
                <tr key={r.id} className={saved ? "bg-emerald-50/50" : ""}>
                  <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-800">
                    {r.nom} {r.prenom}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {r.dispo_semaine ? (
                      <span
                        className={
                          dejaOk ? "text-emerald-700" : "text-orange-600"
                        }
                      >
                        {r.dispo_semaine}
                      </span>
                    ) : (
                      <span className="italic text-gray-400">— aucune</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={current}
                      disabled={pending || savingId === r.id}
                      onChange={(e) =>
                        setSel((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-sm min-w-[180px]"
                    >
                      <option value="">— choisir —</option>
                      {PERF_OPTIONS.map((o) => (
                        <option key={o.label} value={o.label}>
                          {o.display}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <button
                      onClick={() => save(r.id)}
                      disabled={!current || !dirty || savingId === r.id}
                      className="rounded bg-navy text-white px-3 py-1 text-xs font-bold hover:bg-navy-dark disabled:opacity-40"
                    >
                      {savingId === r.id ? "…" : "Enregistrer"}
                    </button>
                    {saved && !dirty ? (
                      <span className="ml-2 text-xs text-emerald-600 font-semibold">
                        ✓
                      </span>
                    ) : null}
                    {errorId?.id === r.id ? (
                      <span className="ml-2 text-xs text-red-600">
                        {errorId.msg}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Page provisoire. Les modifications sont immédiates. Rechargez pour voir
        l&apos;état à jour.
      </p>
    </div>
  );
}
