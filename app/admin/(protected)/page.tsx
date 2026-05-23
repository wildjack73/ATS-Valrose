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

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  histo?: string;
  semaine?: string;
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
  ] = await Promise.all([
    fetchStages({ semaine: sp.semaine, statut: sp.statut }),
    fetchEcole({ statut: sp.statut }),
    fetchHistoriqueStages({ semaine: sp.semaine }),
    fetchHistoriqueSemaines(),
    fetchHistoriqueEcole(),
    targetSaisonPromise,
    listSaisons(),
  ]);

  const totalStagesEnAttente = stages
    .filter((s) => s.statut === "en_attente")
    .reduce((sum, s) => sum + s.prix_total, 0);
  const totalStagesPaye = stages
    .filter((s) => s.statut === "paye")
    .reduce((sum, s) => sum + s.prix_total, 0);
  const totalEcoleEnAttente = ecole
    .filter((s) => s.statut === "en_attente")
    .reduce((sum, s) => sum + (s.prix_total ?? 0), 0);
  const totalArchives = historique.length + historiqueEcole.length;

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card label="Inscriptions stages" value={stages.length.toString()} accent="cyan" />
        <Card
          label="Stages — à encaisser"
          value={`${totalStagesEnAttente}€`}
          hint={`${totalStagesPaye}€ déjà encaissés`}
          accent="yellow"
        />
        <Card label="Inscriptions école" value={ecole.length.toString()} accent="ocre" />
        <Card
          label="École — à encaisser"
          value={`${totalEcoleEnAttente}€`}
          accent="yellow"
        />
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
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

function Card({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "cyan" | "ocre" | "navy" | "yellow";
}) {
  const accentBar =
    accent === "cyan"
      ? "bg-cyan-club"
      : accent === "ocre"
        ? "bg-ocre"
        : accent === "yellow"
          ? "bg-yellow-club"
          : "bg-navy";
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm relative overflow-hidden">
      <span
        className={`absolute left-0 top-0 bottom-0 w-1 ${accentBar}`}
        aria-hidden="true"
      />
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-navy">{value}</p>
      {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
    </div>
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
