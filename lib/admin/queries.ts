import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  InscriptionStageRow,
  InscriptionEcoleRow,
} from "@/lib/types/db";

export async function fetchStages(filters: {
  semaine?: string;
  statut?: string;
  formule?: string;
} = {}): Promise<InscriptionStageRow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("inscriptions_stages")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.semaine) q = q.eq("semaine", filters.semaine);
  if (filters.statut) q = q.eq("statut", filters.statut);
  if (filters.formule) q = q.eq("formule", filters.formule);

  const { data, error } = await q;
  if (error) {
    console.error("fetchStages:", error);
    return [];
  }
  return (data ?? []) as InscriptionStageRow[];
}

export interface InscriptionStageHistoriqueRow {
  id: string;
  imported_at: string;
  source: string;
  horodateur: string | null;
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  niveau: string | null;
  formule: string | null;
  semaine: string | null;
  repas: string | null;
  jours_f4: string | null;
  formule_normalisee: string | null;
  creneau_normalise: string | null;
  dejeuner: boolean;
  prix_estime: number;
}

export async function fetchHistoriqueStages(filters: {
  semaine?: string;
  source?: string;
} = {}): Promise<InscriptionStageHistoriqueRow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("inscriptions_stages_historique")
    .select("*")
    .order("horodateur", { ascending: false, nullsFirst: false });

  if (filters.semaine) q = q.eq("semaine", filters.semaine);
  if (filters.source) q = q.eq("source", filters.source);

  const { data, error } = await q;
  if (error) {
    console.error("fetchHistoriqueStages:", error);
    return [];
  }
  return (data ?? []) as InscriptionStageHistoriqueRow[];
}

export async function fetchHistoriqueSemaines(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("inscriptions_stages_historique")
    .select("semaine")
    .not("semaine", "is", null);
  if (error || !data) return [];
  const unique = new Set<string>();
  for (const row of data as { semaine: string | null }[]) {
    if (row.semaine) unique.add(row.semaine);
  }
  return Array.from(unique).sort();
}

export interface InscriptionEcoleHistoriqueRow {
  id: string;
  imported_at: string;
  source: string;
  horodateur: string | null;
  nom: string | null;
  prenom: string | null;
  date_naissance: string | null;
  adresse: string | null;
  code_postal_ville: string | null;
  telephone: string | null;
  email: string | null;
  niveau: string | null;
  cours_tennis_raw: string | null;
  cours_padel_raw: string | null;
  formule_mixte_raw: string | null;
  nouvelles_formules_raw: string | null;
  dispo_mercredi: string | null;
  dispo_samedi: string | null;
  dispo_semaine: string | null;
  mode_reglement: string | null;
  nb_paiements: string | null;
  licence_fft: string | null;
  licence_extra: string | null;
  reglement_notes: string | null;
  commentaires: string | null;
  prix_estime: number;
}

export async function fetchHistoriqueEcole(): Promise<
  InscriptionEcoleHistoriqueRow[]
> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("inscriptions_ecole_historique")
    .select("*")
    .order("horodateur", { ascending: false, nullsFirst: false });
  if (error) {
    console.error("fetchHistoriqueEcole:", error);
    return [];
  }
  return (data ?? []) as InscriptionEcoleHistoriqueRow[];
}

export async function fetchEcole(filters: {
  statut?: string;
} = {}): Promise<InscriptionEcoleRow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("inscriptions_ecole")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.statut) q = q.eq("statut", filters.statut);

  const { data, error } = await q;
  if (error) {
    console.error("fetchEcole:", error);
    return [];
  }
  return (data ?? []) as InscriptionEcoleRow[];
}
