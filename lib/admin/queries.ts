import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  InscriptionStageRow,
  InscriptionEcoleRow,
} from "@/lib/types/db";

export async function fetchStages(filters: {
  semaine?: string;
  statut?: string;
} = {}): Promise<InscriptionStageRow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("inscriptions_stages")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.semaine) q = q.eq("semaine", filters.semaine);
  if (filters.statut) q = q.eq("statut", filters.statut);

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
