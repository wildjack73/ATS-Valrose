"use client";

import { useMemo, useState } from "react";
import type { InscriptionEcoleHistoriqueRow } from "@/lib/admin/queries";
import { NiveauEleveSelect, NiveauFilter, matchesNiveau } from "./NiveauUI";
import { eleveKey } from "@/lib/data/niveaux";

export default function HistoriqueEcoleTable({
  rows,
  niveauxEleves,
}: {
  rows: InscriptionEcoleHistoriqueRow[];
  niveauxEleves: Record<string, string>;
}) {
  const [search, setSearch] = useState("");
  const [filterNiveau, setFilterNiveau] = useState("");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.prenom ?? ""} ${r.nom ?? ""} ${r.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterNiveau) {
        const lvl = niveauxEleves[eleveKey(r.nom, r.prenom)] ?? null;
        if (!matchesNiveau(lvl, filterNiveau)) return false;
      }
      return true;
    });
  }, [rows, search, filterNiveau, niveauxEleves]);

  const total = filteredRows.reduce((s, r) => s + (r.prix_estime ?? 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="p-4 border-b flex flex-wrap items-center gap-3">
        <NiveauFilter value={filterNiveau} onChange={setFilterNiveau} />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher nom ou email…"
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm w-52"
        />
        <span className="ml-auto text-sm text-gray-600">
          Total estimé&nbsp;:{" "}
          <strong className="text-navy">{total}€</strong> ({filteredRows.length}
          {filteredRows.length !== rows.length ? `/${rows.length}` : ""}{" "}
          inscriptions)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Élève</th>
              <th className="text-left p-3 w-24">Niveau</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Cours</th>
              <th className="text-left p-3">Disponibilités</th>
              <th className="text-left p-3">Règlement</th>
              <th className="text-right p-3">Prix estimé</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  {rows.length === 0 ? (
                    <>
                      Aucune donnée. Lancer{" "}
                      <code className="px-1 bg-gray-100 rounded">
                        npm run import:historique-ecole
                      </code>{" "}
                      en local.
                    </>
                  ) : (
                    "Aucune inscription ne correspond à la recherche."
                  )}
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => {
                const cours = [
                  r.cours_tennis_raw,
                  r.cours_padel_raw,
                  r.formule_mixte_raw,
                  r.nouvelles_formules_raw,
                ]
                  .filter(Boolean)
                  .join(" • ");
                const dispo = [
                  r.dispo_mercredi ? `Mer: ${r.dispo_mercredi}` : null,
                  r.dispo_samedi ? `Sam: ${r.dispo_samedi}` : null,
                  r.dispo_semaine ? `Sem: ${r.dispo_semaine}` : null,
                ]
                  .filter(Boolean)
                  .join(" • ");
                return (
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
                      </div>
                    </td>
                    <td className="p-3 w-28">
                      <NiveauEleveSelect
                        eleveKey={eleveKey(r.nom, r.prenom)}
                        nom={r.nom}
                        prenom={r.prenom}
                        dateNaissance={r.date_naissance}
                        value={niveauxEleves[eleveKey(r.nom, r.prenom)] ?? null}
                        declared={r.niveau}
                      />
                    </td>
                    <td className="p-3 text-xs">
                      <div>{r.email ?? "—"}</div>
                      <div className="text-gray-500">{r.telephone ?? ""}</div>
                      <div className="text-gray-500">
                        {r.code_postal_ville ?? ""}
                      </div>
                    </td>
                    <td className="p-3 text-xs max-w-xs">{cours || "—"}</td>
                    <td className="p-3 text-xs text-gray-600">
                      {dispo || "—"}
                    </td>
                    <td className="p-3 text-xs">
                      {r.mode_reglement ?? "—"}
                      {r.nb_paiements ? (
                        <div className="text-gray-500">
                          {r.nb_paiements}
                        </div>
                      ) : null}
                      {r.reglement_notes ? (
                        <div className="text-gray-500 italic">
                          {r.reglement_notes}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3 text-right font-bold text-navy">
                      {r.prix_estime > 0 ? `${r.prix_estime}€` : "—"}
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
