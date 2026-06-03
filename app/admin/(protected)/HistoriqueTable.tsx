"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { InscriptionStageHistoriqueRow } from "@/lib/admin/queries";

// --- Helpers ---------------------------------------------------------------

/**
 * Une "horodateur" du CSV peut être :
 *  - Un vrai timestamp Google Forms : "30/11/2025 11:18:22"
 *  - Une note de paiement : "chéq 110€", "espèces", etc.
 *  - Vide
 */
function isRealDate(s: string | null): boolean {
  if (!s) return false;
  // Format Google Forms : DD/MM/YYYY HH:MM:SS ou DD/MM/YYYY
  return /^\d{1,2}\/\d{1,2}\/\d{2,4}(\s+\d{1,2}:\d{2})?/.test(s.trim());
}

function looksLikePaymentNote(s: string | null): boolean {
  if (!s) return false;
  return /chéq|cheque|chq|espèces|especes|€/i.test(s);
}

/** Convertit un horodateur DD/MM/YYYY HH:MM:SS en timestamp pour le tri. */
function dateToSortable(s: string | null): number {
  if (!s || !isRealDate(s)) return 0;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return 0;
  const [, d, mo, y, h = "0", mi = "0"] = m;
  const year = parseInt(y, 10) < 100 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
  return new Date(year, parseInt(mo, 10) - 1, parseInt(d, 10), parseInt(h, 10), parseInt(mi, 10)).getTime();
}

/**
 * Devine l'ordre chronologique d'une "semaine" string.
 * Renvoie un entier qu'on peut utiliser pour trier les groupes.
 * Plus la valeur est petite, plus c'est ancien.
 */
function semaineToOrder(s: string): number {
  if (!s) return 9999999;
  const lower = s.toLowerCase();

  // Année
  let year = 2025;
  const yMatch = s.match(/20(\d{2})/);
  if (yMatch) year = 2000 + parseInt(yMatch[1], 10);

  // Mois approximatif depuis le nom de saison ou le mois
  let month = 12;
  if (lower.includes("toussaint") || lower.includes("octobre") || /\b10\b/.test(s)) month = 10;
  else if (lower.includes("noël") || lower.includes("noel") || lower.includes("décembre") || lower.includes("decembre") || /\b12\b/.test(s)) month = 12;
  else if (lower.includes("janvier") || /\b01\/01\b/.test(s)) { month = 1; year += 0; }
  else if (lower.includes("février") || lower.includes("fevrier") || lower.includes("hiver") || /\b02\b/.test(s)) month = 2;
  else if (lower.includes("avril") || lower.includes("printemps") || /\b04\b/.test(s)) month = 4;
  else if (lower.includes("juillet") || /\b07\b/.test(s)) month = 7;
  else if (lower.includes("août") || lower.includes("aout") || /\b08\b/.test(s)) month = 8;

  // Jour du mois (premier nombre 1-31 trouvé)
  let day = 1;
  const dMatch = s.match(/\b(\d{1,2})\s*(?:\/|au|février|fevrier|décembre|decembre|octobre|avril|juillet|août|aout)/i);
  if (dMatch) day = parseInt(dMatch[1], 10);

  return year * 10000 + month * 100 + day;
}

// --- Composant -------------------------------------------------------------

type Group = {
  semaine: string;
  rows: InscriptionStageHistoriqueRow[];
  total: number;
  order: number;
};

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
  const [search, setSearch] = useState("");

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("tab", "historique");
    router.push(`/admin?${next.toString()}`);
  }

  // Filtre par nom / prénom / email (avant le grouping par semaine)
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.prenom ?? ""} ${r.nom ?? ""} ${r.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const grandTotal = filteredRows.reduce((s, r) => s + (r.prix_estime ?? 0), 0);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, InscriptionStageHistoriqueRow[]>();
    for (const r of filteredRows) {
      const key = (r.semaine ?? "Sans période").trim() || "Sans période";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    const out: Group[] = [];
    for (const [semaine, items] of map.entries()) {
      // Trier les rows d'un groupe : vraies dates en premier (récent → ancien), puis le reste
      items.sort((a, b) => {
        const ta = dateToSortable(a.horodateur);
        const tb = dateToSortable(b.horodateur);
        if (ta && tb) return tb - ta;
        if (ta && !tb) return -1;
        if (!ta && tb) return 1;
        return (a.nom ?? "").localeCompare(b.nom ?? "");
      });
      out.push({
        semaine,
        rows: items,
        total: items.reduce((s, r) => s + (r.prix_estime ?? 0), 0),
        order: semaineToOrder(semaine),
      });
    }
    // Plus récent en premier
    out.sort((a, b) => b.order - a.order);
    return out;
  }, [filteredRows]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="p-4 border-b flex flex-wrap items-center gap-3">
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={currentSemaine ?? ""}
          onChange={(e) => updateParam("semaine", e.target.value)}
        >
          <option value="">Toutes les semaines ({rows.length})</option>
          {semaines.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher nom ou email…"
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm w-56"
        />
        <span className="ml-auto text-sm text-gray-600">
          Total estimé&nbsp;:{" "}
          <strong className="text-navy">{grandTotal}€</strong>
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Aucune donnée historique.
        </div>
      ) : (
        <div className="overflow-x-auto">
          {groups.map((g) => (
            <div key={g.semaine}>
              {/* En-tête du groupe */}
              <div className="bg-navy/5 border-y border-navy/10 px-4 py-2 flex items-center justify-between text-sm">
                <div className="font-bold text-navy">{g.semaine}</div>
                <div className="text-gray-600">
                  {g.rows.length} inscription{g.rows.length > 1 ? "s" : ""}{" "}
                  · <strong className="text-navy">{g.total}€</strong>
                </div>
              </div>

              <table className="w-full text-sm">
                <tbody>
                  {g.rows.map((r) => {
                    const realDate = isRealDate(r.horodateur);
                    const paymentNote = looksLikePaymentNote(r.horodateur);
                    return (
                      <tr key={r.id} className="border-t hover:bg-gray-50">
                        {/* Date / Statut */}
                        <td className="p-3 whitespace-nowrap text-xs w-44">
                          {realDate ? (
                            <span className="text-gray-600">
                              {r.horodateur}
                            </span>
                          ) : paymentNote ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-semibold">
                              ✓ {r.horodateur}
                            </span>
                          ) : r.horodateur ? (
                            <span className="text-gray-400 italic">
                              {r.horodateur}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        {/* Enfant */}
                        <td className="p-3">
                          <div className="font-semibold text-navy">
                            {r.prenom ?? ""} {r.nom ?? ""}
                          </div>
                          <div className="text-xs text-gray-500">
                            {r.date_naissance ?? ""}
                            {r.niveau ? ` • ${r.niveau}` : ""}
                          </div>
                        </td>
                        {/* Contact */}
                        <td className="p-3 text-xs w-64">
                          <div>{r.email ?? "—"}</div>
                          <div className="text-gray-500">
                            {r.telephone ?? ""}
                          </div>
                        </td>
                        {/* Formule */}
                        <td className="p-3 text-xs">
                          <div>{r.formule ?? "—"}</div>
                          {r.dejeuner ? (
                            <div className="text-gray-500">+ déjeuner</div>
                          ) : null}
                          {r.jours_f4 ? (
                            <div className="text-gray-500 italic">
                              {r.jours_f4}
                            </div>
                          ) : null}
                        </td>
                        {/* Prix */}
                        <td className="p-3 text-right font-bold text-navy w-24">
                          {r.prix_estime > 0 ? `${r.prix_estime}€` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
