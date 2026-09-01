import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Map { cle -> horaire } des horaires exacts pour une saison école. */
export async function fetchHorairesEcole(
  saisonId: string,
): Promise<Record<string, string>> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("horaires_ecole")
      .select("cle, horaire")
      .eq("saison_id", saisonId);
    if (error) throw error;
    const out: Record<string, string> = {};
    for (const row of (data ?? []) as { cle: string; horaire: string }[]) {
      if (row.cle) out[row.cle] = row.horaire ?? "";
    }
    return out;
  } catch (err) {
    console.error("[horaires] fetchHorairesEcole:", err);
    return {};
  }
}

/**
 * Enregistre les horaires : upsert des clés non vides, suppression des clés
 * vidées. Renvoie le nombre de clés enregistrées.
 */
export async function saveHorairesEcole(
  saisonId: string,
  entries: { cle: string; horaire: string }[],
): Promise<number> {
  const supa = getSupabaseAdmin();
  const now = new Date().toISOString();

  const remplis = entries.filter((e) => e.horaire && e.horaire.trim());
  const vides = entries.filter((e) => !e.horaire || !e.horaire.trim());

  if (remplis.length > 0) {
    const { error } = await supa.from("horaires_ecole").upsert(
      remplis.map((e) => ({
        saison_id: saisonId,
        cle: e.cle,
        horaire: e.horaire.trim(),
        updated_at: now,
      })),
      { onConflict: "saison_id,cle" },
    );
    if (error) throw error;
  }

  if (vides.length > 0) {
    const { error } = await supa
      .from("horaires_ecole")
      .delete()
      .eq("saison_id", saisonId)
      .in(
        "cle",
        vides.map((e) => e.cle),
      );
    if (error) throw error;
  }

  return remplis.length;
}
