"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { InscriptionStageRow } from "@/lib/types/db";
import type { Semaine } from "@/lib/data/tarifs-types";
import {
  formatDateTime,
  age,
  formuleLabel,
  creneauLabel,
  f4SelectionLabel,
  statutLabel,
  statutBadgeClass,
} from "@/lib/admin/format";

const STATUTS = ["en_attente", "paye", "annule"] as const;

export default function StagesTable({
  rows,
  semaines,
  currentSemaine,
  currentStatut,
}: {
  rows: InscriptionStageRow[];
  semaines: Semaine[];
  currentSemaine?: string;
  currentStatut?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("tab", "stages");
    router.push(`/admin?${next.toString()}`);
  }

  async function setStatut(id: string, statut: string) {
    startTransition(async () => {
      await fetch(`/api/admin/inscriptions/stages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      router.refresh();
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-b-xl rounded-tr-xl shadow-sm">
      <div className="p-4 border-b flex flex-wrap items-center gap-3">
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={currentSemaine ?? ""}
          onChange={(e) => updateParam("semaine", e.target.value)}
        >
          <option value="">Toutes les semaines</option>
          {semaines
            .filter((s) => s.ouverte)
            .map((s) => (
              <option key={s.id} value={s.code}>
                {s.periode} — {s.label}
              </option>
            ))}
        </select>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={currentStatut ?? ""}
          onChange={(e) => updateParam("statut", e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {statutLabel(s)}
            </option>
          ))}
        </select>
        <a
          href={`/api/admin/export/stages?${params.toString()}`}
          className="ml-auto rounded-md bg-yellow-club text-navy px-3 py-1.5 text-xs font-semibold hover:bg-yellow-hover"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Enfant</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Semaine</th>
              <th className="text-left p-3">Formule</th>
              <th className="text-right p-3">Prix</th>
              <th className="text-left p-3">Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  Aucune inscription pour le moment.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap text-gray-600">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-navy">
                      {r.prenom} {r.nom}
                    </div>
                    <div className="text-xs text-gray-500">
                      {age(r.date_naissance)} ans
                      {r.niveau ? ` • ${r.niveau}` : ""}
                    </div>
                  </td>
                  <td className="p-3 text-xs">
                    <div>{r.email}</div>
                    <div className="text-gray-500">{r.telephone}</div>
                  </td>
                  <td className="p-3 text-xs">{r.semaine_label}</td>
                  <td className="p-3 text-xs">
                    <div>{formuleLabel(r.formule)}</div>
                    <div className="text-gray-500">
                      {creneauLabel(r.formule_creneau)}
                      {r.formule_dejeuner ? " + déjeuner" : ""}
                      {r.formule === "formule_4"
                        ? f4SelectionLabel(r.formule_4_selection)
                        : ""}
                    </div>
                  </td>
                  <td className="p-3 text-right font-bold text-navy">
                    {r.prix_total}€
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statutBadgeClass(
                        r.statut,
                      )}`}
                    >
                      {statutLabel(r.statut)}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <button
                      onClick={() => setOpenId(openId === r.id ? null : r.id)}
                      className="text-xs text-navy underline hover:text-yellow-hover"
                    >
                      {openId === r.id ? "Fermer" : "Détails"}
                    </button>
                    {openId === r.id ? (
                      <div className="absolute z-10 mt-2 rounded-md bg-white border border-gray-200 shadow-lg p-2 flex flex-col gap-1">
                        {STATUTS.map((s) => (
                          <button
                            key={s}
                            disabled={pending || r.statut === s}
                            onClick={() => setStatut(r.id, s)}
                            className="text-left px-3 py-1.5 text-xs rounded hover:bg-gray-100 disabled:opacity-40"
                          >
                            Marquer comme {statutLabel(s).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
