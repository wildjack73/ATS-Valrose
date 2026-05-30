import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface JpoJour {
  label: string;
  creneaux: string;
}

export interface JpoConfig {
  id: string;
  saison_id: string;
  visible_jusqu_au: string;  // YYYY-MM-DD
  annee_scolaire: string;
  date_reprise: string;
  jours: JpoJour[];
}

/** Retourne la config JPO de la saison école donnée, ou null si aucune. */
export async function fetchJpoEcole(
  saisonEcoleId: string,
): Promise<JpoConfig | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("jpo_ecole")
    .select("*")
    .eq("saison_id", saisonEcoleId)
    .maybeSingle();
  if (error) {
    console.error("fetchJpoEcole:", error);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    saison_id: data.saison_id,
    visible_jusqu_au: data.visible_jusqu_au,
    annee_scolaire: data.annee_scolaire,
    date_reprise: data.date_reprise,
    jours: Array.isArray(data.jours) ? (data.jours as JpoJour[]) : [],
  };
}
