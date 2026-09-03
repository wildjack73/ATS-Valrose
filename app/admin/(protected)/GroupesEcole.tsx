"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Coach } from "@/lib/data/planning-types";
import {
  type GroupeEleveRow,
  effectiveHoraireLabel,
  horaireSortKey,
  dispoLabelsOf,
  A_CLASSER,
} from "@/lib/data/groupes-ecole";
import {
  age,
  coursTennisLabels,
  coursPadelLabels,
  coursPickleballLabels,
} from "@/lib/admin/format";
import type {
  CoursTennisId,
  CoursPadelId,
  CoursPickleballId,
} from "@/lib/data/ecole";

interface Props {
  saisonId: string;
  eleves: GroupeEleveRow[];
  coaches: Coach[];
  horaires: Record<string, string>;
}

const SANS_COACH = "__sans__";

function coursSummary(r: GroupeEleveRow): string {
  return [
    coursTennisLabels(r.cours_tennis as CoursTennisId[] | null),
    coursPadelLabels(r.cours_padel as CoursPadelId[] | null),
    coursPickleballLabels(r.cours_pickleball as CoursPickleballId[] | null),
  ]
    .filter(Boolean)
    .join(" + ");
}

export default function GroupesEcole({
  saisonId: _saisonId,
  eleves,
  coaches,
  horaires,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<GroupeEleveRow[]>(eleves);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"tableau" | "grille">("tableau");

  useEffect(() => setRows(eleves), [eleves]);

  const activeCoaches = useMemo(
    () => coaches.filter((c) => c.actif),
    [coaches],
  );
  const coachById = useMemo(
    () => new Map(coaches.map((c) => [c.id, c])),
    [coaches],
  );

  const groups = useMemo(() => {
    const map = new Map<string, GroupeEleveRow[]>();
    for (const r of rows) {
      const label = effectiveHoraireLabel(r, horaires) || A_CLASSER;
      const arr = map.get(label) ?? [];
      arr.push(r);
      map.set(label, arr);
    }
    const labels = [...map.keys()].sort((a, b) => {
      if (a === A_CLASSER) return 1;
      if (b === A_CLASSER) return -1;
      return horaireSortKey(a) - horaireSortKey(b) || a.localeCompare(b);
    });
    return labels.map((label) => ({
      label,
      eleves: (map.get(label) as GroupeEleveRow[])
        .slice()
        .sort(
          (x, y) =>
            (age(y.date_naissance) ?? 0) - (age(x.date_naissance) ?? 0) ||
            x.nom.localeCompare(y.nom),
        ),
    }));
  }, [rows, horaires]);

  const totalCoches = rows.length;
  const aClasser = groups.find((g) => g.label === A_CLASSER)?.eleves.length ?? 0;
  const sansCoach = rows.filter((r) => !r.coach_id).length;

  async function setCoach(ids: string[], coachId: string | null) {
    if (ids.length === 0) return;
    setError(null);
    setRows((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, coach_id: coachId } : r)),
    );
    try {
      const res = await fetch("/api/admin/inscriptions/ecole/coach-groupe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inscription_ids: ids, coach_id: coachId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec de l'affectation");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm no-print">
          ⚠ {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm no-print">
        <div className="inline-flex rounded border border-gray-300 overflow-hidden text-xs">
          <button
            onClick={() => setView("tableau")}
            className={`px-3 py-1.5 font-semibold ${
              view === "tableau"
                ? "bg-navy text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            📝 Tableau
          </button>
          <button
            onClick={() => setView("grille")}
            className={`px-3 py-1.5 font-semibold ${
              view === "grille"
                ? "bg-navy text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            📋 Grille coachs
          </button>
        </div>
        <button
          onClick={() => window.print()}
          className="text-xs font-semibold px-3 py-1.5 rounded bg-white border border-gray-300 hover:bg-gray-50"
        >
          🖨️ Imprimer
        </button>
        <div className="ml-auto text-xs text-gray-600">
          <strong>{totalCoches}</strong> élèves à grouper ·{" "}
          <strong className="text-green-700">{totalCoches - aClasser}</strong>{" "}
          classés ·{" "}
          <strong className="text-orange-600">{aClasser}</strong> à classer ·{" "}
          <strong className="text-gray-500">{sansCoach}</strong> sans coach
        </div>
      </div>

      {totalCoches === 0 ? (
        <section className="rounded-xl bg-white border border-gray-200 p-10 text-center text-gray-600">
          Aucun élève coché « Ajouté au groupe » (ni prévenu) pour le moment.
          Coche des élèves dans l'onglet <strong>École enfants</strong> : ils
          apparaîtront ici, rangés par horaire.
        </section>
      ) : view === "tableau" ? (
        <div className="space-y-6">
          {groups.map((g) => (
            <GroupeTable
              key={g.label}
              label={g.label}
              eleves={g.eleves}
              horaires={horaires}
              activeCoaches={activeCoaches}
              coachById={coachById}
              pending={pending}
              onSetCoach={setCoach}
            />
          ))}
        </div>
      ) : (
        <Grille
          groups={groups}
          activeCoaches={activeCoaches}
          coachById={coachById}
        />
      )}
    </div>
  );
}

// --- Vue Tableau : un tableau par créneau (lignes = élèves) ------------------

function CoachSelect({
  value,
  activeCoaches,
  pending,
  onChange,
}: {
  value: string;
  activeCoaches: Coach[];
  pending: boolean;
  onChange: (coachId: string | null) => void;
}) {
  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-semibold"
    >
      <option value="">— coach —</option>
      {activeCoaches.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nom}
        </option>
      ))}
    </select>
  );
}

