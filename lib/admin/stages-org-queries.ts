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

// ============================================================================
// Effectifs détaillés par jour : qui est là le matin / l'après-midi + repas
// ============================================================================

export interface EnfantEffectif {
  prenom: string;
  nom: string;
  formule: string;
}

export interface EffectifsJour {
  matin: EnfantEffectif[];
  apresMidi: EnfantEffectif[];
  repas: EnfantEffectif[];
}

/**
 * Pour une semaine : liste nominative des enfants présents le matin /
 * l'après-midi / au repas, jour par jour.
 *
 * Logique d'attendance :
 *  - F1/F2 : présents les 5 jours, sur leur créneau (matin ou après-midi)
 *  - F3 : présents les 5 jours, matin ET après-midi
 *  - F4 : présents uniquement les jours sélectionnés ; option_3 = journée
 *    (matin + après-midi), option_1/2 = demi-journée (compté au matin par
 *    défaut faute de créneau dans la donnée)
 *  - Repas : enfant présent ce jour-là dans dejeuner_jours
 */
export async function fetchEffectifsByDay(
  semaineCode: string,
): Promise<{ total: number; jours: Record<string, EffectifsJour> }> {
  const supa = getSupabaseAdmin();
  const { data, error } = await supa
    .from("inscriptions_stages")
    .select(
      "prenom, nom, formule, formule_creneau, formule_4_selection, dejeuner_jours, statut",
    )
    .eq("semaine", semaineCode)
    .neq("statut", "annule");

  const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];
  const jours: Record<string, EffectifsJour> = {};
  for (const j of JOURS) jours[j] = { matin: [], apresMidi: [], repas: [] };

  if (error) {
    console.error("fetchEffectifsByDay:", error);
    return { total: 0, jours };
  }

  for (const i of data ?? []) {
    const ins = i as {
      prenom: string;
      nom: string;
      formule: string;
      formule_creneau: string | null;
      formule_4_selection: { jour: string; option: string }[] | null;
      dejeuner_jours: string[] | null;
    };
    const enfant: EnfantEffectif = {
      prenom: ins.prenom,
      nom: ins.nom,
      formule: ins.formule,
    };

    if (ins.formule === "formule_3") {
      for (const j of JOURS) {
        jours[j].matin.push(enfant);
        jours[j].apresMidi.push(enfant);
      }
    } else if (ins.formule === "formule_1" || ins.formule === "formule_2") {
      const cible = ins.formule_creneau === "apres_midi" ? "apresMidi" : "matin";
      for (const j of JOURS) jours[j][cible].push(enfant);
    } else if (ins.formule === "formule_4") {
      for (const s of ins.formule_4_selection ?? []) {
        if (!jours[s.jour]) continue;
        if (s.option === "option_3") {
          jours[s.jour].matin.push(enfant);
          jours[s.jour].apresMidi.push(enfant);
        } else {
          jours[s.jour].matin.push(enfant);
        }
      }
    }

    // Repas
    for (const j of ins.dejeuner_jours ?? []) {
      if (jours[j]) jours[j].repas.push(enfant);
    }
  }

  return { total: data?.length ?? 0, jours };
}
