import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Capacités des créneaux École, éditables depuis l'admin.
 *
 * La table `capacites_creneaux_ecole` ne contient QUE les overrides : si un
 * créneau n'a pas de ligne, c'est la valeur par défaut du code qui s'applique
 * (cf. `capaciteEffective` dans lib/data/creneaux-ecole.ts).
 *
 * Clé = `creneau_key` = le `label` COMPLET du créneau (non normalisé), pour
 * éviter toute confusion entre créneaux distincts (tennis vs padel, etc.).
 */
export async function fetchCapacitesEcole(
  saisonId: string,
): Promise<Record<string, number | null>> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("capacites_creneaux_ecole")
      .select("creneau_key, capacite")
      .eq("saison_id", saisonId);

    if (error) {
      console.error("fetchCapacitesEcole:", error);
      return {};
    }

    const out: Record<string, number | null> = {};
    for (const row of (data ?? []) as {
      creneau_key: string;
      capacite: number | null;
    }[]) {
      out[row.creneau_key] = row.capacite;
    }
    return out;
  } catch (err) {
    console.error("fetchCapacitesEcole:", err);
    return {};
  }
}
