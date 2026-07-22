import "server-only";
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
