import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  Saison,
  Formule,
  OptionF4,
  Semaine,
  CoursEcole,
  LicenceFftRow,
  TarifAutre,
  TarifsBundle,
} from "./tarifs-types";

// ============================================================================
// Saisons
// ============================================================================

export async function listSaisons(): Promise<Saison[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("saisons")
    .select("*")
    .order("order_idx", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Saison[];
}

export async function getActiveSaison(): Promise<Saison | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("saisons")
    .select("*")
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as Saison) ?? null;
}

export async function getSaisonByCode(code: string): Promise<Saison | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("saisons")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return (data as Saison) ?? null;
}

export async function setActiveSaison(saisonId: string): Promise<void> {
  const supa = getSupabaseAdmin();
  // Désactiver toutes les autres
  await supa.from("saisons").update({ active: false }).neq("id", saisonId);
  // Activer celle-ci
  const { error } = await supa
    .from("saisons")
    .update({ active: true })
    .eq("id", saisonId);
  if (error) throw error;
}

// ============================================================================
// Tarifs d'une saison
// ============================================================================

export async function getTarifsBundle(
  saisonId: string,
): Promise<TarifsBundle | null> {
  const supa = getSupabaseAdmin();
  const [saisonResp, formules, optionsF4, semaines, cours, licence, autres] =
    await Promise.all([
      supa.from("saisons").select("*").eq("id", saisonId).maybeSingle(),
      supa
        .from("tarifs_stages_formules")
        .select("*")
        .eq("saison_id", saisonId)
        .order("order_idx"),
      supa
        .from("tarifs_options_f4")
        .select("*")
        .eq("saison_id", saisonId)
        .order("order_idx"),
      supa
        .from("semaines_stages")
        .select("*")
        .eq("saison_id", saisonId)
        .order("order_idx"),
      supa
        .from("tarifs_cours_ecole")
        .select("*")
        .eq("saison_id", saisonId)
        .order("order_idx"),
      supa
        .from("tarifs_licence_fft")
        .select("*")
        .eq("saison_id", saisonId)
        .order("order_idx"),
      supa
        .from("tarifs_autres")
        .select("*")
        .eq("saison_id", saisonId)
        .order("order_idx"),
    ]);

  if (saisonResp.error || !saisonResp.data) {
    if (saisonResp.error) console.error("getTarifsBundle saison:", saisonResp.error);
    return null;
  }

  const tennis = (cours.data ?? []).filter(
    (c) => (c as CoursEcole).type === "tennis",
  );
  const padel = (cours.data ?? []).filter(
    (c) => (c as CoursEcole).type === "padel",
  );

  return {
    saison: saisonResp.data as Saison,
    formules: (formules.data ?? []) as Formule[],
    optionsF4: (optionsF4.data ?? []) as OptionF4[],
    semaines: (semaines.data ?? []) as Semaine[],
    coursTennis: tennis as CoursEcole[],
    coursPadel: padel as CoursEcole[],
    licenceFft: (licence.data ?? []) as LicenceFftRow[],
    autres: (autres.data ?? []) as TarifAutre[],
  };
}

/** Bundle de la saison active, ou null si aucune. */
export async function getActiveTarifsBundle(): Promise<TarifsBundle | null> {
  const saison = await getActiveSaison();
  if (!saison) return null;
  return getTarifsBundle(saison.id);
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
    return { prix: total, prixDejeuner: 0 };
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
