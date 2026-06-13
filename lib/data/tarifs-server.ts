import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  Saison,
  SaisonDomaine,
  Formule,
  OptionF4,
  Semaine,
  CoursEcole,
  LicenceFftRow,
  TarifAutre,
  TarifsBundle,
} from "./tarifs-types";

// ============================================================================
// Saisons (typées par domaine : 'stages' ou 'ecole')
// ============================================================================

export async function listSaisons(domaine?: SaisonDomaine): Promise<Saison[]> {
  let q = getSupabaseAdmin()
    .from("saisons")
    .select("*")
    .order("order_idx", { ascending: false });
  if (domaine) q = q.eq("domaine", domaine);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Saison[];
}

/** Saison active pour un domaine donné (stages ou école). */
export async function getActiveSaison(
  domaine: SaisonDomaine,
): Promise<Saison | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("saisons")
    .select("*")
    .eq("active", true)
    .eq("domaine", domaine)
    .maybeSingle();
  if (error) throw error;
  return (data as Saison) ?? null;
}

export async function getSaisonByCode(
  code: string,
  domaine: SaisonDomaine,
): Promise<Saison | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("saisons")
    .select("*")
    .eq("code", code)
    .eq("domaine", domaine)
    .maybeSingle();
  if (error) throw error;
  return (data as Saison) ?? null;
}

/**
 * Active la saison donnée, désactive toutes les autres saisons du MÊME
 * domaine. Les saisons de l'autre domaine ne sont pas touchées.
 */
export async function setActiveSaison(saisonId: string): Promise<void> {
  const supa = getSupabaseAdmin();
  // Récupérer le domaine de cette saison
  const { data: target } = await supa
    .from("saisons")
    .select("domaine")
    .eq("id", saisonId)
    .maybeSingle();
  if (!target) throw new Error("Saison introuvable");
  const domaine = (target as { domaine: string }).domaine;
  // Désactiver les autres du même domaine
  await supa
    .from("saisons")
    .update({ active: false })
    .eq("domaine", domaine)
    .neq("id", saisonId);
  // Activer celle-ci
  const { error } = await supa
    .from("saisons")
    .update({ active: true })
    .eq("id", saisonId);
  if (error) throw error;
}

// ============================================================================
// Tarifs : bundle = saison stages + saison école
// ============================================================================

interface BundleInput {
  saisonStagesId: string;
  saisonEcoleId: string;
}

/**
 * Bundle de tarifs pour un couple (saison stages, saison école).
 * Si une seule des deux est fournie, on utilise l'active pour l'autre.
 */
export async function getTarifsBundle(
  input: BundleInput,
): Promise<TarifsBundle | null> {
  const supa = getSupabaseAdmin();
  const { saisonStagesId, saisonEcoleId } = input;

  const [
    saisonStagesResp,
    saisonEcoleResp,
    formules,
    optionsF4,
    semaines,
    cours,
    licence,
    autres,
  ] = await Promise.all([
    supa.from("saisons").select("*").eq("id", saisonStagesId).maybeSingle(),
    supa.from("saisons").select("*").eq("id", saisonEcoleId).maybeSingle(),
    supa
      .from("tarifs_stages_formules")
      .select("*")
      .eq("saison_id", saisonStagesId)
      .order("order_idx"),
    supa
      .from("tarifs_options_f4")
      .select("*")
      .eq("saison_id", saisonStagesId)
      .order("order_idx"),
    supa
      .from("semaines_stages")
      .select("*")
      .eq("saison_id", saisonStagesId)
      .order("order_idx"),
    supa
      .from("tarifs_cours_ecole")
      .select("*")
      .eq("saison_id", saisonEcoleId)
      .order("order_idx"),
    supa
      .from("tarifs_licence_fft")
      .select("*")
      .eq("saison_id", saisonEcoleId)
      .order("order_idx"),
    supa
      .from("tarifs_autres")
      .select("*")
      .eq("saison_id", saisonEcoleId)
      .order("order_idx"),
  ]);

  if (
    saisonStagesResp.error || !saisonStagesResp.data ||
    saisonEcoleResp.error || !saisonEcoleResp.data
  ) {
    if (saisonStagesResp.error) console.error("getTarifsBundle stages:", saisonStagesResp.error);
    if (saisonEcoleResp.error) console.error("getTarifsBundle ecole:", saisonEcoleResp.error);
    return null;
  }

  const tennis = (cours.data ?? []).filter(
    (c) => (c as CoursEcole).type === "tennis",
  );
  const padel = (cours.data ?? []).filter(
    (c) => (c as CoursEcole).type === "padel",
  );

  return {
    saisonStages: saisonStagesResp.data as Saison,
    saisonEcole: saisonEcoleResp.data as Saison,
    formules: (formules.data ?? []) as Formule[],
    optionsF4: (optionsF4.data ?? []) as OptionF4[],
    semaines: (semaines.data ?? []) as Semaine[],
    coursTennis: tennis as CoursEcole[],
    coursPadel: padel as CoursEcole[],
    licenceFft: (licence.data ?? []) as LicenceFftRow[],
    autres: (autres.data ?? []) as TarifAutre[],
  };
}

