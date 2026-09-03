"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Coach } from "@/lib/data/planning-types";
import {
  type GroupeEleveRow,
  effectiveHoraireLabel,
  horaireSortKey,
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
  const [view, setView] = useState<"liste" | "grille">("liste");

  useEffect(() => setRows(eleves), [eleves]);

  const activeCoaches = useMemo(
    () => coaches.filter((c) => c.actif),
    [coaches],
  );
  const coachById = useMemo(
    () => new Map(coaches.map((c) => [c.id, c])),
    [coaches],
  );

  // Regroupement par horaire effectif
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
        .sort((x, y) => x.nom.localeCompare(y.nom)),
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
      const res = await fetch(
        "/api/admin/inscriptions/ecole/coach-groupe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inscription_ids: ids, coach_id: coachId }),
        },
      );
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
    <div className="space-y-5">
      {error ? (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm no-print">
          ⚠ {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm no-print">
        <div className="inline-flex rounded border border-gray-300 overflow-hidden text-xs">
          <button
            onClick={() => setView("liste")}
            className={`px-3 py-1.5 font-semibold ${
              view === "liste"
                ? "bg-navy text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            📝 Liste (affecter)
          </button>
          <button
            onClick={() => setView("grille")}
            className={`px-3 py-1.5 font-semibold ${
              view === "grille"
                ? "bg-navy text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            📋 Grille (Excel)
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
          Aucun élève coché « Ajouté au groupe » pour le moment. Coche des élèves
          dans l'onglet <strong>École enfants</strong> : ils apparaîtront ici,
          rangés par horaire.
        </section>
      ) : view === "liste" ? (
        <div className="space-y-4">
          {groups.map((g) => (
            <GroupeSection
              key={g.label}
              label={g.label}
              eleves={g.eleves}
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

// --- Vue Liste : une section par horaire, coach par élève -------------------

function GroupeSection({
  label,
  eleves,
  activeCoaches,
  coachById,
  pending,
  onSetCoach,
}: {
  label: string;
  eleves: GroupeEleveRow[];
  activeCoaches: Coach[];
  coachById: Map<string, Coach>;
  pending: boolean;
  onSetCoach: (ids: string[], coachId: string | null) => void;
}) {
  const isAClasser = label === A_CLASSER;
  return (
    <section
      className={`rounded-xl border shadow-sm overflow-hidden ${
        isAClasser
          ? "border-orange-300 bg-orange-50/40"
          : "border-gray-200 bg-white"
      }`}
    >
      <header className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className={`font-bold ${isAClasser ? "text-orange-800" : "text-navy"}`}>
            {isAClasser ? "🟠 À classer" : `📅 ${label}`}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {eleves.length}
          </span>
        </div>
        {!isAClasser ? (
          <label className="text-xs text-gray-600 flex items-center gap-1.5 no-print">
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
              className="rounded border border-gray-300 px-2 py-1 text-xs"
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
          <span className="text-[11px] text-orange-700 no-print">
            Renseigne leur horaire exact (onglet École) pour les ranger.
          </span>
        )}
      </header>
      <ul className="divide-y divide-gray-100">
        {eleves.map((e) => {
          const coach = e.coach_id ? coachById.get(e.coach_id) : null;
          return (
            <li
              key={e.id}
              className="px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: coach?.couleur ?? "#e5e7eb" }}
                aria-hidden
              />
              <strong className="text-navy">
                {e.prenom} {e.nom}
              </strong>
              <span className="text-xs text-gray-500">
                {age(e.date_naissance) ?? "?"} ans
                {coursSummary(e) ? ` · ${coursSummary(e)}` : ""}
              </span>
              <label className="ml-auto flex items-center gap-1.5 no-print">
                <span className="text-[11px] text-gray-500">Coach</span>
                <select
                  value={e.coach_id ?? ""}
                  disabled={pending}
                  onChange={(ev) =>
                    onSetCoach([e.id], ev.target.value || null)
                  }
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                  style={
                    coach
                      ? { borderColor: coach.couleur ?? undefined }
                      : undefined
                  }
                >
                  <option value="">—</option>
                  {activeCoaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </label>
              {/* Coach visible aussi à l'impression */}
              <span className="hidden print:inline text-xs font-semibold">
                {coach?.nom ?? ""}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// --- Vue Grille : horaires en lignes × coachs en colonnes -------------------

function Grille({
  groups,
  activeCoaches,
  coachById,
}: {
  groups: { label: string; eleves: GroupeEleveRow[] }[];
  activeCoaches: Coach[];
  coachById: Map<string, Coach>;
}) {
  // Colonnes = coachs qui apparaissent réellement + « Sans coach » si besoin
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

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="bg-navy text-white px-2 py-2 border border-navy/30 sticky left-0 z-10 text-left">
              Créneau
            </th>
            {cols.map((c) => (
              <th
                key={c.id}
                className="text-white px-2 py-2 border border-white/30 font-bold"
                style={{ backgroundColor: c.couleur ?? "#0d2e3f" }}
              >
                {c.nom}
              </th>
            ))}
            {hasSansCoach ? (
              <th className="px-2 py-2 border border-gray-200 bg-gray-100 text-gray-600 font-bold">
                Sans coach
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.label} className="even:bg-gray-50/60 align-top">
              <th className="px-2 py-2 border border-gray-200 bg-navy/5 text-navy font-bold whitespace-nowrap sticky left-0 text-left">
                {g.label === A_CLASSER ? "🟠 À classer" : g.label}
              </th>
              {cols.map((c) => {
                const list = cellFor(g.eleves, c.id);
                return (
                  <td
                    key={c.id}
                    className="px-2 py-2 border border-gray-200"
                    style={{
                      backgroundColor: list.length
                        ? `${c.couleur ?? "#0d2e3f"}0f`
                        : undefined,
                    }}
                  >
                    <ul className="space-y-0.5 leading-tight">
                      {list.map((e) => (
                        <li key={e.id}>
                          {e.prenom} {e.nom}
                          <span className="text-gray-400">
                            {" "}
                            {age(e.date_naissance) ?? "?"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                );
              })}
              {hasSansCoach ? (
                <td className="px-2 py-2 border border-gray-200">
                  <ul className="space-y-0.5 leading-tight text-gray-500">
                    {cellFor(g.eleves, null).map((e) => (
                      <li key={e.id}>
                        {e.prenom} {e.nom}
                        <span className="text-gray-400">
                          {" "}
                          {age(e.date_naissance) ?? "?"}
                        </span>
                      </li>
                    ))}
                  </ul>
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
