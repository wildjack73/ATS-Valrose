import Link from "next/link";
import type { InscriptionStageRow, InscriptionEcoleRow } from "@/lib/types/db";
import type { TarifsBundle } from "@/lib/data/tarifs-types";
import { formuleLabel } from "@/lib/admin/format";
import type { FormuleId } from "@/lib/data/stages";

/** Map id-inscription → total déjà payé (en €). */
type PaiementsTotaux = Map<string, number>;

/**
 * Dashboard "command center" en haut de l'admin :
 * - bloc STAGES (cyan) avec stats + répartition par semaine
 * - bloc ÉCOLE (ocre) avec stats + répartition par cours
 */
export default function DashboardHeader({
  stages,
  ecole,
  bundle,
  paiementsStages,
  paiementsEcole,
}: {
  stages: InscriptionStageRow[];
  ecole: InscriptionEcoleRow[];
  bundle: TarifsBundle | null;
  paiementsStages: PaiementsTotaux;
  paiementsEcole: PaiementsTotaux;
}) {
  // ----- STAGES (chiffres basés sur les paiements RÉELS, hors annulés
  //              ET hors désactivés) -----
  const stagesTotal = stages.length;
  const stagesActifs = stages.filter(
    (s) => s.statut !== "annule" && !s.desactive,
  );
  let stagesEncaisses = 0;
  let stagesAEncaisser = 0;
  let stagesNbSoldes = 0;
  let stagesNbAEncaisser = 0;
  for (const s of stagesActifs) {
    const paye = paiementsStages.get(s.id) ?? 0;
    const reste = Math.max(0, s.prix_total - paye);
    stagesEncaisses += Math.min(paye, s.prix_total);
    stagesAEncaisser += reste;
    if (reste === 0) stagesNbSoldes += 1;
    else stagesNbAEncaisser += 1;
  }

  // Répartition par formule
  const parFormule = new Map<string, number>();
  for (const s of stages) {
    parFormule.set(s.formule, (parFormule.get(s.formule) ?? 0) + 1);
  }

  // ----- ÉCOLE -----
  const ecoleTotal = ecole.length;
  const ecoleActifs = ecole.filter(
    (e) => e.statut !== "annule" && !e.desactive,
  );
  let ecoleEncaisses = 0;
  let ecoleAEncaisser = 0;
  let ecoleNbSoldes = 0;
  let ecoleNbAEncaisser = 0;
  for (const e of ecoleActifs) {
    const px = e.prix_total ?? 0;
    const paye = paiementsEcole.get(e.id) ?? 0;
    const reste = Math.max(0, px - paye);
    ecoleEncaisses += Math.min(paye, px);
    ecoleAEncaisser += reste;
    if (px > 0 && reste === 0) ecoleNbSoldes += 1;
    else if (reste > 0) ecoleNbAEncaisser += 1;
  }

  // Top cours école
  const coursCounts = new Map<string, number>();
  for (const e of ecole) {
    for (const c of e.cours_tennis ?? []) {
      coursCounts.set("tennis:" + c, (coursCounts.get("tennis:" + c) ?? 0) + 1);
    }
    for (const c of e.cours_padel ?? []) {
      coursCounts.set("padel:" + c, (coursCounts.get("padel:" + c) ?? 0) + 1);
    }
    for (const c of e.cours_pickleball ?? []) {
      coursCounts.set(
        "pickleball:" + c,
        (coursCounts.get("pickleball:" + c) ?? 0) + 1,
      );
    }
  }
  const coursLabelById = new Map<string, string>();
  if (bundle) {
    for (const c of bundle.coursTennis) {
      coursLabelById.set("tennis:" + c.code, c.label);
    }
    for (const c of bundle.coursPadel) {
      coursLabelById.set("padel:" + c.code, c.label);
    }
    for (const c of bundle.coursPickleball) {
      coursLabelById.set("pickleball:" + c.code, c.label);
    }
  }
  const topCours = Array.from(coursCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="grid lg:grid-cols-2 gap-4 mb-6">
      {/* ===== STAGES ===== */}
      <section className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm">
        <header className="bg-navy text-white px-5 py-3 border-b border-navy/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/55 font-medium">
                Vacances scolaires
                {bundle ? ` · ${bundle.saisonStages.code}` : ""}
              </p>
              <h2 className="text-lg font-semibold tracking-tight">
                Stages
              </h2>
            </div>
            <Link
              href="/admin?tab=stages"
              className="text-xs text-white/70 hover:text-white px-2 py-1 transition"
            >
              Voir tout →
            </Link>
          </div>
        </header>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <BigStat
              value={stagesTotal}
              label="Inscriptions"
            />
            <BigStat
              value={`${stagesAEncaisser}€`}
              label="À encaisser"
              color="text-amber-700"
              hint={`${stagesNbAEncaisser} à régler`}
              href="/admin?tab=encaissements&domaine=stages&status=a_regler"
            />
            <BigStat
              value={`${stagesEncaisses}€`}
              label="Encaissés"
              color="text-emerald-700"
              hint={`${stagesNbSoldes} soldé${stagesNbSoldes > 1 ? "s" : ""}`}
              href="/admin?tab=encaissements&domaine=stages"
            />
          </div>

          {parFormule.size > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Par formule
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(parFormule.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, count]) => (
                    <span
                      key={code}
                      className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded border border-gray-200"
                    >
                      {formuleLabel(code as FormuleId).replace("Formule ", "F")}{" "}
                      <span className="text-navy font-semibold">×{count}</span>
                    </span>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ===== ÉCOLE ===== */}
      <section className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm">
        <header className="bg-navy text-white px-5 py-3 border-b border-navy/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/55 font-medium">
                Saison annuelle
                {bundle ? ` · ${bundle.saisonEcole.code}` : ""}
              </p>
              <h2 className="text-lg font-semibold tracking-tight">
                École de tennis
              </h2>
            </div>
            <Link
              href="/admin?tab=ecole"
              className="text-xs text-white/70 hover:text-white px-2 py-1 transition"
            >
              Voir tout →
            </Link>
          </div>
        </header>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <BigStat value={ecoleTotal} label="Inscriptions" />
            <BigStat
              value={`${ecoleAEncaisser}€`}
              label="À encaisser"
              color="text-amber-700"
              hint={`${ecoleNbAEncaisser} à régler`}
              href="/admin?tab=encaissements&domaine=ecole&status=a_regler"
            />
            <BigStat
              value={`${ecoleEncaisses}€`}
              label="Encaissés"
              color="text-emerald-700"
              hint={`${ecoleNbSoldes} soldé${ecoleNbSoldes > 1 ? "s" : ""}`}
              href="/admin?tab=encaissements&domaine=ecole"
            />
          </div>

          {topCours.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Cours les plus demandés
              </p>
              <ul className="space-y-1.5">
                {topCours.map(([key, count]) => {
                  const max = topCours[0][1];
                  const pct = (count / max) * 100;
                  const isPadel = key.startsWith("padel:");
                  const label =
                    coursLabelById.get(key) ?? key.replace(/^[^:]+:/, "");
                  return (
                    <li key={key} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 uppercase font-medium tracking-wide w-10">
                          {isPadel ? "Padel" : "Tennis"}
                        </span>
                        <span className="text-gray-700">{label}</span>
                      </span>
                      <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-navy/70"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-navy w-10 text-right tabular-nums">
                        ×{count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Aucune inscription école pour le moment.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function BigStat({
  value,
  label,
  color,
  hint,
  href,
}: {
  value: string | number;
  label: string;
  /** Couleur d'accent légère — par défaut text-navy.
   *  Pour À encaisser / Encaissés : tons sobres (slate / gray + petit indicateur). */
  color?: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">
        {label}
      </p>
      <p className={`text-2xl font-semibold tabular-nums ${color ?? "text-navy"}`}>
        {value}
      </p>
      {hint ? (
        <p className="text-[10px] text-gray-500 mt-0.5">{hint}</p>
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="text-left block rounded-md hover:bg-gray-50 transition px-2 py-1 -mx-2"
      >
        {inner}
      </Link>
    );
  }
  return <div className="text-left">{inner}</div>;
}
