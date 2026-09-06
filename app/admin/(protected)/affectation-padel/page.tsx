import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getActiveSaison } from "@/lib/data/tarifs-server";
import {
  SECTIONS_CRENEAUX,
  creneauTexteComplet,
  type CreneauCategorie,
} from "@/lib/data/creneaux-ecole";
import AffectationPadel, { type Bloc } from "./AffectationPadel";

export const dynamic = "force-dynamic";

/** Options {value,text} d'une catégorie de créneaux. */
function optionsPour(categorie: CreneauCategorie) {
  const section = SECTIONS_CRENEAUX.find((s) => s.categorie === categorie);
  if (!section) return [];
  return section.groupes.flatMap((g) =>
    g.options.map((o) => ({ value: o.label, text: creneauTexteComplet(o) })),
  );
}

/**
 * Page PROVISOIRE d'affectation à un créneau padel. Deux blocs :
 *  - Perfectionnement padel jeunes
 *  - Padel adultes
 * Corrige en masse les inscriptions dont la dispo ne correspond pas à un
 * créneau (données saisies avant la refonte). /admin/affectation-padel
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

  const ADULT = new Set(["cours_adultes_annuel", "cours_adultes_trimestre"]);
  const all = ((data ?? []) as {
    id: string;
    prenom: string;
    nom: string;
    dispo_semaine: string | null;
    statut: string;
    cours_padel: string[] | null;
  }[]).filter((r) => r.statut !== "annule" && Array.isArray(r.cours_padel));

  const sortByNom = <T extends { nom: string; prenom: string }>(rows: T[]) =>
    rows.sort((a, b) =>
      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"),
    );

  const toRow = (r: (typeof all)[number]) => ({
    id: r.id,
    prenom: r.prenom,
    nom: r.nom,
    dispo_semaine: r.dispo_semaine,
  });

  const perfRows = sortByNom(
    all.filter((r) => r.cours_padel!.includes("perfectionnement")).map(toRow),
  );
  const adulteRows = sortByNom(
    all.filter((r) => r.cours_padel!.some((c) => ADULT.has(c))).map(toRow),
  );

  const blocs: Bloc[] = [
    {
      key: "perf",
      titre: "🏓 Perfectionnement padel jeunes",
      options: optionsPour("padel_jeunes"),
      rows: perfRows,
    },
    {
      key: "adultes",
      titre: "🏓 Padel adultes",
      options: optionsPour("padel"),
      rows: adulteRows,
    },
  ];

  return <AffectationPadel blocs={blocs} saisonLabel={saison.label} />;
}
