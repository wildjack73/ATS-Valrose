import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { GroupeEleveRow } from "@/lib/data/groupes-ecole";

/**
 * Élèves École à ranger dans les groupes = ceux cochés « Ajouté au groupe »
 * OU déjà prévenus par email (les deux signaux valent « placé »).
 * Le classement par horaire effectif + coach est fait côté client (il dispose
 * des horaires saisis et réagit aux changements de coach en direct).
 */
export async function fetchElevesAGrouper(
  saisonId: string,
): Promise<GroupeEleveRow[]> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("inscriptions_ecole")
      .select(
        "id, prenom, nom, date_naissance, cours_tennis, cours_padel, cours_pickleball, dispo_mercredi, dispo_samedi, dispo_semaine, horaire_confirme, ajoute_au_groupe, coach_id, telephone",
      )
      .eq("saison_id", saisonId)
      .neq("statut", "annule")
      .or("ajoute_au_groupe.eq.true,prevenu_at.not.is.null")
      .order("nom");
    if (error) {
      console.error("fetchElevesAGrouper:", error);
      return [];
    }
    return (data ?? []) as GroupeEleveRow[];
  } catch (e) {
    console.error("fetchElevesAGrouper (exception):", e);
    return [];
  }
}
