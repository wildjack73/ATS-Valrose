import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Récupère le niveau attribué par élève (table niveaux_eleves) sous forme
 * de Map<eleve_key, code_niveau>. Source de vérité unique, partagée par
 * toutes les vues admin.
 */
export async function fetchNiveauxEleves(): Promise<Map<string, string>> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("niveaux_eleves")
      .select("eleve_key, niveau");
    const map = new Map<string, string>();
    if (error) {
      console.error("fetchNiveauxEleves:", error);
      return map;
    }
    for (const row of (data ?? []) as { eleve_key: string; niveau: string }[]) {
      if (row.eleve_key && row.niveau) map.set(row.eleve_key, row.niveau);
    }
    return map;
  } catch (err) {
    console.error("fetchNiveauxEleves:", err);
    return new Map();
  }
}
