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
  fetchEffectifsByDay,
} from "@/lib/admin/stages-org-queries";
import EffectifsJour from "./EffectifsJour";
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
              : sp.tab === "effectifs"
                ? "effectifs"
                : sp.tab === "annuaire"
                  ? "annuaire"
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

  // Effectifs par jour : charger seulement si onglet actif + semaine choisie
  const effectifsData =
    tab === "effectifs" && sp.effSem
      ? await fetchEffectifsByDay(sp.effSem)
      : null;

  const totalArchives = historique.length + historiqueEcole.length;

  return (
    <>
      <div className="no-print">
        <DashboardHeader stages={stages} ecole={ecole} bundle={bundle} />
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-print pb-1">
        <TabLink
          active={tab === "stages"}
          href="/admin?tab=stages"
          accent="cyan"
          icon="🎾"
        >
          Stages ({stages.length})
        </TabLink>
        <TabLink
          active={tab === "ecole"}
          href="/admin?tab=ecole"
          accent="ocre"
          icon="🏫"
        >
          École ({ecole.length})
        </TabLink>
        <TabLink
          active={tab === "tarifs"}
          href="/admin?tab=tarifs"
          accent="yellow"
          icon="💶"
        >
          Tarifs
        </TabLink>
        <TabLink
          active={tab === "stages-org"}
          href="/admin?tab=stages-org"
          accent="emerald"
          icon="📋"
        >
          Organisation Stages
        </TabLink>
        <TabLink
          active={tab === "effectifs"}
          href="/admin?tab=effectifs"
          accent="cyan"
          icon="👥"
        >
          Effectifs / jour
        </TabLink>
        <TabLink
          active={tab === "annuaire"}
          href="/admin?tab=annuaire"
          accent="violet"
          icon="📇"
        >
          Annuaire
        </TabLink>
        <TabLink
          active={tab === "historique"}
          href="/admin?tab=historique"
          accent="gray"
          icon="📦"
        >
          Archives ({totalArchives})
        </TabLink>
        {/* Planning École masqué pour le moment — réactivable en décommentant
        <TabLink
          active={tab === "planning"}
          href="/admin?tab=planning"
          accent="ocre"
          icon="📅"
        >
          Planning École
        </TabLink>
        */}
      </div>

      {tab === "stages" ? (
        <StagesTable
          rows={stages}
          semaines={bundle?.semaines ?? []}
          optionsF4={bundle?.optionsF4 ?? []}
          currentSemaine={sp.semaine}
          currentStatut={sp.statut}
          currentFormule={sp.formule}
        />
      ) : tab === "ecole" ? (
        <EcoleTable rows={ecole} currentStatut={sp.statut} />
      ) : tab === "tarifs" ? (
        bundle ? (
          <TarifsEditor
            bundle={bundle}
            saisonsStages={saisonsStages}
            saisonsEcole={saisonsEcole}
          />
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
      ) : tab === "effectifs" ? (
        bundle ? (
          <EffectifsJour
            semaines={bundle.semaines}
            currentSemaineCode={sp.effSem}
            data={effectifsData}
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

type AccentKey = "cyan" | "ocre" | "yellow" | "emerald" | "violet" | "gray";

const ACCENT_STYLES: Record<
  AccentKey,
  {
    activeBg: string;
    activeText: string;
    activeShadow: string;
    iconText: string;
    hoverBorder: string;
    hoverText: string;
  }
> = {
  cyan: {
    activeBg: "bg-cyan-club",
    activeText: "text-white",
    activeShadow: "shadow-cyan-club/40",
    iconText: "text-cyan-club",
    hoverBorder: "hover:border-cyan-club",
    hoverText: "hover:text-cyan-club",
  },
  ocre: {
    activeBg: "bg-ocre",
    activeText: "text-white",
    activeShadow: "shadow-ocre/40",
    iconText: "text-ocre-dark",
    hoverBorder: "hover:border-ocre",
    hoverText: "hover:text-ocre-dark",
  },
  yellow: {
    activeBg: "bg-yellow-club",
    activeText: "text-navy",
    activeShadow: "shadow-yellow-club/40",
    iconText: "text-yellow-hover",
    hoverBorder: "hover:border-yellow-club",
    hoverText: "hover:text-yellow-hover",
  },
  emerald: {
    activeBg: "bg-emerald-600",
    activeText: "text-white",
    activeShadow: "shadow-emerald-600/40",
    iconText: "text-emerald-700",
    hoverBorder: "hover:border-emerald-500",
    hoverText: "hover:text-emerald-700",
  },
  violet: {
    activeBg: "bg-violet-600",
    activeText: "text-white",
    activeShadow: "shadow-violet-600/40",
    iconText: "text-violet-700",
    hoverBorder: "hover:border-violet-500",
    hoverText: "hover:text-violet-700",
  },
  gray: {
    activeBg: "bg-gray-600",
    activeText: "text-white",
    activeShadow: "shadow-gray-600/30",
    iconText: "text-gray-500",
    hoverBorder: "hover:border-gray-400",
    hoverText: "hover:text-gray-700",
  },
};

function TabLink({
  active,
  href,
  children,
  accent,
  icon,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
  accent: AccentKey;
  icon: string;
}) {
  const c = ACCENT_STYLES[accent];
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border-2 transition-all ${
        active
          ? `${c.activeBg} ${c.activeText} border-transparent shadow-lg ${c.activeShadow}`
          : `bg-white border-gray-200 text-gray-600 ${c.hoverBorder} ${c.hoverText} hover:-translate-y-0.5`
      }`}
    >
      <span className={active ? "" : c.iconText} aria-hidden>
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
