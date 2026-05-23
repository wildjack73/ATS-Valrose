import Link from "next/link";
import {
  fetchStages,
  fetchEcole,
  fetchHistoriqueStages,
  fetchHistoriqueSemaines,
  fetchHistoriqueEcole,
} from "@/lib/admin/queries";
import { SEMAINES } from "@/lib/data/stages";
import StagesTable from "./StagesTable";
import EcoleTable from "./EcoleTable";
import HistoriqueTable from "./HistoriqueTable";
import HistoriqueEcoleTable from "./HistoriqueEcoleTable";
import TarifsView from "./TarifsView";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  histo?: string;
  semaine?: string;
  statut?: string;
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

  const [stages, ecole, historique, historiqueSemaines, historiqueEcole] =
    await Promise.all([
      fetchStages({ semaine: sp.semaine, statut: sp.statut }),
      fetchEcole({ statut: sp.statut }),
      fetchHistoriqueStages({ semaine: sp.semaine }),
      fetchHistoriqueSemaines(),
      fetchHistoriqueEcole(),
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
        <Card label="Inscriptions stages" value={stages.length.toString()} />
        <Card
          label="Stages — à encaisser"
          value={`${totalStagesEnAttente}€`}
          hint={`${totalStagesPaye}€ déjà encaissés`}
        />
        <Card label="Inscriptions école" value={ecole.length.toString()} />
        <Card
          label="École — à encaisser"
          value={`${totalEcoleEnAttente}€`}
        />
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        <TabLink active={tab === "stages"} href="/admin?tab=stages">
          Stages ({stages.length})
        </TabLink>
        <TabLink active={tab === "ecole"} href="/admin?tab=ecole">
          École ({ecole.length})
        </TabLink>
        <TabLink active={tab === "historique"} href="/admin?tab=historique">
          Archives ({totalArchives})
        </TabLink>
        <TabLink active={tab === "tarifs"} href="/admin?tab=tarifs">
          Tarifs
        </TabLink>
      </div>

      {tab === "stages" ? (
        <StagesTable
          rows={stages}
          semaines={SEMAINES}
          currentSemaine={sp.semaine}
          currentStatut={sp.statut}
        />
      ) : tab === "ecole" ? (
        <EcoleTable rows={ecole} currentStatut={sp.statut} />
      ) : tab === "tarifs" ? (
        <TarifsView />
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
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
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
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-t-lg text-sm font-semibold whitespace-nowrap ${
        active
          ? "bg-white text-navy border-x border-t border-gray-200"
          : "text-gray-500 hover:text-navy"
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
