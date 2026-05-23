import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Coach } from "@/lib/data/planning-types";

export type StageSession =
  | "matin"
  | "apres_midi"
  | "soir"
  | "sport_collectifs_matin"
  | "sport_collectifs_apres_midi"
  | "repas"
  | "permanence_matin"
  | "permanence_apres_midi";

export interface StageOrgRow {
  id: string;
  semaine_id: string;
  jour: string;
  session: StageSession;
  coach_id: string | null;
  notes: string | null;
}

/**
 * Renvoie toutes les assignations coachs pour une semaine donnée.
 * Indexé par jour → session → liste de { id, coach }
 */
export async function fetchStageOrganisation(semaineId: string): Promise<{
  byKey: Map<string, { id: string; coach: Coach | null }[]>;
  raw: StageOrgRow[];
}> {
  const supa = getSupabaseAdmin();
  const [{ data: orgs, error: e1 }, { data: coaches }] = await Promise.all([
    supa.from("stage_organisations").select("*").eq("semaine_id", semaineId),
    supa.from("coaches").select("*").order("order_idx"),
  ]);
  if (e1) console.error("fetchStageOrganisation:", e1);

  const coachById = new Map<string, Coach>(
    ((coaches ?? []) as Coach[]).map((c) => [c.id, c]),
  );

  const byKey = new Map<string, { id: string; coach: Coach | null }[]>();
  for (const o of (orgs ?? []) as StageOrgRow[]) {
    const key = `${o.jour}|${o.session}`;
    const arr = byKey.get(key) ?? [];
    arr.push({
      id: o.id,
      coach: o.coach_id ? coachById.get(o.coach_id) ?? null : null,
    });
    byKey.set(key, arr);
  }

  return { byKey, raw: (orgs ?? []) as StageOrgRow[] };
}

/**
 * Compte d'inscriptions par jour pour une semaine.
 * Approxime : F1/F2/F3 = 5 jours (lun-ven), F4 = compte selon les jours sélectionnés.
 */
export async function fetchInscriptionsCountByDay(
  semaineCode: string,
): Promise<{
  total: number;
  matin: Record<string, number>;
  apresMidi: Record<string, number>;
}> {
  const supa = getSupabaseAdmin();
  const { data: inscriptions, error } = await supa
    .from("inscriptions_stages")
    .select(
      "formule, formule_creneau, formule_4_selection, statut",
    )
    .eq("semaine", semaineCode)
    .neq("statut", "annule");
  if (error) {
    console.error("fetchInscriptionsCountByDay:", error);
    return {
      total: 0,
      matin: {},
      apresMidi: {},
    };
  }

  const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];
  const matin: Record<string, number> = {};
  const apresMidi: Record<string, number> = {};
  for (const j of jours) {
    matin[j] = 0;
    apresMidi[j] = 0;
  }

  for (const i of inscriptions ?? []) {
    const ins = i as {
      formule: string;
      formule_creneau: string | null;
      formule_4_selection:
        | { jour: string; option: string }[]
        | null;
    };

    if (ins.formule === "formule_3") {
      // Journée complète : matin + après-midi tous les jours
      for (const j of jours) {
        matin[j]++;
        apresMidi[j]++;
      }
    } else if (
      ins.formule === "formule_1" ||
      ins.formule === "formule_2"
    ) {
      const target = ins.formule_creneau === "apres_midi" ? apresMidi : matin;
      for (const j of jours) {
        target[j]++;
      }
    } else if (ins.formule === "formule_4") {
      for (const s of ins.formule_4_selection ?? []) {
        // option_3 = journée → matin + après-midi
        if (s.option === "option_3") {
          matin[s.jour]++;
          apresMidi[s.jour]++;
        } else {
          // option_1 / option_2 : matin OU après-midi (on suppose matin par défaut, car la donnée ne dit pas)
          matin[s.jour]++;
        }
      }
    }
  }

  return {
    total: inscriptions?.length ?? 0,
    matin,
    apresMidi,
  };
}
