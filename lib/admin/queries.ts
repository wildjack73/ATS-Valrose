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
