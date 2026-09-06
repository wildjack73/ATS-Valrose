"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  prenom: string;
  nom: string;
  dispo_semaine: string | null;
};

export type Bloc = {
  key: string;
  titre: string;
  options: { value: string; text: string }[];
  rows: Row[];
};

export default function AffectationPadel({
  blocs,
  saisonLabel,
}: {
  blocs: Bloc[];
  saisonLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Ensemble de tous les libellés valides, par bloc (pour savoir si une dispo
  // existante est déjà « bonne »).
  const valeursValides = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    for (const b of blocs) m[b.key] = new Set(b.options.map((o) => o.value));
    return m;
  }, [blocs]);

  // Sélection initiale : la dispo si elle est déjà un créneau valide du bloc.
  const initial = useMemo(() => {
    const m: Record<string, string> = {};
    for (const b of blocs) {
      for (const r of b.rows) {
        const d = r.dispo_semaine?.trim() ?? "";
        m[r.id] = valeursValides[b.key].has(d) ? d : "";
      }
    }
    return m;
  }, [blocs, valeursValides]);

  const [sel, setSel] = useState<Record<string, string>>(initial);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<{ id: string; msg: string } | null>(
    null,
  );

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
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h1 className="text-lg font-bold text-navy">
          Affectation aux créneaux padel
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Saison <strong>{saisonLabel}</strong>. Choisissez un créneau pour
          chaque élève puis « Enregistrer » : le créneau choisi remplace la
          disponibilité actuelle (et apparaîtra dans l&apos;email « Prévenir »).
          Les lignes en <span className="text-orange-600">orange</span> n&apos;ont
          pas encore de créneau valide.
        </p>
      </div>

      {blocs.map((b) => {
        const valides = valeursValides[b.key];
        const restant = b.rows.filter(
          (r) => !valides.has(r.dispo_semaine?.trim() ?? ""),
        ).length;
        return (
          <section
            key={b.key}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <header className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-bold text-navy">{b.titre}</span>
              <span className="text-xs text-gray-500">
                {b.rows.length} inscrit{b.rows.length > 1 ? "s" : ""} ·{" "}
                <strong>{restant}</strong> à affecter
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2 font-bold">Élève</th>
                    <th className="px-4 py-2 font-bold">Dispo actuelle</th>
                    <th className="px-4 py-2 font-bold">Créneau</th>
                    <th className="px-4 py-2 font-bold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {b.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-4 text-center text-sm text-gray-400 italic"
                      >
                        Aucun inscrit.
                      </td>
                    </tr>
                  ) : (
                    b.rows.map((r) => {
                      const current = sel[r.id] ?? "";
                      const dirty = current !== (initial[r.id] ?? "");
                      const dejaOk = valides.has(r.dispo_semaine?.trim() ?? "");
                      const saved = savedIds.has(r.id);
                      return (
                        <tr key={r.id} className={saved ? "bg-emerald-50/50" : ""}>
                          <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-800">
                            {r.nom} {r.prenom}
                          </td>
                          <td className="px-4 py-2">
                            {r.dispo_semaine ? (
                              <span
                                className={
                                  dejaOk ? "text-emerald-700" : "text-orange-600"
                                }
                              >
                                {r.dispo_semaine}
                              </span>
                            ) : (
                              <span className="italic text-orange-600">
                                — aucune
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={current}
                              disabled={pending || savingId === r.id}
                              onChange={(e) =>
                                setSel((prev) => ({
                                  ...prev,
                                  [r.id]: e.target.value,
                                }))
                              }
                              className="rounded border border-gray-300 px-2 py-1 text-sm min-w-[180px]"
                            >
                              <option value="">— choisir —</option>
                              {b.options.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.text}
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <p className="text-xs text-gray-400">
        Page provisoire. Les modifications sont immédiates ; rechargez pour voir
        l&apos;état à jour.
      </p>
    </div>
  );
}