function GroupeTable({
  label,
  eleves,
  horaires,
  activeCoaches,
  coachById,
  pending,
  onSetCoach,
}: {
  label: string;
  eleves: GroupeEleveRow[];
  horaires: Record<string, string>;
  activeCoaches: Coach[];
  coachById: Map<string, Coach>;
  pending: boolean;
  onSetCoach: (ids: string[], coachId: string | null) => void;
}) {
  const isAClasser = label === A_CLASSER;

  return (
    <section className="rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden print-break">
      <header
        className={`px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-300 ${
          isAClasser ? "bg-amber-50" : "bg-navy"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`text-base font-extrabold ${
              isAClasser ? "text-amber-900" : "text-white"
            }`}
          >
            {isAClasser ? "🟠 À classer" : `📅 ${label}`}
          </span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isAClasser
                ? "bg-amber-100 text-amber-900"
                : "bg-white/20 text-white"
            }`}
          >
            {eleves.length} élève{eleves.length > 1 ? "s" : ""}
          </span>
        </div>
        {!isAClasser ? (
          <label className="text-xs text-white/90 flex items-center gap-1.5 no-print">
            Coach pour tout le créneau :
            <select
              defaultValue=""
              disabled={pending}
              onChange={(e) => {
                const v = e.target.value;
                if (v)
                  onSetCoach(
                    eleves.map((x) => x.id),
                    v === SANS_COACH ? null : v,
                  );
                e.target.value = "";
              }}
              className="rounded border border-white/40 bg-white/95 px-2 py-1 text-xs text-navy font-semibold"
            >
              <option value="">— choisir —</option>
              {activeCoaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
              <option value={SANS_COACH}>— retirer le coach —</option>
            </select>
          </label>
        ) : (
          <span className="text-[11px] text-amber-900 no-print">
            Renseigne leur horaire exact (onglet École) pour les ranger.
          </span>
        )}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-[11px] uppercase tracking-wide text-gray-500">
              <th className="w-10 px-3 py-2 text-right border-b border-gray-300">
                #
              </th>
              <th className="px-3 py-2 text-left border-b border-r border-gray-300">
                Élève
              </th>
              <th className="w-16 px-3 py-2 text-center border-b border-r border-gray-300">
                Âge
              </th>
              <th className="px-3 py-2 text-left border-b border-r border-gray-300">
                Cours
              </th>
              {isAClasser ? (
                <th className="px-3 py-2 text-left border-b border-gray-300">
                  Dispos
                </th>
              ) : (
                <>
                  <th className="w-44 px-3 py-2 text-left border-b border-gray-300 no-print">
                    Coach
                  </th>
                  <th className="hidden print:table-cell px-3 py-2 text-left border-b border-gray-300">
                    Coach
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {eleves.map((e, i) => {
              const coach = e.coach_id ? coachById.get(e.coach_id) : null;
              return (
                <tr
                  key={e.id}
                  className="border-b border-gray-200 last:border-b-0 even:bg-gray-50/60 hover:bg-gray-50"
                >
                  <td className="px-3 py-2 text-right text-gray-400 tabular-nums border-r border-gray-100">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2 font-bold text-navy whitespace-nowrap border-r border-gray-100">
                    {e.prenom} {e.nom}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-700 tabular-nums border-r border-gray-100">
                    {age(e.date_naissance) ?? "?"}
                  </td>
                  <td className="px-3 py-2 text-gray-600 border-r border-gray-100">
                    {coursSummary(e) || "—"}
                  </td>
                  {isAClasser ? (
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {dispoLabelsOf(e).join(" · ") || "—"}
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-1.5 no-print">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: coach?.couleur ?? "#e5e7eb",
                            }}
                            aria-hidden
                          />
                          <CoachSelect
                            value={e.coach_id ?? ""}
                            activeCoaches={activeCoaches}
                            pending={pending}
                            onChange={(cid) => onSetCoach([e.id], cid)}
                          />
                        </div>
                      </td>
                      <td className="hidden print:table-cell px-3 py-2 font-semibold">
                        {coach?.nom ?? "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// --- Vue Grille : horaires en lignes × coachs en colonnes (façon Excel) ------

function Grille({
  groups,
  activeCoaches,
  coachById,
}: {
  groups: { label: string; eleves: GroupeEleveRow[] }[];
  activeCoaches: Coach[];
  coachById: Map<string, Coach>;
}) {
  const usedCoachIds = new Set<string>();
  let hasSansCoach = false;
  for (const g of groups)
    for (const e of g.eleves) {
      if (e.coach_id) usedCoachIds.add(e.coach_id);
      else hasSansCoach = true;
    }
  const cols = activeCoaches.filter((c) => usedCoachIds.has(c.id));

  const cellFor = (eleves: GroupeEleveRow[], coachId: string | null) =>
    eleves.filter((e) => (e.coach_id ?? null) === coachId);

  if (cols.length === 0 && !hasSansCoach) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 text-sm">
        Aucun élève pour l'instant.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-300 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="bg-navy text-white px-3 py-3 border border-navy/40 sticky left-0 z-10 text-left min-w-[160px]">
              Créneau
            </th>
            {cols.map((c) => (
              <th
                key={c.id}
                className="text-white px-3 py-3 border border-white/30 font-extrabold min-w-[160px] text-center"
                style={{ backgroundColor: c.couleur ?? "#0d2e3f" }}
              >
                {c.nom}
              </th>
            ))}
            {hasSansCoach ? (
              <th className="px-3 py-3 border border-gray-300 bg-gray-100 text-gray-600 font-bold min-w-[160px] text-center">
                Sans coach
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.label} className="align-top">
              <th className="px-3 py-2.5 border border-gray-300 bg-navy/5 text-navy font-bold whitespace-nowrap sticky left-0 text-left">
                {g.label === A_CLASSER ? "🟠 À classer" : g.label}
              </th>
              {cols.map((c) => {
                const list = cellFor(g.eleves, c.id);
                return (
                  <td
                    key={c.id}
                    className="px-3 py-2.5 border border-gray-300"
                    style={{
                      backgroundColor: list.length
                        ? `${c.couleur ?? "#0d2e3f"}0d`
                        : undefined,
                    }}
                  >
                    <ol className="space-y-1 leading-snug list-none">
                      {list.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-baseline justify-between gap-2"
                        >
                          <span className="text-navy">
                            {e.prenom} {e.nom}
                          </span>
                          <span className="text-gray-400 tabular-nums text-xs shrink-0">
                            {age(e.date_naissance) ?? "?"} ans
                          </span>
                        </li>
                      ))}
                    </ol>
                  </td>
                );
              })}
              {hasSansCoach ? (
                <td className="px-3 py-2.5 border border-gray-300 bg-gray-50">
                  <ol className="space-y-1 leading-snug list-none text-gray-500">
                    {cellFor(g.eleves, null).map((e) => (
                      <li
                        key={e.id}
                        className="flex items-baseline justify-between gap-2"
                      >
                        <span>
                          {e.prenom} {e.nom}
                        </span>
                        <span className="text-gray-400 tabular-nums text-xs shrink-0">
                          {age(e.date_naissance) ?? "?"} ans
                        </span>
                      </li>
                    ))}
                  </ol>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {coachById.size === 0 ? (
        <p className="p-4 text-xs text-gray-500">Aucun coach défini.</p>
      ) : null}
    </div>
  );
}
