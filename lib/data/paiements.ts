import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type MoyenPaiement =
  | "especes"
  | "cheque"
  | "virement"
  | "cb"
  | "autre";

export interface Paiement {
  id: string;
  inscription_stage_id: string | null;
  inscription_ecole_id: string | null;
  montant: number;
  moyen: MoyenPaiement;
  reference: string | null;
  date_paiement: string;
  notes: string | null;
  created_at: string;
}

export interface PaiementsRecap {
  totalPaye: number;
  nbPaiements: number;
  dernierPaiement: string | null; // YYYY-MM-DD
}

/** Charge les paiements d'une inscription (stage ou école), triés du plus
 *  récent au plus ancien. */
export async function fetchPaiementsForInscription(
  type: "stages" | "ecole",
  inscriptionId: string,
): Promise<Paiement[]> {
  try {
    const col = type === "stages" ? "inscription_stage_id" : "inscription_ecole_id";
    const { data, error } = await getSupabaseAdmin()
      .from("paiements")
      .select("*")
      .eq(col, inscriptionId)
      .order("date_paiement", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("fetchPaiementsForInscription:", error);
      return [];
    }
    return (data ?? []) as Paiement[];
  } catch (err) {
    console.error("fetchPaiementsForInscription:", err);
    return [];
  }
}

/** Charge tous les paiements pour un ensemble d'inscriptions, regroupés par
 *  id d'inscription. Utilisé par la vue table pour hydrater chaque panneau
 *  sans round-trip réseau. Triés par date desc dans chaque sous-liste. */
export async function fetchPaiementsListByInscriptions(
  type: "stages" | "ecole",
  inscriptionIds: string[],
): Promise<Map<string, Paiement[]>> {
  const result = new Map<string, Paiement[]>();
  if (inscriptionIds.length === 0) return result;
  try {
    const col = type === "stages" ? "inscription_stage_id" : "inscription_ecole_id";
    const { data, error } = await getSupabaseAdmin()
      .from("paiements")
      .select("*")
      .in(col, inscriptionIds)
      .order("date_paiement", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("fetchPaiementsListByInscriptions:", error);
      return result;
    }
    for (const row of (data ?? []) as Paiement[]) {
      const id =
        type === "stages"
          ? (row.inscription_stage_id as string)
          : (row.inscription_ecole_id as string);
      const cur = result.get(id) ?? [];
      cur.push(row);
      result.set(id, cur);
    }
    return result;
  } catch (err) {
    console.error("fetchPaiementsListByInscriptions:", err);
    return result;
  }
}

/** Pour plusieurs inscriptions en une fois (vue table) : retourne un Map
 *  id-inscription → { totalPayé, nb paiements, date du dernier paiement } */
export async function fetchPaiementsRecapForInscriptions(
  type: "stages" | "ecole",
  inscriptionIds: string[],
): Promise<Map<string, PaiementsRecap>> {
  const result = new Map<string, PaiementsRecap>();
  if (inscriptionIds.length === 0) return result;
  try {
    const col = type === "stages" ? "inscription_stage_id" : "inscription_ecole_id";
    const { data, error } = await getSupabaseAdmin()
      .from("paiements")
      .select(`${col}, montant, date_paiement`)
      .in(col, inscriptionIds);
    if (error) {
      console.error("fetchPaiementsRecapForInscriptions:", error);
      return result;
    }

    for (const row of (data ?? []) as Record<string, unknown>[]) {
      const id = row[col] as string;
      const cur = result.get(id) ?? {
        totalPaye: 0,
        nbPaiements: 0,
        dernierPaiement: null,
      };
      cur.totalPaye += (row.montant as number) ?? 0;
      cur.nbPaiements += 1;
      const d = row.date_paiement as string | null;
      if (d && (!cur.dernierPaiement || d > cur.dernierPaiement)) {
        cur.dernierPaiement = d;
      }
      result.set(id, cur);
    }

    return result;
  } catch (err) {
    console.error("fetchPaiementsRecapForInscriptions:", err);
    return result;
  }
}
