import Link from "next/link";
import {
  fetchStages,
  fetchEcole,
  fetchHistoriqueStages,
  fetchHistoriqueSemaines,
  fetchHistoriqueEcole,
} from "@/lib/admin/queries";
import {
  getActiveSaison,
  getTarifsBundle,
  getSaisonByCode,
  listSaisons,
} from "@/lib/data/tarifs-server";
import StagesTable from "./StagesTable";
import EcoleTable from "./EcoleTable";
import HistoriqueTable from "./HistoriqueTable";
import HistoriqueEcoleTable from "./HistoriqueEcoleTable";
import TarifsEditor from "./TarifsEditor";
import HorairesEditor from "./HorairesEditor";
import CapacitesEditor from "./CapacitesEditor";
import PlanningEcole from "./PlanningEcole";
import DashboardHeader from "./DashboardHeader";
import StagesOrganisation from "./StagesOrganisation";
import CoachesEditor from "./CoachesEditor";
import AVerifier from "./AVerifier";
import { fetchChecksRapport } from "@/lib/admin/checks-queries";
import { fetchJpoEcole } from "@/lib/data/jpo-ecole";
import { fetchPaiementsListByInscriptions } from "@/lib/data/paiements";
import { fetchNiveauxEleves } from "@/lib/data/niveaux-eleves";
import Annuaire from "./Annuaire";
import Encaissements from "./Encaissements";
import {
  IconStages,
  IconEcole,
  IconTarifs,
  IconPlanning,
  IconCoachs,
  IconCheck,
  IconAnnuaire,
  IconArchive,
  IconEncaissements,
  IconPlaces,
} from "./Icons";
import { fetchCapacitesEcole } from "@/lib/data/ecole-capacites";
import { fetchHorairesEcole } from "@/lib/data/horaires-ecole-server";
import { fetchSlotsOccupesEcole } from "@/lib/data/ecole-slots";
import {
  fetchGroupesEcole,
  fetchCoaches,
  fetchInscriptionsSansGroupe,
} from "@/lib/admin/planning-queries";
import {
  fetchStageOrganisation,
  fetchInscriptionsCountByDay,
  fetchEffectifsByDay,
} from "@/lib/admin/stages-org-queries";
import { fetchAnnuaireClients } from "@/lib/admin/annuaire-queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  histo?: string;
  semaine?: string;
  semaineId?: string;
  statut?: string;
  /** code de la saison STAGES à visualiser (sinon active) */
  saisonStages?: string;
  /** code de la saison ÉCOLE à visualiser (sinon active) */
  saisonEcole?: string;
  formule?: string;
  effSem?: string;
  /** Onglet Encaissements */
  domaine?: string;
  status?: string;
  /** Onglet École : filtres complémentaires */
  type?: string;
  cours?: string;
  creneau?: string;
}>;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  try {
  const sp = await searchParams;
  const tab =
    sp.tab === "ecole"
      ? "ecole"
      : sp.tab === "historique"
        ? "historique"
        : sp.tab === "tarifs"
          ? "tarifs"
          : sp.tab === "horaires"
          ? "horaires"
          : sp.tab === "capacites"
          ? "capacites"
          : sp.tab === "planning"
            ? "planning"
            : sp.tab === "stages-org"
              ? "stages-org"
              : sp.tab === "coachs"
                ? "coachs"
                : sp.tab === "a-verifier"
                  ? "a-verifier"
                  : sp.tab === "annuaire"
                    ? "annuaire"
                    : sp.tab === "encaissements"
                      ? "encaissements"
                      : "stages";
  const histo = sp.histo === "ecole" ? "ecole" : "stages";

  // Pour l'onglet Tarifs : on peut visualiser/éditer une saison STAGES et une
  // saison ÉCOLE indépendamment. Si un code est fourni dans l'URL on l'utilise,
  // sinon on prend la saison active du domaine.
  const targetBundlePromise = (async () => {
    const [sStages, sEcole] = await Promise.all([
      sp.saisonStages
        ? getSaisonByCode(sp.saisonStages, "stages").then(
            async (s) => s ?? (await getActiveSaison("stages")),
          )
        : getActiveSaison("stages"),
      sp.saisonEcole
        ? getSaisonByCode(sp.saisonEcole, "ecole").then(
            async (s) => s ?? (await getActiveSaison("ecole")),
          )
        : getActiveSaison("ecole"),
    ]);
    if (!sStages || !sEcole) return null;
    return getTarifsBundle({
      saisonStagesId: sStages.id,
      saisonEcoleId: sEcole.id,
    });
  })();

  const [
    stages,
    ecole,
    historique,
    historiqueSemaines,
    historiqueEcole,
    bundle,
    saisonsStages,
    saisonsEcole,
    coaches,
  ] = await Promise.all([
    fetchStages({ semaine: sp.semaine, statut: sp.statut, formule: sp.formule }),
    fetchEcole({ statut: sp.statut }),
    fetchHistoriqueStages({ semaine: sp.semaine }),
    fetchHistoriqueSemaines(),
    fetchHistoriqueEcole(),
    targetBundlePromise,
    listSaisons("stages"),
    listSaisons("ecole"),
    fetchCoaches(),
  ]);

  // Pour l'onglet Encaissements : on a besoin de TOUS les stages + école sans
  // filtre statut (sinon l'onglet hérite des filtres de l'onglet précédent).
  const [stagesAll, ecoleAll] =
    tab === "encaissements"
      ? await Promise.all([fetchStages({}), fetchEcole({})])
      : [stages, ecole];

  // Paiements : charger en parallèle pour les inscriptions actives stages/école.
  // On hydrate ainsi chaque panneau "💰 Paiements" sans round-trip réseau.
  // L'onglet encaissements utilise la version "all" → on dédoublonne les ids.
  const allStagesIds = Array.from(
    new Set([...stages.map((r) => r.id), ...stagesAll.map((r) => r.id)]),
  );
  const allEcoleIds = Array.from(
    new Set([...ecole.map((r) => r.id), ...ecoleAll.map((r) => r.id)]),
  );
  const [paiementsStagesMap, paiementsEcoleMap, niveauxElevesMap] =
    await Promise.all([
      fetchPaiementsListByInscriptions("stages", allStagesIds),
      fetchPaiementsListByInscriptions("ecole", allEcoleIds),
      fetchNiveauxEleves(),
    ]);
  // Map élève → niveau attribué, sérialisable en plain object pour les
  // composants client.
  const niveauxEleves = Object.fromEntries(niveauxElevesMap);

  // Maps id → total payé (€) pour le dashboard
  const paiementsStagesTotaux = new Map<string, number>();
  for (const [id, list] of paiementsStagesMap) {
    paiementsStagesTotaux.set(
      id,
      list.reduce((sum, p) => sum + p.montant, 0),
    );
  }
  const paiementsEcoleTotaux = new Map<string, number>();
  for (const [id, list] of paiementsEcoleMap) {
    paiementsEcoleTotaux.set(
      id,
      list.reduce((sum, p) => sum + p.montant, 0),
    );
  }

  // Planning : on charge groupes + non-placés seulement si l'onglet est actif
  const planningData =
    tab === "planning" && bundle
      ? await Promise.all([
          fetchGroupesEcole(bundle.saisonEcole.id),
          fetchInscriptionsSansGroupe(bundle.saisonEcole.id),
        ])
      : null;

  // Annuaire : charger seulement si onglet actif
  const annuaireData =
    tab === "annuaire" ? await fetchAnnuaireClients() : null;

  // À vérifier : charger seulement si onglet actif
  const aVerifierRapport =
    tab === "a-verifier" ? await fetchChecksRapport() : null;

  // JPO école : pour l'onglet Tarifs, on charge la config liée à la saison école active du bundle
  const jpoEcole =
    tab === "tarifs" && bundle
      ? await fetchJpoEcole(bundle.saisonEcole.id)
      : null;

  // Horaires exacts (cours tennis jeunes) : nécessaires à l'onglet Horaires
  // (édition) ET à l'onglet École (menu déroulant horaire par élève).
  const horairesEcole =
    (tab === "horaires" || tab === "ecole") && bundle
      ? await fetchHorairesEcole(bundle.saisonEcole.id)
      : null;

  // Capacités créneaux école : charger seulement si l'onglet est actif
  // (capacités éditées + occupation actuelle de chaque créneau).
  const [capacitesEcole, slotsOccupesEcole] =
    tab === "capacites" && bundle
      ? await Promise.all([
          fetchCapacitesEcole(bundle.saisonEcole.id),
          fetchSlotsOccupesEcole(bundle.saisonEcole.id),
        ])
      : [null, null];

  // Stages organisation : charger coachs + compteurs + effectifs (qui est là)
  // pour la semaine sélectionnée
  const stageOrgData =
    tab === "stages-org" && bundle && sp.semaineId
      ? await (async () => {
          const semaine = bundle.semaines.find((s) => s.id === sp.semaineId);
          if (!semaine) return null;
          const [org, counts, effectifs] = await Promise.all([
            fetchStageOrganisation(semaine.id),
            fetchInscriptionsCountByDay(semaine.code),
            fetchEffectifsByDay(semaine.code),
          ]);
          return { semaine, org, counts, effectifs };
        })()
      : null;

  const totalArchives = historique.length + historiqueEcole.length;

  return (
    <>
      <div className="no-print">
        <DashboardHeader
          stages={stages}
          ecole={ecole}
          bundle={bundle}
          paiementsStages={paiementsStagesTotaux}
          paiementsEcole={paiementsEcoleTotaux}
        />
      </div>

      <div className="flex items-center gap-1 mb-6 overflow-x-auto no-print pb-1 border-b border-gray-200">
        <TabLink
          active={tab === "stages"}
          href="/admin?tab=stages"
          icon={<IconStages />}
        >
          Stages <span className="opacity-60">({stages.length})</span>
        </TabLink>
        <TabLink
          active={tab === "ecole"}
          href="/admin?tab=ecole"
          icon={<IconEcole />}
        >
          École <span className="opacity-60">({ecole.length})</span>
        </TabLink>
        <TabLink
          active={tab === "encaissements"}
          href="/admin?tab=encaissements"
          icon={<IconEncaissements />}
        >
          Encaissements
        </TabLink>
        <TabLink
          active={tab === "tarifs"}
          href="/admin?tab=tarifs"
          icon={<IconTarifs />}
        >
          Tarifs
        </TabLink>
        <TabLink
          active={tab === "horaires"}
          href="/admin?tab=horaires"
          icon={<IconTarifs />}
        >
          Horaires
        </TabLink>
        <TabLink
          active={tab === "capacites"}
          href="/admin?tab=capacites"
          icon={<IconPlaces />}
        >
          Places
        </TabLink>
        <TabLink
          active={tab === "planning"}
          href="/admin?tab=planning"
          icon={<IconPlanning />}
        >
          Planning École
        </TabLink>
        <TabLink
          active={tab === "stages-org"}
          href="/admin?tab=stages-org"
          icon={<IconPlanning />}
        >
          Organisation Stages
        </TabLink>
        <TabLink
          active={tab === "coachs"}
          href="/admin?tab=coachs"
          icon={<IconCoachs />}
        >
          Coachs
        </TabLink>
        <TabLink
          active={tab === "a-verifier"}
          href="/admin?tab=a-verifier"
          icon={<IconCheck />}
        >
          À vérifier
        </TabLink>
        <TabLink
          active={tab === "annuaire"}
          href="/admin?tab=annuaire"
          icon={<IconAnnuaire />}
        >
          Annuaire
        </TabLink>
        <TabLink
          active={tab === "historique"}
          href="/admin?tab=historique"
          icon={<IconArchive />}
        >
          Archives <span className="opacity-60">({totalArchives})</span>
        </TabLink>
      </div>

      {tab === "stages" ? (
        <StagesTable
          rows={stages}
          semaines={bundle?.semaines ?? []}
          optionsF4={bundle?.optionsF4 ?? []}
          paiementsByInscription={Object.fromEntries(paiementsStagesMap)}
          niveauxEleves={niveauxEleves}
          currentSemaine={sp.semaine}
          currentStatut={sp.statut}
          currentFormule={sp.formule}
        />
      ) : tab === "ecole" ? (
        <EcoleTable
          rows={ecole}
          paiementsByInscription={Object.fromEntries(paiementsEcoleMap)}
          coursTennis={bundle?.coursTennis ?? []}
          coursPadel={bundle?.coursPadel ?? []}
          coursPickleball={bundle?.coursPickleball ?? []}
          horaires={horairesEcole ?? {}}
          niveauxEleves={niveauxEleves}
          currentStatut={sp.statut}
          currentType={sp.type}
          currentCours={sp.cours}
          currentCreneau={sp.creneau}
        />
      ) : tab === "tarifs" ? (
        bundle ? (
          <TarifsEditor
            bundle={bundle}
            saisonsStages={saisonsStages}
            saisonsEcole={saisonsEcole}
            jpoEcole={jpoEcole}
          />
        ) : (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5 text-sm">
            Aucune saison configurée. Exécute{" "}
            <code className="bg-white px-1 rounded">supabase/seed-2026-2027.sql</code>{" "}
            dans Supabase.
          </div>
        )
      ) : tab === "horaires" ? (
        bundle ? (
          <HorairesEditor initial={horairesEcole ?? {}} />
        ) : (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5 text-sm">
            Aucune saison active pour gérer les horaires.
          </div>
        )
      ) : tab === "capacites" ? (
        bundle ? (
          <CapacitesEditor
            saisonId={bundle.saisonEcole.id}
            saisonLabel={bundle.saisonEcole.label}
            capacites={capacitesEcole ?? {}}
            slotsOccupes={slotsOccupesEcole ?? {}}
          />
        ) : (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5 text-sm">
            Aucune saison active pour gérer les places.
          </div>
        )
      ) : tab === "planning" ? (
        bundle && planningData ? (
          <PlanningEcole
            saisonId={bundle.saisonEcole.id}
            groupes={planningData[0]}
            coaches={coaches}
            inscriptionsSansGroupe={planningData[1]}
          />
        ) : (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5 text-sm">
            Aucune saison active pour gérer le planning.
          </div>
        )
      ) : tab === "coachs" ? (
        <CoachesEditor coaches={coaches} />
      ) : tab === "a-verifier" ? (
        aVerifierRapport ? (
          <AVerifier rapport={aVerifierRapport} />
        ) : null
      ) : tab === "annuaire" ? (
        <Annuaire clients={annuaireData ?? []} niveauxEleves={niveauxEleves} />
      ) : tab === "encaissements" ? (
        <Encaissements
          stages={stagesAll}
          ecole={ecoleAll}
          paiementsStages={Object.fromEntries(paiementsStagesMap)}
          paiementsEcole={Object.fromEntries(paiementsEcoleMap)}
          initialDomaine={sp.domaine}
          initialStatus={sp.status}
        />
      ) : tab === "stages-org" ? (
        bundle ? (
          <StagesOrganisation
            semaines={bundle.semaines}
            currentSemaineId={stageOrgData?.semaine.id}
            coaches={coaches}
            organisation={
              stageOrgData
                ? Object.fromEntries(stageOrgData.org.byKey.entries())
                : {}
            }
            inscriptionsCount={
              stageOrgData?.counts ?? { total: 0, matin: {}, apresMidi: {} }
            }
            effectifs={stageOrgData?.effectifs ?? null}
          />
        ) : (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5 text-sm">
            Aucune saison active.
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <SubLink
              active={histo === "stages"}
              href="/admin?tab=historique&histo=stages"
            >
              Stages ({historique.length})
            </SubLink>
            <SubLink
              active={histo === "ecole"}
              href="/admin?tab=historique&histo=ecole"
            >
              École ({historiqueEcole.length})
            </SubLink>
          </div>
          {histo === "stages" ? (
            <HistoriqueTable
              rows={historique}
              semaines={historiqueSemaines}
              niveauxEleves={niveauxEleves}
              currentSemaine={sp.semaine}
            />
          ) : (
            <HistoriqueEcoleTable
              rows={historiqueEcole}
              niveauxEleves={niveauxEleves}
            />
          )}
        </div>
      )}
    </>
  );
  } catch (err) {
    console.error("[admin] Erreur critique:", err);
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-navy mb-2">
            Données temporairement indisponibles
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            Réessayez dans quelques secondes.
          </p>
          <a
            href="/admin"
            className="rounded-lg bg-navy text-white px-4 py-2 text-sm font-semibold hover:bg-navy-dark"
          >
            Réessayer
          </a>
        </div>
      </div>
    );
  }
}

/** Onglet sobre, style « tab underline » (Linear / Stripe Dashboard) :
 *  pas de couleur de marque, juste un trait actif navy et un hover gris. */
function TabLink({
  active,
  href,
  children,
  icon,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3.5 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
        active
          ? "border-navy text-navy font-semibold"
          : "border-transparent text-gray-500 hover:text-navy hover:border-gray-300"
      }`}
    >
      <span aria-hidden className={active ? "text-navy" : "text-gray-400"}>
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  );
}

function SubLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
        active
          ? "bg-navy text-white"
          : "bg-white border border-gray-200 text-gray-600 hover:border-navy"
      }`}
    >
      {children}
    </Link>
  );
}
