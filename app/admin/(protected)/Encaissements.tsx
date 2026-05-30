"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { InscriptionStageRow, InscriptionEcoleRow } from "@/lib/types/db";
import { statutLabel } from "@/lib/admin/format";
import { PaiementsPanel, type PaiementClient } from "./PaiementsPanel";

type Domaine = "stages" | "ecole";
type StatusFilter = "tout" | "a_regler" | "partiel" | "solde" | "annule";

interface UnifiedRow {
  id: string;
  domaine: Domaine;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  detail: string; // semaine+formule (stages) ou cours (école)
  prixTotal: number;
  totalPaye: number;
  reste: number;
  statut: string; // statut de l'inscription (en_attente / paye / annule)
  etat: "solde" | "partiel" | "a_regler" | "annule";
  paiements: PaiementClient[];
}

function classifie(
  prixTotal: number,
  totalPaye: number,
  statut: string,
): UnifiedRow["etat"] {
  if (statut === "annule") return "annule";
  if (prixTotal <= 0) return "solde"; // pas de montant attendu = OK
  if (totalPaye <= 0) return "a_regler";
  if (totalPaye >= prixTotal) return "solde";
  return "partiel";
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv(rows: UnifiedRow[]): string {
  const headers = [
    "Domaine",
    "Nom",
    "Prénom",
    "Email",
    "Téléphone",
    "Détail",
    "Prix total (€)",
    "Payé (€)",
    "Reste (€)",
    "État",
    "Statut",
  ];
  const lines = [headers.map(csvEscape).join(";")];
  for (const r of rows) {
    lines.push(
      [
        r.domaine === "stages" ? "Stage" : "École",
        r.nom,
        r.prenom,
        r.email,
        r.telephone,
        r.detail,
        r.prixTotal,
        r.totalPaye,
        r.reste,
        etatLabel(r.etat),
        statutLabel(r.statut),
      ]
        .map(csvEscape)
        .join(";"),
    );
  }
  return "﻿" + lines.join("\n");
}

function etatLabel(etat: UnifiedRow["etat"]): string {
  switch (etat) {
    case "solde":
      return "Soldé";
    case "partiel":
      return "Partiel";
    case "a_regler":
      return "À régler";
    case "annule":
      return "Annulé";
  }
}

function etatBadge(etat: UnifiedRow["etat"]): string {
  switch (etat) {
    case "solde":
      return "bg-emerald-50 text-emerald-800 border-emerald-300";
    case "partiel":
      return "bg-blue-50 text-blue-800 border-blue-300";
    case "a_regler":
      return "bg-amber-50 text-amber-800 border-amber-300";
    case "annule":
      return "bg-gray-100 text-gray-600 border-gray-300";
  }
}

function shortDetailStage(s: InscriptionStageRow): string {
  return `${s.semaine_label} · ${s.formule.replace("formule_", "F")}`;
}

function shortDetailEcole(e: InscriptionEcoleRow): string {
  const parts: string[] = [];
  if (e.cours_tennis?.length) parts.push("Tennis : " + e.cours_tennis.join(", "));
  if (e.cours_padel?.length) parts.push("Padel : " + e.cours_padel.join(", "));
  return parts.join(" · ") || "—";
}

export default function Encaissements({
  stages,
  ecole,
  paiementsStages,
  paiementsEcole,
  initialDomaine,
  initialStatus,
}: {
  stages: InscriptionStageRow[];
  ecole: InscriptionEcoleRow[];
  paiementsStages: Record<string, PaiementClient[]>;
  paiementsEcole: Record<string, PaiementClient[]>;
  initialDomaine?: string;
  initialStatus?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [domaine, setDomaine] = useState<Domaine | "tout">(
    initialDomaine === "stages" || initialDomaine === "ecole"
      ? initialDomaine
      : "tout",
  );
  const [status, setStatus] = useState<StatusFilter>(
    (["tout", "a_regler", "partiel", "solde", "annule"] as const).includes(
      initialStatus as StatusFilter,
    )
      ? (initialStatus as StatusFilter)
      : "tout",
  );
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // Construit la liste unifiée
  const unified = useMemo<UnifiedRow[]>(() => {
    const out: UnifiedRow[] = [];
    for (const s of stages) {
      const paye = (paiementsStages[s.id] ?? []).reduce(
        (sum, p) => sum + p.montant,
        0,
      );
      out.push({
        id: s.id,
        domaine: "stages",
        prenom: s.prenom,
        nom: s.nom,
        email: s.email,
        telephone: s.telephone,
        detail: shortDetailStage(s),
        prixTotal: s.prix_total,
        totalPaye: paye,
        reste: Math.max(0, s.prix_total - paye),
        statut: s.statut,
        etat: classifie(s.prix_total, paye, s.statut),
        paiements: paiementsStages[s.id] ?? [],
      });
    }
    for (const e of ecole) {
      const px = e.prix_total ?? 0;
      const paye = (paiementsEcole[e.id] ?? []).reduce(
        (sum, p) => sum + p.montant,
        0,
      );
      out.push({
        id: e.id,
        domaine: "ecole",
        prenom: e.prenom,
        nom: e.nom,
        email: e.email,
        telephone: e.telephone,
        detail: shortDetailEcole(e),
        prixTotal: px,
        totalPaye: paye,
        reste: Math.max(0, px - paye),
        statut: e.statut,
        etat: classifie(px, paye, e.statut),
        paiements: paiementsEcole[e.id] ?? [],
      });
    }
    return out;
  }, [stages, ecole, paiementsStages, paiementsEcole]);

  // Filtres appliqués
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unified.filter((r) => {
      if (domaine !== "tout" && r.domaine !== domaine) return false;
      if (status !== "tout" && r.etat !== status) return false;
      if (q) {
        const hay = `${r.nom} ${r.prenom} ${r.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [unified, domaine, status, search]);

  // Tri par défaut : à régler en premier (plus gros reste d'abord), puis partiel,
  // puis soldé, puis annulé. Au sein de chaque groupe : nom.
  const sorted = useMemo(() => {
    const order: Record<UnifiedRow["etat"], number> = {
      a_regler: 0,
      partiel: 1,
      solde: 2,
      annule: 3,
    };
    return [...filtered].sort((a, b) => {
      if (a.etat !== b.etat) return order[a.etat] - order[b.etat];
      if (a.etat === "a_regler" && b.etat === "a_regler") {
        return b.reste - a.reste;
      }
      return a.nom.localeCompare(b.nom);
    });
  }, [filtered]);

  // Totaux affichés en haut
  const totals = useMemo(() => {
    let totalDu = 0,
      totalPaye = 0,
      totalReste = 0,
      nbAReg = 0,
      nbPartiel = 0,
      nbSolde = 0,
      nbAnnule = 0;
    for (const r of filtered) {
      if (r.etat !== "annule") {
        totalDu += r.prixTotal;
        totalPaye += r.totalPaye;
        totalReste += r.reste;
      }
      if (r.etat === "a_regler") nbAReg++;
      else if (r.etat === "partiel") nbPartiel++;
      else if (r.etat === "solde") nbSolde++;
      else nbAnnule++;
    }
    return { totalDu, totalPaye, totalReste, nbAReg, nbPartiel, nbSolde, nbAnnule };
  }, [filtered]);

  function updateUrlParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "tout") next.set(key, value);
    else next.delete(key);
    next.set("tab", "encaissements");
    router.replace(`/admin?${next.toString()}`, { scroll: false });
  }

  function downloadCsv() {
    const csv = buildCsv(sorted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `encaissements-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* ===== Synthèse ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SyntheseCard
          label="Total dû (actifs)"
          value={`${totals.totalDu}€`}
          color="text-navy"
        />
        <SyntheseCard
          label="Encaissé"
          value={`${totals.totalPaye}€`}
          color="text-emerald-700"
          hint={`${totals.nbSolde} soldé${totals.nbSolde > 1 ? "s" : ""}`}
        />
        <SyntheseCard
          label="Reste à encaisser"
          value={`${totals.totalReste}€`}
          color="text-amber-700"
          hint={`${totals.nbAReg + totals.nbPartiel} en cours`}
        />
        <SyntheseCard
          label="Inscriptions"
          value={`${filtered.length}`}
          color="text-gray-700"
          hint={
            totals.nbAnnule > 0 ? `dont ${totals.nbAnnule} annulé${totals.nbAnnule > 1 ? "s" : ""}` : ""
          }
        />
      </div>

      {/* ===== Filtres ===== */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-3 border-b flex flex-wrap items-center gap-2">
          <FilterPill
            label="Tout"
            active={domaine === "tout"}
            onClick={() => {
              setDomaine("tout");
              updateUrlParam("domaine", "");
            }}
          />
          <FilterPill
            label="Stages"
            active={domaine === "stages"}
            onClick={() => {
              setDomaine("stages");
              updateUrlParam("domaine", "stages");
            }}
          />
          <FilterPill
            label="École"
            active={domaine === "ecole"}
            onClick={() => {
              setDomaine("ecole");
              updateUrlParam("domaine", "ecole");
            }}
          />

          <span className="w-px h-5 bg-gray-300 mx-1" />

          <FilterPill
            label="Tous statuts"
            active={status === "tout"}
            onClick={() => {
              setStatus("tout");
              updateUrlParam("status", "");
            }}
          />
          <FilterPill
            label={`À régler${totals.nbAReg > 0 ? ` (${totals.nbAReg})` : ""}`}
            active={status === "a_regler"}
            tone="amber"
            onClick={() => {
              setStatus("a_regler");
              updateUrlParam("status", "a_regler");
            }}
          />
          <FilterPill
            label={`Partiel${totals.nbPartiel > 0 ? ` (${totals.nbPartiel})` : ""}`}
            active={status === "partiel"}
            tone="blue"
            onClick={() => {
              setStatus("partiel");
              updateUrlParam("status", "partiel");
            }}
          />
          <FilterPill
            label={`Soldé${totals.nbSolde > 0 ? ` (${totals.nbSolde})` : ""}`}
            active={status === "solde"}
            tone="emerald"
            onClick={() => {
              setStatus("solde");
              updateUrlParam("status", "solde");
            }}
          />
          <FilterPill
            label={`Annulé${totals.nbAnnule > 0 ? ` (${totals.nbAnnule})` : ""}`}
            active={status === "annule"}
            tone="gray"
            onClick={() => {
              setStatus("annule");
              updateUrlParam("status", "annule");
            }}
          />

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche nom ou email…"
            className="ml-auto rounded-md border border-gray-300 px-2 py-1.5 text-sm w-48"
          />
          <button
            type="button"
            onClick={downloadCsv}
            disabled={sorted.length === 0}
            className="rounded-md bg-yellow-club text-navy px-3 py-1.5 text-xs font-semibold hover:bg-yellow-hover disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>

        {/* ===== Table ===== */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left p-3 w-24">Type</th>
                <th className="text-left p-3">Personne</th>
                <th className="text-left p-3">Détail</th>
                <th className="text-right p-3 w-20">Total</th>
                <th className="text-right p-3 w-20">Payé</th>
                <th className="text-right p-3 w-20">Reste</th>
                <th className="text-left p-3 w-28">État</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Aucune inscription ne correspond à ces filtres.
                  </td>
                </tr>
              ) : (
                sorted.map((r) => (
                  <EncRow
                    key={`${r.domaine}-${r.id}`}
                    row={r}
                    open={openId === `${r.domaine}-${r.id}`}
                    toggle={() =>
                      setOpenId(
                        openId === `${r.domaine}-${r.id}`
                          ? null
                          : `${r.domaine}-${r.id}`,
                      )
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EncRow({
  row,
  open,
  toggle,
}: {
  row: UnifiedRow;
  open: boolean;
  toggle: () => void;
}) {
  function handleClick(e: React.MouseEvent<HTMLTableRowElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea, label")) return;
    toggle();
  }
  const rowTint =
    row.etat === "a_regler"
      ? "bg-amber-50/30"
      : row.etat === "partiel"
        ? "bg-blue-50/30"
        : row.etat === "annule"
          ? "opacity-60"
          : "";

  return (
    <>
      <tr
        onClick={handleClick}
        className={`border-t cursor-pointer hover:bg-gray-50 transition-colors ${rowTint}`}
      >
        <td className="p-3 text-xs align-top whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            <Chevron open={open} />
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                row.domaine === "stages"
                  ? "bg-gray-50 text-gray-700 border-gray-300"
                  : "bg-gray-50 text-gray-700 border-gray-300"
              }`}
            >
              {row.domaine === "stages" ? "Stage" : "École"}
            </span>
          </span>
        </td>
        <td className="p-3 align-top">
          <div className="font-semibold text-navy">
            {row.prenom} {row.nom}
          </div>
          <div className="text-xs">
            <a
              href={`mailto:${row.email}`}
              className="text-gray-600 hover:text-navy hover:underline"
            >
              {row.email}
            </a>
            {" · "}
            <a
              href={`tel:${row.telephone.replace(/\s/g, "")}`}
              className="text-gray-600 hover:text-navy hover:underline"
            >
              {row.telephone}
            </a>
          </div>
        </td>
        <td className="p-3 text-xs text-gray-700 align-top">{row.detail}</td>
        <td className="p-3 text-right font-bold text-navy align-top whitespace-nowrap">
          {row.prixTotal}€
        </td>
        <td className="p-3 text-right align-top whitespace-nowrap">
          <span className="font-semibold text-emerald-700">
            {row.totalPaye}€
          </span>
        </td>
        <td className="p-3 text-right align-top whitespace-nowrap">
          {row.reste > 0 ? (
            <span className="font-bold text-amber-700">{row.reste}€</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
        <td className="p-3 align-top">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold rounded px-2 py-0.5 border ${etatBadge(row.etat)}`}
          >
            {etatLabel(row.etat)}
          </span>
        </td>
      </tr>
      {open ? (
        <tr className="border-t bg-gray-50/50">
          <td colSpan={7} className="p-4">
            <PaiementsPanel
              inscriptionType={row.domaine}
              inscriptionId={row.id}
              prixTotal={row.prixTotal}
              initial={row.paiements}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`w-3 h-3 text-navy shrink-0 transition-transform ${
        open ? "rotate-90" : ""
      }`}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function SyntheseCard({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color?: string;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
      <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">
        {label}
      </div>
      <div className={`text-2xl font-extrabold ${color ?? "text-navy"}`}>
        {value}
      </div>
      {hint ? <div className="text-[10px] text-gray-500">{hint}</div> : null}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  tone = "navy",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "navy" | "amber" | "blue" | "emerald" | "gray";
}) {
  const activeClass: Record<typeof tone, string> = {
    navy: "bg-navy text-white border-navy",
    amber: "bg-amber-600 text-white border-amber-600",
    blue: "bg-blue-600 text-white border-blue-600",
    emerald: "bg-emerald-600 text-white border-emerald-600",
    gray: "bg-gray-600 text-white border-gray-600",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition ${
        active
          ? activeClass[tone]
          : "bg-white border-gray-300 text-gray-700 hover:border-navy"
      }`}
    >
      {label}
    </button>
  );
}
