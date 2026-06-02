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
  // On sélectionne prénom+nom pour pouvoir dédupliquer les doublons de
  // saisie (mêmes prénom+nom+formule = un seul enfant compté).
  const { data: inscriptions, error } = await supa
    .from("inscriptions_stages")
    .select(
      "prenom, nom, formule, formule_creneau, formule_4_selection, statut",
    )
    .eq("semaine", semaineCode)
    .neq("statut", "annule");
  if (error) {
    console.error("fetchInscriptionsCountByDay:", error);
    return { total: 0, matin: {}, apresMidi: {} };
  }

  const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];
  const matin: Record<string, number> = {};
  const apresMidi: Record<string, number> = {};
  for (const j of jours) {
    matin[j] = 0;
    apresMidi[j] = 0;
  }

  // Sets de dédup par slot pour ne compter chaque enfant qu'une fois
  // par créneau (cf. fetchEffectifsByDay).
  const seen = new Map<string, Set<string>>();
  const seenChild = new Set<string>();
  const key = (p: string, n: string, f: string) =>
    `${p.trim().toLowerCase()}|${n.trim().toLowerCase()}|${f}`;
  const bump = (
    target: Record<string, number>,
    slotKey: string,
    childKey: string,
  ) => {
    const s = seen.get(slotKey) ?? new Set<string>();
    if (s.has(childKey)) return;
    s.add(childKey);
    seen.set(slotKey, s);
    const jour = slotKey.split("-")[0];
    target[jour]++;
  };

  for (const i of inscriptions ?? []) {
    const ins = i as {
      prenom: string;
      nom: string;
      formule: string;
      formule_creneau: string | null;
      formule_4_selection:
        | { jour: string; option: string; creneau?: "matin" | "apres_midi" | null }[]
        | null;
    };
    const k = key(ins.prenom, ins.nom, ins.formule);
    seenChild.add(k);

    if (ins.formule === "formule_3") {
      for (const j of jours) {
        bump(matin, `${j}-matin`, k);
        bump(apresMidi, `${j}-am`, k);
      }
    } else if (
      ins.formule === "formule_1" ||
      ins.formule === "formule_2"
    ) {
      const isPM = ins.formule_creneau === "apres_midi";
      for (const j of jours) {
        bump(isPM ? apresMidi : matin, `${j}-${isPM ? "am" : "matin"}`, k);
      }
    } else if (ins.formule === "formule_4") {
      for (const s of ins.formule_4_selection ?? []) {
        if (s.option === "option_3") {
          bump(matin, `${s.jour}-matin`, k);
          bump(apresMidi, `${s.jour}-am`, k);
        } else {
          // Opt 1 / 2 : créneau choisi par la famille (matin par défaut
          // pour les anciennes inscriptions sans champ creneau).
          const isPM = s.creneau === "apres_midi";
          bump(
            isPM ? apresMidi : matin,
            `${s.jour}-${isPM ? "am" : "matin"}`,
            k,
          );
        }
      }
    }
  }

  return {
    total: seenChild.size,
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
 *    (matin + après-midi), option_1/2 = demi-journée selon le `creneau`
 *    stocké dans la sélection (ou matin par défaut si pas renseigné, pour
 *    les anciennes inscriptions sans créneau).
 *  - Repas : enfant présent ce jour-là dans dejeuner_jours
 *
 * Dédoublonnage : si un enfant a 2 inscriptions en DB pour la même semaine
 * et même formule (doublon de saisie), il ne sera affiché qu'une seule
 * fois par slot. Utile pour les imports historiques où des doublons sont
 * possibles. La détection de ces doublons reste visible via l'onglet
 * « À vérifier ».
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

  // Sets pour dédoublonner par slot (clé = prenom|nom|formule normalisés)
  const seenInSlot = new Map<string, Set<string>>(); // "lundi-matin" → Set<key>
  const seenChildKeys = new Set<string>(); // pour le total unique

  function childKey(prenom: string, nom: string, formule: string): string {
    return `${prenom.trim().toLowerCase()}|${nom.trim().toLowerCase()}|${formule}`;
  }

  function pushOnce(
    jour: string,
    slot: "matin" | "apresMidi",
    enfant: EnfantEffectif,
  ): void {
    const slotKey = `${jour}-${slot}`;
    const set = seenInSlot.get(slotKey) ?? new Set<string>();
    const k = childKey(enfant.prenom, enfant.nom, enfant.formule);
    if (set.has(k)) return; // déjà présent dans ce créneau → on saute
    set.add(k);
    seenInSlot.set(slotKey, set);
    jours[jour][slot].push(enfant);
  }

  function pushRepasOnce(jour: string, enfant: EnfantEffectif): void {
    const slotKey = `${jour}-repas`;
    const set = seenInSlot.get(slotKey) ?? new Set<string>();
    const k = childKey(enfant.prenom, enfant.nom, enfant.formule);
    if (set.has(k)) return;
    set.add(k);
    seenInSlot.set(slotKey, set);
    jours[jour].repas.push(enfant);
  }

  for (const i of data ?? []) {
    const ins = i as {
      prenom: string;
      nom: string;
      formule: string;
      formule_creneau: string | null;
      formule_4_selection:
        | { jour: string; option: string; creneau?: "matin" | "apres_midi" | null }[]
        | null;
      dejeuner_jours: string[] | null;
    };
    const enfant: EnfantEffectif = {
      prenom: ins.prenom,
      nom: ins.nom,
      formule: ins.formule,
    };
    seenChildKeys.add(childKey(ins.prenom, ins.nom, ins.formule));

    if (ins.formule === "formule_3") {
      for (const j of JOURS) {
        pushOnce(j, "matin", enfant);
        pushOnce(j, "apresMidi", enfant);
      }
    } else if (ins.formule === "formule_1" || ins.formule === "formule_2") {
      const cible = ins.formule_creneau === "apres_midi" ? "apresMidi" : "matin";
      for (const j of JOURS) pushOnce(j, cible, enfant);
    } else if (ins.formule === "formule_4") {
      for (const s of ins.formule_4_selection ?? []) {
        if (!jours[s.jour]) continue;
        if (s.option === "option_3") {
          pushOnce(s.jour, "matin", enfant);
          pushOnce(s.jour, "apresMidi", enfant);
        } else {
          // Opt 1 ou 2 (demi-journée) : on respecte le créneau choisi par
          // la famille. Si l'inscription est ancienne et n'a pas de
          // creneau renseigné, on retombe sur « matin » par compatibilité.
          const slot = s.creneau === "apres_midi" ? "apresMidi" : "matin";
          pushOnce(s.jour, slot, enfant);
        }
      }
    }

    // Repas
    for (const j of ins.dejeuner_jours ?? []) {
      if (jours[j]) pushRepasOnce(j, enfant);
    }
  }

  return { total: seenChildKeys.size, jours };
}
