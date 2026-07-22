import { notFound } from "next/navigation";
import {
  fetchStageOrganisation,
  fetchInscriptionsCountByDay,
  fetchEffectifsByDay,
  type EnfantEffectif,
  type EffectifsJour,
} from "@/lib/admin/stages-org-queries";
import { planningTokenValide, fetchSemainesAout } from "@/lib/planning-public";
import type { Coach } from "@/lib/data/planning-types";

// Rendu à chaque requête : page à très faible trafic (encadrants), et surtout
// on ne veut PAS mettre en cache un échec transitoire pendant 60 s.
export const dynamic = "force-dynamic";

// Page « secrète » : jamais indexée, jamais suivie.
export const metadata = {
  title: "Organisation stages — Août",
  robots: { index: false, follow: false, nocache: true },
};

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

export default async function PlanningStagesPublic({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!planningTokenValide(token)) notFound();

  const semaines = await fetchSemainesAout();
  if (semaines.length === 0) {
    return (
      <Shell>
        <p className="text-gray-600">
          Aucune semaine de stage en août n&apos;a pu être chargée. Rechargez la
          page dans quelques secondes.
        </p>
      </Shell>
    );
  }

  const data = await Promise.all(
    semaines.map(async (s) => {
      const [org, counts, effectifs] = await Promise.all([
        fetchStageOrganisation(s.id),
        fetchInscriptionsCountByDay(s.code),
        fetchEffectifsByDay(s.code),
      ]);
      return { semaine: s, org, counts, effectifs };
    }),
  );

  return (
    <Shell>
      {data.map(({ semaine, org, counts, effectifs }) => {
        const organisation = Object.fromEntries(org.byKey.entries());
        return (
          <section key={semaine.id} className="mb-10 break-inside-avoid">
            <header className="rounded-t-xl bg-gradient-to-r from-navy via-navy to-cyan-club text-white px-5 py-3">
              <h2 className="text-lg font-extrabold">
                {semaine.periode} — {semaine.label}
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                {counts.total} inscription{counts.total > 1 ? "s" : ""} sur la
                semaine
              </p>
            </header>

            {/* Organisation des coachs */}
            <div className="overflow-x-auto border border-t-0 border-gray-200 bg-white">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="px-2 py-2 border text-left">Jour</th>
                    <th className="px-2 py-2 border text-center w-12">Matin</th>
                    <th className="px-2 py-2 border text-left">Profs matin</th>
                    <th className="px-2 py-2 border text-left">
                      Sports collectifs
                    </th>
                    <th className="px-2 py-2 border text-left">Repas</th>
                    <th className="px-2 py-2 border text-center w-12">
                      Après-midi
                    </th>
                    <th className="px-2 py-2 border text-left">
                      Profs après-midi
                    </th>
                    <th className="px-2 py-2 border text-left">
                      Sports collectifs
                    </th>
                    <th className="px-2 py-2 border text-left">Soir</th>
                  </tr>
                </thead>
                <tbody>
                  {JOURS.map((j) => (
                    <tr key={j.id} className="even:bg-gray-50/60">
                      <td className="px-2 py-2 border font-bold bg-navy/5 text-navy whitespace-nowrap">
                        {j.label}
                      </td>
                      <td className="px-2 py-2 border text-center font-bold">
                        {counts.matin[j.id] ?? 0}
                      </td>
                      <Coachs assigned={organisation[`${j.id}|matin`]} />
                      <Coachs
                        assigned={
                          organisation[`${j.id}|sport_collectifs_matin`]
                        }
                      />
                      <Coachs assigned={organisation[`${j.id}|repas`]} />
                      <td className="px-2 py-2 border text-center font-bold">
                        {counts.apresMidi[j.id] ?? 0}
                      </td>
                      <Coachs assigned={organisation[`${j.id}|apres_midi`]} />
                      <Coachs
                        assigned={
                          organisation[`${j.id}|sport_collectifs_apres_midi`]
                        }
                      />
                      <Coachs assigned={organisation[`${j.id}|soir`]} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Détail nominatif par jour */}
            {effectifs ? (
              <div className="mt-4 space-y-3">
                {JOURS.map((j) => {
                  const d: EffectifsJour | undefined = effectifs.jours[j.id];
                  if (!d) return null;
                  if (
                    d.matin.length === 0 &&
                    d.apresMidi.length === 0 &&
                    d.repas.length === 0
                  ) {
                    return null;
                  }
                  return (
                    <section
                      key={j.id}
                      className="rounded-xl border border-gray-200 bg-white overflow-hidden break-inside-avoid"
                    >
                      <header className="bg-gray-50 border-b px-4 py-2">
                        <h3 className="font-bold text-navy text-sm">
                          {j.label}
                        </h3>
                      </header>
                      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                        <ColonneEnfants
                          titre="🌅 Matin"
                          couleur="text-cyan-club"
                          enfants={d.matin}
                        />
                        <ColonneEnfants
                          titre="🌇 Après-midi"
                          couleur="text-ocre-dark"
                          enfants={d.apresMidi}
                        />
                        <ColonneEnfants
                          titre="🍽️ Repas"
                          couleur="text-emerald-600"
                          enfants={d.repas}
                        />
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy">
            ATS Valrose — Organisation des stages
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Mois d&apos;août · document interne réservé aux encadrants
          </p>
          <p className="text-[11px] text-gray-400 mt-2">
            Ce lien est privé : merci de ne pas le diffuser en dehors de
            l&apos;équipe encadrante.
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}

/** Cellule coachs en lecture seule (pastilles colorées). */
function Coachs({
  assigned,
}: {
  assigned?: { id: string; coach: Coach | null }[];
}) {
  const list = (assigned ?? []).filter((a) => a.coach);
  return (
    <td className="px-2 py-2 border align-top">
      {list.length === 0 ? (
        <span className="text-gray-300">—</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {list.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: a.coach?.couleur ?? "#0d2e3f" }}
            >
              {a.coach?.nom}
            </span>
          ))}
        </div>
      )}
    </td>
  );
}

function ColonneEnfants({
  titre,
  couleur,
  enfants,
}: {
  titre: string;
  couleur: string;
  enfants: EnfantEffectif[];
}) {
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
            <li key={i} className="flex items-start gap-1.5 text-xs">
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
