"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Coach } from "@/lib/data/planning-types";
import type { Semaine } from "@/lib/data/tarifs-types";

type StageSession =
  | "matin"
  | "apres_midi"
  | "soir"
  | "sport_collectifs_matin"
  | "sport_collectifs_apres_midi"
  | "repas"
  | "permanence_matin"
  | "permanence_apres_midi";

interface AssignedCoach {
  id: string;
  coach: Coach | null;
}

interface Props {
  semaines: Semaine[];
  currentSemaineId?: string;
  coaches: Coach[];
  /** Map "jour|session" → liste de coachs assignés */
  organisation: Record<string, AssignedCoach[]>;
  inscriptionsCount: {
    total: number;
    matin: Record<string, number>;
    apresMidi: Record<string, number>;
  };
}

const JOURS_SEMAINE = [
  { id: "lundi", label: "Lundi" },
  { id: "mardi", label: "Mardi" },
  { id: "mercredi", label: "Mercredi" },
  { id: "jeudi", label: "Jeudi" },
  { id: "vendredi", label: "Vendredi" },
] as const;

const JOURS_WEEKEND = [
  { id: "samedi", label: "Samedi" },
  { id: "dimanche", label: "Dimanche" },
] as const;

export default function StagesOrganisation({
  semaines,
  currentSemaineId,
  coaches,
  organisation,
  inscriptionsCount,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentSemaine = semaines.find((s) => s.id === currentSemaineId);

  function switchSemaine(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", "stages-org");
    next.set("semaineId", id);
    router.push(`/admin?${next.toString()}`);
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function withError(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function addCoach(jour: string, session: StageSession, coachId: string) {
    await withError(async () => {
      const res = await fetch("/api/admin/stage-organisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semaine_id: currentSemaineId,
          jour,
          session,
          coach_id: coachId,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec ajout");
      }
    });
  }

  async function removeAssignment(id: string) {
    await withError(async () => {
      const res = await fetch(`/api/admin/stage-organisations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Échec retrait");
    });
  }

  // Group semaines by période for the selector
  const groupedSemaines = useMemo(() => {
    const out: Record<string, Semaine[]> = {};
    for (const s of semaines) {
      out[s.periode] ||= [];
      out[s.periode].push(s);
    }
    return out;
  }, [semaines]);

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          ⚠ {error}
        </div>
      ) : null}

      {/* Sélecteur semaine */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm no-print">
        <label className="text-xs font-semibold uppercase text-gray-500">
          Semaine :
        </label>
        <select
          value={currentSemaineId ?? ""}
          onChange={(e) => switchSemaine(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold"
        >
          <option value="">— Choisir une semaine —</option>
          {Object.entries(groupedSemaines).map(([periode, items]) => (
            <optgroup key={periode} label={periode}>
              {items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {currentSemaine ? (
          <span className="text-sm text-gray-600">
            <strong>{inscriptionsCount.total}</strong> inscription
            {inscriptionsCount.total > 1 ? "s" : ""} au total
          </span>
        ) : null}
        <button
          onClick={() => window.print()}
          className="ml-auto text-xs font-semibold px-3 py-1.5 rounded bg-white border border-gray-300 hover:bg-gray-50"
        >
          🖨️ Imprimer
        </button>
      </div>

      {!currentSemaine ? (
        <div className="rounded-xl bg-white border border-gray-200 p-8 text-center text-gray-500">
          Sélectionne une semaine pour voir son organisation.
        </div>
      ) : (
        <>
          {/* En-tête imprimable (caché à l'écran) */}
          <div className="print-only mb-4" style={{ pageBreakInside: "avoid" }}>
            <div
              className="print-only-flex"
              style={{
                alignItems: "center",
                gap: "12pt",
                borderBottom: "2pt solid #0d2e3f",
                paddingBottom: "8pt",
                marginBottom: "12pt",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-club.png"
                alt="ATS Valrose"
                style={{ height: "40pt", width: "auto" }}
              />
              <div>
                <div
                  style={{
                    fontSize: "16pt",
                    fontWeight: 800,
                    color: "#0d2e3f",
                    lineHeight: 1.1,
                  }}
                >
                  ATS&nbsp;Valrose — Organisation des coachs
                </div>
                <div style={{ fontSize: "13pt", color: "#333", marginTop: "2pt" }}>
                  {currentSemaine.periode} — {currentSemaine.label}
                </div>
                <div
                  style={{ fontSize: "10pt", color: "#666", marginTop: "2pt" }}
                >
                  {inscriptionsCount.total} inscription
                  {inscriptionsCount.total > 1 ? "s" : ""} sur la semaine
                </div>
              </div>
            </div>
          </div>

          {/* Table semaine */}
          <section className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm">
            <header className="bg-gradient-to-r from-navy via-navy to-cyan-club text-white px-5 py-3 no-print">
              <h2 className="text-lg font-extrabold">
                {currentSemaine.periode} — {currentSemaine.label}
              </h2>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="px-2 py-2 border text-left">Jour</th>
                    <th className="px-2 py-2 border text-center w-12">Matin</th>
                    <th className="px-2 py-2 border text-left">Profs matin</th>
                    <th className="px-2 py-2 border text-left">Sports collectifs</th>
                    <th className="px-2 py-2 border text-left">Repas</th>
                    <th className="px-2 py-2 border text-center w-12">Après-midi</th>
                    <th className="px-2 py-2 border text-left">Profs après-midi</th>
                    <th className="px-2 py-2 border text-left">Sports collectifs</th>
                    <th className="px-2 py-2 border text-left">Soir</th>
                  </tr>
                </thead>
                <tbody>
                  {JOURS_SEMAINE.map((j) => (
                    <tr key={j.id} className="even:bg-gray-50/60">
                      <td className="px-2 py-2 border font-bold bg-navy/5 text-navy">
                        {j.label}
                      </td>
                      <td className="px-2 py-2 border text-center font-bold">
                        {inscriptionsCount.matin[j.id] ?? 0}
                      </td>
                      <CoachCell
                        jour={j.id}
                        session="matin"
                        coaches={coaches}
                        assigned={organisation[`${j.id}|matin`] ?? []}
                        pending={pending}
                        onAdd={(coachId) => addCoach(j.id, "matin", coachId)}
                        onRemove={removeAssignment}
                      />
                      <CoachCell
                        jour={j.id}
                        session="sport_collectifs_matin"
                        coaches={coaches}
                        assigned={
                          organisation[`${j.id}|sport_collectifs_matin`] ?? []
                        }
                        pending={pending}
                        onAdd={(coachId) =>
                          addCoach(j.id, "sport_collectifs_matin", coachId)
                        }
                        onRemove={removeAssignment}
                      />
                      <CoachCell
                        jour={j.id}
                        session="repas"
                        coaches={coaches}
                        assigned={organisation[`${j.id}|repas`] ?? []}
                        pending={pending}
                        onAdd={(coachId) => addCoach(j.id, "repas", coachId)}
                        onRemove={removeAssignment}
                      />
                      <td className="px-2 py-2 border text-center font-bold">
                        {inscriptionsCount.apresMidi[j.id] ?? 0}
                      </td>
                      <CoachCell
                        jour={j.id}
                        session="apres_midi"
                        coaches={coaches}
                        assigned={organisation[`${j.id}|apres_midi`] ?? []}
                        pending={pending}
                        onAdd={(coachId) =>
                          addCoach(j.id, "apres_midi", coachId)
                        }
                        onRemove={removeAssignment}
                      />
                      <CoachCell
                        jour={j.id}
                        session="sport_collectifs_apres_midi"
                        coaches={coaches}
                        assigned={
                          organisation[`${j.id}|sport_collectifs_apres_midi`] ??
                          []
                        }
                        pending={pending}
                        onAdd={(coachId) =>
                          addCoach(
                            j.id,
                            "sport_collectifs_apres_midi",
                            coachId,
                          )
                        }
                        onRemove={removeAssignment}
                      />
                      <CoachCell
                        jour={j.id}
                        session="soir"
                        coaches={coaches}
                        assigned={organisation[`${j.id}|soir`] ?? []}
                        pending={pending}
                        onAdd={(coachId) => addCoach(j.id, "soir", coachId)}
                        onRemove={removeAssignment}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Permanence week-end */}
          <section className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm">
            <header className="bg-gradient-to-r from-ocre to-clay text-white px-5 py-3 no-print">
              <h2 className="text-lg font-extrabold">
                🏖️ Permanence week-end
              </h2>
            </header>
            {/* Titre weekend pour impression uniquement */}
            <h3
              className="print-only"
              style={{
                fontSize: "12pt",
                fontWeight: 700,
                color: "#0d2e3f",
                marginTop: "12pt",
                marginBottom: "4pt",
              }}
            >
              Permanence week-end
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="px-2 py-2 border text-left">Jour</th>
                    <th className="px-2 py-2 border text-left">
                      Permanence 9h-15h
                    </th>
                    <th className="px-2 py-2 border text-left">
                      Permanence 15h-21h
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {JOURS_WEEKEND.map((j) => (
                    <tr key={j.id} className="even:bg-gray-50/60">
                      <td className="px-2 py-2 border font-bold bg-ocre/5 text-ocre-dark">
                        {j.label}
                      </td>
                      <CoachCell
                        jour={j.id}
                        session="permanence_matin"
                        coaches={coaches}
                        assigned={organisation[`${j.id}|permanence_matin`] ?? []}
                        pending={pending}
                        onAdd={(coachId) =>
                          addCoach(j.id, "permanence_matin", coachId)
                        }
                        onRemove={removeAssignment}
                      />
                      <CoachCell
                        jour={j.id}
                        session="permanence_apres_midi"
                        coaches={coaches}
                        assigned={
                          organisation[`${j.id}|permanence_apres_midi`] ?? []
                        }
                        pending={pending}
                        onAdd={(coachId) =>
                          addCoach(j.id, "permanence_apres_midi", coachId)
                        }
                        onRemove={removeAssignment}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CoachCell({
  coaches,
  assigned,
  pending,
  onAdd,
  onRemove,
}: {
  jour: string;
  session: StageSession;
  coaches: Coach[];
  assigned: AssignedCoach[];
  pending: boolean;
  onAdd: (coachId: string) => void;
  onRemove: (id: string) => void;
}) {
  const assignedCoachIds = new Set(
    assigned.map((a) => a.coach?.id).filter(Boolean) as string[],
  );
  const available = coaches.filter((c) => !assignedCoachIds.has(c.id));

  return (
    <td className="px-2 py-2 border align-top">
      <div className="flex flex-wrap gap-1">
        {assigned.map((a) =>
          a.coach ? (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white group cursor-pointer hover:opacity-80"
              style={{ backgroundColor: a.coach.couleur ?? "#0d2e3f" }}
              onClick={() => {
                if (confirm(`Retirer ${a.coach?.nom} ?`)) onRemove(a.id);
              }}
              title="Cliquer pour retirer"
            >
              {a.coach.nom}
              <span className="opacity-60 print-hide">×</span>
            </span>
          ) : null,
        )}
        {available.length > 0 ? (
          <select
            defaultValue=""
            disabled={pending}
            onChange={(e) => {
              if (e.target.value) {
                onAdd(e.target.value);
                e.target.value = "";
              }
            }}
            className="text-[11px] rounded border border-gray-300 px-1 py-0 bg-white hover:bg-gray-50 print-hide"
          >
            <option value="">+</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </td>
  );
}
