"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { InscriptionStageHistoriqueRow } from "@/lib/admin/queries";

export default function HistoriqueTable({
  rows,
  semaines,
  currentSemaine,
}: {
  rows: InscriptionStageHistoriqueRow[];
  semaines: string[];
  currentSemaine?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("tab", "historique");
    router.push(`/admin?${next.toString()}`);
  }

  const total = rows.reduce((s, r) => s + (r.prix_estime ?? 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-b-xl rounded-tr-xl shadow-sm">
      <div className="p-4 border-b flex flex-wrap items-center gap-3">
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={currentSemaine ?? ""}
          onChange={(e) => updateParam("semaine", e.target.value)}
        >
          <option value="">Toutes les semaines</option>
          {semaines.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-gray-600">
          Total estimé&nbsp;:{" "}
          <strong className="text-navy">{total}€</strong> ({rows.length}{" "}
          inscriptions)
        </span>
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
              <th className="text-left p-3">Détails F4</th>
              <th className="text-right p-3">Prix</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Aucune donnée historique. Lancer{" "}
                  <code className="px-1 bg-gray-100 rounded">
                    npm run import:historique
                  </code>{" "}
                  en local.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 whitespace-nowrap text-gray-600 text-xs">
                    {r.horodateur ?? "—"}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-navy">
                      {r.prenom ?? ""} {r.nom ?? ""}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.date_naissance ?? ""}
                      {r.niveau ? ` • ${r.niveau}` : ""}
                    </div>
                  </td>
                  <td className="p-3 text-xs">
                    <div>{r.email ?? "—"}</div>
                    <div className="text-gray-500">{r.telephone ?? ""}</div>
                  </td>
                  <td className="p-3 text-xs">{r.semaine ?? "—"}</td>
                  <td className="p-3 text-xs">
                    <div>{r.formule ?? "—"}</div>
                    {r.dejeuner ? (
                      <div className="text-gray-500">+ déjeuner</div>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {r.jours_f4 ?? ""}
                  </td>
                  <td className="p-3 text-right font-bold text-navy">
                    {r.prix_estime > 0 ? `${r.prix_estime}€` : "—"}
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
