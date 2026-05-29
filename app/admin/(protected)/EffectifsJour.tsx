"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Semaine } from "@/lib/data/tarifs-types";
import type { EffectifsJour as EffJour, EnfantEffectif } from "@/lib/admin/stages-org-queries";

const JOURS = [
  { id: "lundi", label: "Lundi" },
  { id: "mardi", label: "Mardi" },
  { id: "mercredi", label: "Mercredi" },
  { id: "jeudi", label: "Jeudi" },
  { id: "vendredi", label: "Vendredi" },
] as const;

const FORMULE_SHORT: Record<string, string> = {
  formule_1: "F1",
  formule_2: "F2",
  formule_3: "F3",
  formule_4: "F4",
};

interface Props {
  semaines: Semaine[];
  currentSemaineCode?: string;
  data: { total: number; jours: Record<string, EffJour> } | null;
}

export default function EffectifsJour({ semaines, currentSemaineCode, data }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const currentSemaine = semaines.find((s) => s.code === currentSemaineCode);

  const grouped = useMemo(() => {
    const out: Record<string, Semaine[]> = {};
    for (const s of semaines) {
      if (!s.ouverte) continue;
      out[s.periode] ||= [];
      out[s.periode].push(s);
    }
    return out;
  }, [semaines]);

  function switchSemaine(code: string) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", "effectifs");
    if (code) next.set("effSem", code);
    else next.delete("effSem");
    router.push(`/admin?${next.toString()}`);
  }

  return (
    <div className="space-y-5">
      {/* Sélecteur semaine */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm no-print">
        <label className="text-xs font-semibold uppercase text-gray-500">
          Semaine :
        </label>
        <select
          value={currentSemaineCode ?? ""}
          onChange={(e) => switchSemaine(e.target.value)}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold"
        >
          <option value="">— Choisir une semaine —</option>
          {Object.entries(grouped).map(([periode, items]) => (
            <optgroup key={periode} label={periode}>
              {items.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {currentSemaine && data ? (
          <span className="text-sm text-gray-600">
            <strong>{data.total}</strong> inscrit{data.total > 1 ? "s" : ""} sur la semaine
          </span>
        ) : null}
        {currentSemaine ? (
          <button
            onClick={() => window.print()}
            className="ml-auto text-xs font-semibold px-3 py-1.5 rounded bg-white border border-gray-300 hover:bg-gray-50"
          >
            🖨️ Imprimer
          </button>
        ) : null}
      </div>

      {!currentSemaine || !data ? (
        <div className="rounded-xl bg-white border border-gray-200 p-8 text-center text-gray-500">
          Choisis une semaine pour voir les effectifs jour par jour.
        </div>
      ) : (
        <>
          {/* En-tête imprimable */}
          <div className="print-only mb-3">
            <div
              className="print-only-flex"
              style={{ alignItems: "center", gap: "12pt", borderBottom: "2pt solid #0d2e3f", paddingBottom: "8pt" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-club.png" alt="ATS Valrose" style={{ height: "40pt", width: "auto" }} />
              <div>
                <div style={{ fontSize: "16pt", fontWeight: 800, color: "#0d2e3f" }}>
                  ATS Valrose — Effectifs par jour
                </div>
                <div style={{ fontSize: "13pt", color: "#333" }}>
                  {currentSemaine.periode} — {currentSemaine.label}
                </div>
              </div>
            </div>
          </div>

          {/* Tableau récap compteurs */}
          <div className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm">
            <header className="bg-gradient-to-r from-navy to-cyan-club text-white px-5 py-3 no-print">
              <h2 className="text-lg font-extrabold">
                {currentSemaine.periode} — {currentSemaine.label}
              </h2>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-xs uppercase">
                    <th className="px-3 py-2 border text-left">Jour</th>
                    <th className="px-3 py-2 border text-center">🌅 Matin</th>
                    <th className="px-3 py-2 border text-center">🌇 Après-midi</th>
                    <th className="px-3 py-2 border text-center">🍽️ Repas</th>
                  </tr>
                </thead>
                <tbody>
                  {JOURS.map((j) => {
                    const d = data.jours[j.id];
                    return (
                      <tr key={j.id} className="even:bg-gray-50/60">
                        <td className="px-3 py-2 border font-bold bg-navy/5 text-navy">{j.label}</td>
                        <td className="px-3 py-2 border text-center text-lg font-extrabold text-cyan-club">
                          {d.matin.length}
                        </td>
                        <td className="px-3 py-2 border text-center text-lg font-extrabold text-ocre-dark">
                          {d.apresMidi.length}
                        </td>
                        <td className="px-3 py-2 border text-center text-lg font-extrabold text-emerald-600">
                          {d.repas.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Détail nominatif par jour */}
          {JOURS.map((j) => {
            const d = data.jours[j.id];
            if (d.matin.length === 0 && d.apresMidi.length === 0 && d.repas.length === 0) return null;
            return (
              <section
                key={j.id}
                className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm"
                style={{ breakInside: "avoid" }}
              >
                <header className="bg-navy/90 text-white px-4 py-2 font-bold">
                  {j.label}
                </header>
                <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                  <Colonne titre="🌅 Matin" couleur="text-cyan-club" enfants={d.matin} />
                  <Colonne titre="🌇 Après-midi" couleur="text-ocre-dark" enfants={d.apresMidi} />
                  <Colonne titre="🍽️ Repas" couleur="text-emerald-600" enfants={d.repas} />
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

function Colonne({
  titre,
  couleur,
  enfants,
}: {
  titre: string;
  couleur: string;
  enfants: EnfantEffectif[];
}) {
  // Trie alphabétique par nom puis prénom
  const sorted = [...enfants].sort(
    (a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom),
  );
  return (
    <div className="p-3">
      <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${couleur}`}>
        {titre} <span className="text-gray-400">({enfants.length})</span>
      </p>
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400 italic">—</p>
      ) : (
        <ul className="space-y-0.5">
          {sorted.map((e, i) => (
            <li key={i} className="text-sm text-gray-800 flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-gray-400 w-5 shrink-0">
                {FORMULE_SHORT[e.formule] ?? "?"}
              </span>
              {e.prenom} {e.nom}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
