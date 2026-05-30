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
  // ----- STAGES (chiffres basés sur les paiements RÉELS, hors annulés) -----
  const stagesTotal = stages.length;
  const stagesActifs = stages.filter((s) => s.statut !== "annule");
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

  // Top semaines (les 5 avec le plus d'inscriptions)
  const stagesParSemaine = new Map<
    string,
    { count: number; total: number; label: string }
  >();
  for (const s of stages) {
    const existing = stagesParSemaine.get(s.semaine) ?? {
      count: 0,
      total: 0,
      label: s.semaine_label,
    };
    stagesParSemaine.set(s.semaine, {
      count: existing.count + 1,
      total: existing.total + s.prix_total,
      label: s.semaine_label,
    });
  }
  const topSemaines = Array.from(stagesParSemaine.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  // Répartition par formule
  const parFormule = new Map<string, number>();
  for (const s of stages) {
    parFormule.set(s.formule, (parFormule.get(s.formule) ?? 0) + 1);
  }

  // ----- ÉCOLE -----
  const ecoleTotal = ecole.length;
  const ecoleActifs = ecole.filter((e) => e.statut !== "annule");
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
  }
  const coursLabelById = new Map<string, string>();
  if (bundle) {
    for (const c of bundle.coursTennis) {
      coursLabelById.set("tennis:" + c.code, c.label);
    }
    for (const c of bundle.coursPadel) {
      coursLabelById.set("padel:" + c.code, c.label);
    }
  }
  const topCours = Array.from(coursCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="grid lg:grid-cols-2 gap-4 mb-6">
      {/* ===== STAGES (cyan) ===== */}
      <section className="rounded-2xl overflow-hidden bg-white border-2 border-cyan-club/30 shadow-sm">
        <header className="bg-gradient-to-r from-navy via-navy to-cyan-club text-white px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-cyan-light font-bold">
                Vacances scolaires
                {bundle ? ` · Saison ${bundle.saisonStages.code}` : ""}
              </p>
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                🎾 Stages
              </h2>
            </div>
            <Link
              href="/admin?tab=stages"
              className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded font-semibold"
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
              color="text-navy"
            />
            <BigStat
              value={`${stagesAEncaisser}€`}
              label="À encaisser"
              color="text-orange-700"
              hint={`${stagesNbAEncaisser} à régler`}
              href="/admin?tab=encaissements&domaine=stages&status=a_regler"
            />
            <BigStat
              value={`${stagesEncaisses}€`}
              label="Encaissés"
              color="text-green-700"
              hint={`${stagesNbSoldes} soldé${stagesNbSoldes > 1 ? "s" : ""}`}
              href="/admin?tab=encaissements&domaine=stages"
            />
          </div>

          {topSemaines.length > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 mb-2">
                Top semaines
              </p>
              <ul className="space-y-1.5">
                {topSemaines.map(([code, data]) => {
                  const max = topSemaines[0][1].count;
                  const pct = (data.count / max) * 100;
                  return (
                    <li
                      key={code}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Link
                        href={`/admin?tab=stages&semaine=${code}`}
                        className="flex-1 truncate hover:text-navy"
                      >
                        {data.label}
                      </Link>
                      <div className="w-24 h-2 rounded bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-cyan-club"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-navy w-16 text-right">
                        {data.count} · {data.total}€
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Aucune inscription stage pour le moment.
            </p>
          )}

          {parFormule.size > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 mb-2">
                Par formule
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(parFormule.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, count]) => (
                    <span
                      key={code}
                      className="bg-cyan-club/10 text-navy text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ring-cyan-club/30"
                    >
                      {formuleLabel(code as FormuleId).replace("Formule ", "F")}{" "}
                      <strong>×{count}</strong>
                    </span>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ===== ÉCOLE (ocre) ===== */}
      <section className="rounded-2xl overflow-hidden bg-white border-2 border-ocre/30 shadow-sm">
        <header className="bg-gradient-to-r from-clay via-ocre to-ocre-light text-white px-5 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-yellow-200 font-bold">
                Saison annuelle
                {bundle ? ` · ${bundle.saisonEcole.code}` : ""}
              </p>
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                🏫 École de tennis
              </h2>
            </div>
            <Link
              href="/admin?tab=ecole"
              className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded font-semibold"
            >
              Voir tout →
            </Link>
          </div>
        </header>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <BigStat value={ecoleTotal} label="Inscriptions" color="text-navy" />
            <BigStat
              value={`${ecoleAEncaisser}€`}
              label="À encaisser"
              color="text-orange-700"
              hint={`${ecoleNbAEncaisser} à régler`}
              href="/admin?tab=encaissements&domaine=ecole&status=a_regler"
            />
            <BigStat
              value={`${ecoleEncaisses}€`}
              label="Encaissés"
              color="text-green-700"
              hint={`${ecoleNbSoldes} soldé${ecoleNbSoldes > 1 ? "s" : ""}`}
              href="/admin?tab=encaissements&domaine=ecole"
            />
          </div>

          {topCours.length > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 mb-2">
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
                      <span className="flex-1 truncate flex items-center gap-1">
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full ${
                            isPadel ? "bg-purple-500" : "bg-ocre"
                          }`}
                        />
                        {label}
                      </span>
                      <div className="w-24 h-2 rounded bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full ${isPadel ? "bg-purple-500" : "bg-ocre"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-navy w-10 text-right">
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
  color?: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className={`text-3xl font-extrabold ${color ?? "text-navy"}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">
        {label}
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
        className="text-center block rounded-lg hover:bg-gray-50 transition py-1 -my-1"
      >
        {inner}
      </Link>
    );
  }
  return <div className="text-center">{inner}</div>;
}