/** Bundle des saisons actuellement actives (une par domaine).
 *  Retourne null en cas d'erreur Supabase (cold start, blip réseau) plutôt
 *  que de laisser l'exception remonter jusqu'au boundary d'erreur. */
export async function getActiveTarifsBundle(): Promise<TarifsBundle | null> {
  try {
    const [sStages, sEcole] = await Promise.all([
      getActiveSaison("stages"),
      getActiveSaison("ecole"),
    ]);
    if (!sStages || !sEcole) return null;
    return getTarifsBundle({
      saisonStagesId: sStages.id,
      saisonEcoleId: sEcole.id,
    });
  } catch (err) {
    console.error("[tarifs] getActiveTarifsBundle:", err);
    return null;
  }
}

// ============================================================================
// Calcul du prix d'une inscription
// ============================================================================

export interface CalculPrixStageInput {
  formuleCode: string;
  dejeunerJours?: string[];   // ['lundi','mardi',...]
  formule4Selection?: { jour: string; option: string }[];
}

export function calculerPrixStageFromTarifs(
  bundle: TarifsBundle,
  input: CalculPrixStageInput,
): { prix: number; prixDejeuner: number; error?: string } {
  const formule = bundle.formules.find((f) => f.code === input.formuleCode);
  if (!formule) {
    return { prix: 0, prixDejeuner: 0, error: `Formule inconnue : ${input.formuleCode}` };
  }
  if (formule.is_a_la_carte) {
    const items = input.formule4Selection ?? [];
    let total = 0;
    for (const it of items) {
      const opt = bundle.optionsF4.find((o) => o.code === it.option);
      if (!opt) {
        return { prix: 0, prixDejeuner: 0, error: `Option F4 inconnue : ${it.option}` };
      }
      total += opt.prix;
    }
    // Déjeuner optionnel (si la formule l'autorise)
    let prixDejeuner = 0;
    if (
      formule.has_dejeuner_option &&
      input.dejeunerJours &&
      input.dejeunerJours.length > 0
    ) {
      prixDejeuner =
        input.dejeunerJours.length >= 5
          ? formule.prix_dejeuner ?? 0
          : input.dejeunerJours.length * (formule.prix_dejeuner_jour ?? 0);
    }
    return { prix: total + prixDejeuner, prixDejeuner };
  }

  let total = formule.prix ?? 0;
  let prixDejeuner = 0;
  if (formule.has_dejeuner_option && input.dejeunerJours && input.dejeunerJours.length > 0) {
    if (input.dejeunerJours.length >= 5) {
      // forfait semaine
      prixDejeuner = formule.prix_dejeuner ?? 0;
    } else {
      prixDejeuner = input.dejeunerJours.length * (formule.prix_dejeuner_jour ?? 0);
    }
    total += prixDejeuner;
  }
  return { prix: total, prixDejeuner };
}

export interface CalculPrixEcoleInput {
  coursTennisCodes: string[];
  coursPadelCodes: string[];
  licenceFftCode: string;
}

export function calculerPrixEcoleFromTarifs(
  bundle: TarifsBundle,
  input: CalculPrixEcoleInput,
): number {
  let total = 0;
  for (const code of input.coursTennisCodes) {
    const c = bundle.coursTennis.find((x) => x.code === code);
    if (c) total += c.prix;
  }
  for (const code of input.coursPadelCodes) {
    const c = bundle.coursPadel.find((x) => x.code === code);
    if (c) total += c.prix;
  }
  const lic = bundle.licenceFft.find((l) => l.code === input.licenceFftCode);
  if (lic) total += lic.prix;
  return total;
}
