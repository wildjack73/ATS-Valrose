/**
 * Niveaux Galaxie Tennis (FFT) — utilisés par les profs pour situer chaque
 * élève dans la progression. Liste partagée entre admin (édition + filtre)
 * et toutes les vues qui affichent une inscription.
 *
 * Les valeurs stockées en DB (champ `niveau`) sont les CODES ci-dessous.
 * Pour les anciennes inscriptions, on peut trouver du texte libre (ex.
 * « Intermédiaire ») — on l'affiche tel quel et on propose au prof de
 * le reclasser via le dropdown.
 */

export type NiveauCode =
  | "blanc"
  | "violet"
  | "rouge"
  | "rouge_1"
  | "rouge_2"
  | "orange"
  | "orange_1"
  | "orange_2"
  | "vert"
  | "vert_1"
  | "vert_2";

export interface Niveau {
  code: NiveauCode;
  label: string;
  /** Couleur de fond (HEX) pour le badge */
  bg: string;
  /** Couleur de texte sur ce fond, pour rester lisible */
  text: string;
  /** Bordure (pour le fond clair) */
  border: string;
  order: number;
}

export const NIVEAUX_TENNIS: Niveau[] = [
  { code: "blanc",    label: "Blanc",    bg: "#ffffff", text: "#1a2540", border: "#c9d2e2", order: 1 },
  { code: "violet",   label: "Violet",   bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd", order: 2 },
  { code: "rouge",    label: "Rouge",    bg: "#fee2e2", text: "#991b1b", border: "#fca5a5", order: 3 },
  { code: "rouge_1",  label: "Rouge 1",  bg: "#fecaca", text: "#7f1d1d", border: "#f87171", order: 4 },
  { code: "rouge_2",  label: "Rouge 2",  bg: "#fca5a5", text: "#7f1d1d", border: "#ef4444", order: 5 },
  { code: "orange",   label: "Orange",   bg: "#ffedd5", text: "#9a3412", border: "#fdba74", order: 6 },
  { code: "orange_1", label: "Orange 1", bg: "#fed7aa", text: "#7c2d12", border: "#fb923c", order: 7 },
  { code: "orange_2", label: "Orange 2", bg: "#fdba74", text: "#7c2d12", border: "#f97316", order: 8 },
  { code: "vert",     label: "Vert",     bg: "#dcfce7", text: "#166534", border: "#86efac", order: 9 },
  { code: "vert_1",   label: "Vert 1",   bg: "#bbf7d0", text: "#14532d", border: "#4ade80", order: 10 },
  { code: "vert_2",   label: "Vert 2",   bg: "#86efac", text: "#14532d", border: "#22c55e", order: 11 },
];

const BY_CODE = new Map(NIVEAUX_TENNIS.map((n) => [n.code, n]));

/** Convertit une valeur DB (peut être un code OU du texte libre legacy)
 *  en niveau structuré. Retourne null si valeur vide ou non reconnue. */
export function parseNiveau(raw: string | null | undefined): Niveau | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (BY_CODE.has(cleaned as NiveauCode)) {
    return BY_CODE.get(cleaned as NiveauCode)!;
  }
  // Tente une correspondance lâche : « rouge1 » → « rouge_1 »
  const compact = cleaned.replace(/_/g, "");
  for (const n of NIVEAUX_TENNIS) {
    if (n.code.replace(/_/g, "") === compact) return n;
  }
  return null;
}

/** Renvoie le code stable correspondant à un libellé tapé librement, ou
 *  null si on ne reconnaît pas. Utilisé pour normaliser à l'enregistrement. */
export function niveauCodeFromInput(raw: string): NiveauCode | null {
  return parseNiveau(raw)?.code ?? null;
}

/** Pour le tri par sévérité/progression (utile dans les listes). */
export function niveauOrder(raw: string | null | undefined): number {
  return parseNiveau(raw)?.order ?? 999;
}
