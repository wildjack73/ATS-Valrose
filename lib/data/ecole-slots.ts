import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
// Source unique de la normalisation (partagée formulaire + serveur).
import { normalizeSlot } from "@/lib/data/creneaux-ecole";
export { normalizeSlot };

/**
 * Compte combien de fois chaque créneau apparaît dans le champ
 * dispo_semaine des inscriptions école de la saison donnée. Les
 * inscriptions annulées OU temporairement désactivées sont exclues
 * (elles libèrent leur place).
 */
export async function fetchSlotsOccupesEcole(
  saisonId: string,
): Promise<Record<string, number>> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("inscriptions_ecole")
      .select("dispo_semaine, statut, desactive")
      .eq("saison_id", saisonId)
      .neq("statut", "annule")
      .neq("desactive", true);

    if (error) {
      console.error("fetchSlotsOccupesEcole:", error);
      return {};
    }

    const counts: Record<string, number> = {};
    for (const row of (data ?? []) as { dispo_semaine: string | null }[]) {
      const raw = row.dispo_semaine;
      if (!raw) continue;
      for (const piece of raw.split(",")) {
        const key = normalizeSlot(piece);
        if (!key) continue;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
  } catch (err) {
    console.error("fetchSlotsOccupesEcole:", err);
    return {};
  }
}
