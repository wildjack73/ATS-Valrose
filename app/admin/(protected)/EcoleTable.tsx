"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { InscriptionEcoleRow } from "@/lib/types/db";
import {
  formatDateTime,
  age,
  coursTennisLabels,
  coursPadelLabels,
  modeReglementLabel,
  licenceFftLabel,
  statutLabel,
  statutBadgeClass,
} from "@/lib/admin/format";

const STATUTS = ["en_attente", "paye", "annule"] as const;

export default function EcoleTable({
  rows,
  currentStatut,
}: {
  rows: InscriptionEcoleRow[];
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
    next.set("tab", "ecole");
    router.push(`/admin?${next.toString()}`);
  }

  async function setStatut(id: string, statut: string) {
    startTransition(async () => {
      await fetch(`/api/admin/inscriptions/ecole/${id}`, {
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
          href={`/api/admin/export/ecole?${params.toString()}`}
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
              <th className="text-left p-3">Élève</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Cours</th>
              <th className="text-left p-3">Disponibilités</th>
              <th className="text-right p-3">Total</th>
              <th className="text-left p-3">Règlement</th>
              <th className="text-left p-3">Licence FFT</th>
              <th className="text-left p-3">Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-gray-500">
                  Aucune inscription pour le moment.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const dispo = [
                  r.dispo_mercredi ? `Mer: ${r.dispo_mercredi}` : null,
                  r.dispo_samedi ? `Sam: ${r.dispo_samedi}` : null,
                  r.dispo_semaine ? `Sem: ${r.dispo_semaine}` : null,
                ]
                  .filter(Boolean)
                  .join(" • ");
                return (
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
                      <div className="text-gray-500">
                        {r.code_postal_ville}
                      </div>
                    </td>
                    <td className="p-3 text-xs space-y-0.5">
                      {coursTennisLabels(r.cours_tennis) ? (
                        <div>
                          <span className="text-gray-500">T:</span>{" "}
                          {coursTennisLabels(r.cours_tennis)}
                        </div>
                      ) : null}
                      {coursPadelLabels(r.cours_padel) ? (
                        <div>
                          <span className="text-gray-500">P:</span>{" "}
                          {coursPadelLabels(r.cours_padel)}
                        </div>
                      ) : null}
                      {r.licence_pickleball ? (
                        <div className="text-gray-500">+ Pickleball</div>
                      ) : null}
                    </td>
                    <td className="p-3 text-xs text-gray-600">
                      {dispo || "—"}
                    </td>
                    <td className="p-3 text-right font-bold text-navy">
                      {r.prix_total}€
                    </td>
                    <td className="p-3 text-xs">
                      {modeReglementLabel(r.mode_reglement)}
                      <div className="text-gray-500">
                        en {r.nb_paiements} fois
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      {licenceFftLabel(r.licence_fft)}
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
                        onClick={() =>
                          setOpenId(openId === r.id ? null : r.id)
                        }
                        className="text-xs text-navy underline hover:text-yellow-hover"
                      >
                        {openId === r.id ? "Fermer" : "Statut"}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
