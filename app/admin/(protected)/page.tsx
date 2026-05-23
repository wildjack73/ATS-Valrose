import Link from "next/link";
import { fetchStages, fetchEcole } from "@/lib/admin/queries";
import { SEMAINES } from "@/lib/data/stages";
import StagesTable from "./StagesTable";
import EcoleTable from "./EcoleTable";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  semaine?: string;
  statut?: string;
}>;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "ecole" ? "ecole" : "stages";

  const [stages, ecole] = await Promise.all([
    fetchStages({ semaine: sp.semaine, statut: sp.statut }),
    fetchEcole({ statut: sp.statut }),
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

      <div className="flex items-center gap-2 mb-4">
        <TabLink active={tab === "stages"} href="/admin?tab=stages">
          Stages ({stages.length})
        </TabLink>
        <TabLink active={tab === "ecole"} href="/admin?tab=ecole">
          École ({ecole.length})
        </TabLink>
      </div>

      {tab === "stages" ? (
        <StagesTable
          rows={stages}
          semaines={SEMAINES}
          currentSemaine={sp.semaine}
          currentStatut={sp.statut}
        />
      ) : (
        <EcoleTable rows={ecole} currentStatut={sp.statut} />
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
      className={`px-4 py-2 rounded-t-lg text-sm font-semibold ${
        active
          ? "bg-white text-navy border-x border-t border-gray-200"
          : "text-gray-500 hover:text-navy"
      }`}
    >
      {children}
    </Link>
  );
}
