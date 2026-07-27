import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Semaine } from "@/lib/data/tarifs-types";

/**
 * Page planning publique « secrète » (coachs) — /planning-stages/<jeton>.
 *
 * Le jeton n'est PAS un vrai mécanisme d'authentification : toute personne
 * disposant du lien voit la page (qui contient les noms des enfants). La page
 * est donc en `noindex` et le lien ne doit être partagé qu'aux encadrants.
 *
 * Surchargeable via la variable d'environnement PLANNING_PUBLIC_TOKEN
 * (permet de « révoquer » l'ancien lien sans redéployer le code).
 */
const TOKEN_PAR_DEFAUT = "UBfCmXMjip19WLZcgec_SIWcOcYyce33";

export function getPlanningToken(): string {
  return process.env.PLANNING_PUBLIC_TOKEN || TOKEN_PAR_DEFAUT;
}

/** Comparaison en temps constant pour éviter les attaques par timing. */
export function planningTokenValide(recu: string): boolean {
  const attendu = getPlanningToken();
  if (recu.length !== attendu.length) return false;
  let diff = 0;
  for (let i = 0; i < recu.length; i++) {
    diff |= recu.charCodeAt(i) ^ attendu.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Semaines du mois d'AOÛT, triées chronologiquement.
 * On se base sur `date_debut` (mois 7 = août) ; à défaut on retombe sur le
 * libellé de période (« Été 2026 — Août »).
 */
/**
 * Semaines d'août de la saison STAGES active, lues directement.
 *
 * On n'utilise volontairement PAS `getActiveTarifsBundle()` : celui-ci exige
 * aussi la saison ÉCOLE + cours + licences (8 requêtes) et renvoie null si un
 * seul maillon échoue — une dépendance inutile pour un planning de stages.
 * Ici : 2 requêtes, et [] en cas de problème.
 */
export async function fetchSemainesAout(): Promise<Semaine[]> {
  try {
    const supa = getSupabaseAdmin();
    const { data: saison, error: e1 } = await supa
      .from("saisons")
      .select("id")
      .eq("domaine", "stages")
      .eq("active", true)
      .maybeSingle();
    if (e1) throw e1;
    if (!saison) return [];

    const { data, error: e2 } = await supa
      .from("semaines_stages")
      .select("*")
      .eq("saison_id", (saison as { id: string }).id)
      .order("order_idx");
    if (e2) throw e2;

    return semainesAout((data ?? []) as Semaine[]);
  } catch (err) {
    console.error("[planning] fetchSemainesAout:", err);
    return [];
  }
}

/**
 * Code de la semaine (parmi celles fournies) qui contient la date du jour,
 * ou null si aucune. On raisonne en semaine calendaire lundi → dimanche
 * (date_debut = lundi), pour qu'un samedi/dimanche compte encore comme « en
 * cours ».
 */
export function codeSemaineEnCours(semaines: Semaine[]): string | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const t = now.getTime();
  for (const s of semaines) {
    if (!s.date_debut) continue;
    const lundi = new Date(s.date_debut);
    if (Number.isNaN(lundi.getTime())) continue;
    lundi.setHours(0, 0, 0, 0);
    const dimanche = new Date(lundi);
    dimanche.setDate(dimanche.getDate() + 6);
    if (t >= lundi.getTime() && t <= dimanche.getTime()) return s.code;
  }
  return null;
}

export function semainesAout(semaines: Semaine[]): Semaine[] {
  return semaines
    .filter((s) => {
      if (s.date_debut) {
        const d = new Date(s.date_debut);
        if (!Number.isNaN(d.getTime())) return d.getMonth() === 7;
      }
      return /ao[uû]t/i.test(s.periode ?? "");
    })
    .sort((a, b) => {
      const da = a.date_debut ? new Date(a.date_debut).getTime() : 0;
      const db = b.date_debut ? new Date(b.date_debut).getTime() : 0;
      return da - db;
    });
}
