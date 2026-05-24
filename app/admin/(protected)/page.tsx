import Link from "next/link";
import {
  fetchStages,
  fetchEcole,
  fetchHistoriqueStages,
  fetchHistoriqueSemaines,
  fetchHistoriqueEcole,
} from "@/lib/admin/queries";
import {
  getActiveTarifsBundle,
  getTarifsBundle,
  getSaisonByCode,
  listSaisons,
} from "@/lib/data/tarifs-server";
import StagesTable from "./StagesTable";
import EcoleTable from "./EcoleTable";
import HistoriqueTable from "./HistoriqueTable";
import HistoriqueEcoleTable from "./HistoriqueEcoleTable";
import TarifsEditor from "./TarifsEditor";
import PlanningEcole from "./PlanningEcole";
import DashboardHeader from "./DashboardHeader";
import StagesOrganisation from "./StagesOrganisation";
import Annuaire from "./Annuaire";
import {
  fetchGroupesEcole,
  fetchCoaches,
  fetchInscriptionsSansGroupe,
} from "@/lib/admin/planning-queries";
import {
  fetchStageOrganisation,
  fetchInscriptionsCountByDay,
} from "@/lib/admin/stages-org-queries";
import { fetchAnnuaireClients } from "@/lib/admin/annuaire-queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  histo?: string;
  semaine?: string;
  semaineId?: string;
  statut?: string;
  saison?: string;
}>;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const tab =
    sp.tab === "ecole"
      ? "ecole"
      : sp.tab === "historique"
        ? "historique"
        : sp.tab === "tarifs"
          ? "tarifs"
          : sp.tab === "planning"
            ? "planning"
            : sp.tab === "stages-org"
              ? "stages-org"
              : sp.tab === "annuaire"
                ? "annuaire"
                : "stages";
  const histo = sp.histo === "ecole" ? "ecole" : "stages";

  // Pour l'onglet Tarifs : permettre de visualiser/éditer n'importe quelle saison
  const targetSaisonPromise = sp.saison
    ? getSaisonByCode(sp.saison).then((s) =>
        s ? getTarifsBundle(s.id) : getActiveTarifsBundle(),
      )
    : getActiveTarifsBundle();

  const [
    stages,
    ecole,
    historique,
    historiqueSemaines,
    historiqueEcole,
    bundle,
    saisons,
    coaches,
  ] = await Promise.all([
    fetchStages({ semaine: sp.semaine, statut: sp.statut }),
    fetchEcole({ statut: sp.statut }),
    fetchHistoriqueStages({ semaine: sp.semaine }),
    fetchHistoriqueSemaines(),
    fetchHistoriqueEcole(),
    targetSaisonPromise,
    listSaisons(),
    fetchCoaches(),
  ]);

  // Planning : on charge groupes + non-placés seulement si l'onglet est actif
  const planningData =
    tab === "planning" && bundle
      ? await Promise.all([
          fetchGroupesEcole(bundle.saison.id),
          fetchInscriptionsSansGroupe(bundle.saison.id),
        ])
      : null;

  // Annuaire : charger seulement si onglet actif
  const annuaireData =
    tab === "annuaire" ? await fetchAnnuaireClients() : null;

  // Stages organisation : charger seulement si onglet actif + semaine choisie
  const stageOrgData =
    tab === "stages-org" && bundle && sp.semaineId
      ? await (async () => {
          const semaine = bundle.semaines.find((s) => s.id === sp.semaineId);
          if (!semaine) return null;
          const [org, counts] = await Promise.all([
            fetchStageOrganisation(semaine.id),
            fetchInscriptionsCountByDay(semaine.code),
          ]);
          return { semaine, org, counts };
        })()
      : null;

  const totalArchives = historique.length + historiqueEcole.length;

  return (
    <>
      <div className="no-print">
        <DashboardHeader stages={stages} ecole={ecole} bundle={bundle} />
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-print">
        <TabLink
          active={tab === "stages"}
          href="/admin?tab=stages"
          accent="cyan"
        >
          Stages ({stages.length})
        </TabLink>
        <TabLink
          active={tab === "ecole"}
          href="/admin?tab=ecole"
          accent="ocre"
        >
          École ({ecole.length})
        </TabLink>
        <TabLink
          active={tab === "historique"}
          href="/admin?tab=historique"
          accent="navy"
        >
          Archives ({totalArchives})
        </TabLink>
        <TabLink
          active={tab === "tarifs"}
          href="/admin?tab=tarifs"
          accent="yellow"
        >
          Tarifs
        </TabLink>
        <TabLink
          active={tab === "stages-org"}
          href="/admin?tab=stages-org"
          accent="cyan"
        >
          Organisation Stages
        </TabLink>
        <TabLink
          active={tab === "annuaire"}
          href="/admin?tab=annuaire"
          accent="navy"
        >
          Annuaire
        </TabLink>
        {/* Planning École masqué pour le moment — réactivable en décommentant
        <TabLink
          active={tab === "planning"}
          href="/admin?tab=planning"
          accent="ocre"
        >
          Planning École
        </TabLink>
        */}
      </div>

      {tab === "stages" ? (
        <StagesTable
          rows={stages}
          semaines={bundle?.semaines ?? []}
          currentSemaine={sp.semaine}
          currentStatut={sp.statut}
        />
      ) : tab === "ecole" ? (
        <EcoleTable rows={ecole} currentStatut={sp.statut} />
      ) : tab === "tarifs" ? (
        bundle ? (
          <TarifsEditor bundle={bundle} saisons={saisons} />
        ) : (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5 text-sm">
            Aucune saison configurée. Exécute{" "}
            <code className="bg-white px-1 rounded">supabase/seed-2026-2027.sql</code>{" "}
            dans Supabase.
          </div>
        )
      ) : tab === "planning" ? (
        bundle && planningData ? (
          <PlanningEcole
            saisonId={bundle.saison.id}
            groupes={planningData[0]}
            coaches={coaches}
            inscriptionsSansGroupe={planningData[1]}
          />
        ) : (
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5 text-sm">
            Aucune saison active pour gérer le planning.
          </div>
        )
      ) : tab === "annuaire" ? (
        <Annuaire clients={annuaireData ?? []} />
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
              currentSemaine={sp.semaine}
            />
          ) : (
            <HistoriqueEcoleTable rows={historiqueEcole} />
          )}
        </div>
      )}
    </>
  );
}

function TabLink({
  active,
  href,
  children,
  accent,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
  accent?: "cyan" | "ocre" | "navy" | "yellow";
}) {
  const activeColor =
    accent === "cyan"
      ? "border-cyan-club text-cyan-club"
      : accent === "ocre"
        ? "border-ocre text-ocre"
        : accent === "yellow"
          ? "border-yellow-hover text-yellow-hover"
          : "border-navy text-navy";
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-t-lg text-sm font-semibold whitespace-nowrap transition-colors ${
        active
          ? `bg-white border-x border-t border-b-2 ${activeColor}`
          : "text-gray-500 hover:text-navy hover:bg-white/50"
      }`}
    >
      {children}
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
