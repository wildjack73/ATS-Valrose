import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getActiveSaison } from "@/lib/data/tarifs-server";
import AffectationPadel from "./AffectationPadel";

export const dynamic = "force-dynamic";

/**
 * Page PROVISOIRE d'affectation des inscrits « Perfectionnement Padel » à un
 * créneau. Sert à corriger en masse les inscriptions dont la disponibilité ne
 * correspond pas à un des créneaux perf (données saisies avant la création de
 * la section). Accessible via /admin/affectation-padel (protégée par le login).
 */
export default async function AffectationPadelPage() {
  const saison = await getActiveSaison("ecole");
  if (!saison) {
    return (
      <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-5 text-sm">
        Aucune saison école active.
      </div>
    );
  }

  const { data, error } = await getSupabaseAdmin()
    .from("inscriptions_ecole")
    .select("id, prenom, nom, dispo_semaine, statut, cours_padel")
    .eq("saison_id", saison.id);

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-5 text-sm">
        Erreur de chargement : {error.message}
      </div>
    );
  }

  const rows = ((data ?? []) as {
    id: string;
    prenom: string;
    nom: string;
    dispo_semaine: string | null;
    statut: string;
    cours_padel: string[] | null;
  }[])
    .filter(
      (r) =>
        Array.isArray(r.cours_padel) &&
        r.cours_padel.includes("perfectionnement") &&
        r.statut !== "annule",
    )
    .sort((a, b) =>
      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"),
    )
    .map((r) => ({
      id: r.id,
      prenom: r.prenom,
      nom: r.nom,
      dispo_semaine: r.dispo_semaine,
    }));

  return <AffectationPadel rows={rows} saisonLabel={saison.label} />;
}
