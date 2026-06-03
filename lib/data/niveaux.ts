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
  { code: "blanc",    label: "Blanc",    bg: "#ffffff", text: "#1f2937", border: "#9ca3af", order: 1 },
  { code: "violet",   label: "Violet",   bg: "#7c3aed", text: "#ffffff", border: "#6d28d9", order: 2 },
  { code: "rouge",    label: "Rouge",    bg: "#ef4444", text: "#ffffff", border: "#dc2626", order: 3 },
  { code: "rouge_1",  label: "Rouge 1",  bg: "#dc2626", text: "#ffffff", border: "#b91c1c", order: 4 },
  { code: "rouge_2",  label: "Rouge 2",  bg: "#991b1b", text: "#ffffff", border: "#7f1d1d", order: 5 },
  { code: "orange",   label: "Orange",   bg: "#f97316", text: "#ffffff", border: "#ea580c", order: 6 },
  { code: "orange_1", label: "Orange 1", bg: "#ea580c", text: "#ffffff", border: "#c2410c", order: 7 },
  { code: "orange_2", label: "Orange 2", bg: "#c2410c", text: "#ffffff", border: "#9a3412", order: 8 },
  { code: "vert",     label: "Vert",     bg: "#22c55e", text: "#ffffff", border: "#16a34a", order: 9 },
  { code: "vert_1",   label: "Vert 1",   bg: "#16a34a", text: "#ffffff", border: "#15803d", order: 10 },
  { code: "vert_2",   label: "Vert 2",   bg: "#15803d", text: "#ffffff", border: "#166534", order: 11 },
];

const BY_CODE = new Map(NIVEAUX_TENNIS.map((n) => [n.code, n]));

/** Convertit une valeur DB (peut être un code OU du texte libre legacy)
 *  en niveau structuré. Retourne null si valeur vide ou non reconnue. */
export function parseNiveau(raw: string | null | undefined): Niveau | null {
  if (!raw) return null;
  let s = raw.trim().toLowerCase();
  // Retire le contenu entre parenthèses : « rouge (6-7 ans) » → « rouge »
  s = s.replace(/\([^)]*\)/g, " ");
  // Retire les mentions d'âge résiduelles : « vert 8-9 ans » → « vert »
  s = s.replace(/\b\d+\s*(?:-|à|et)?\s*\d*\s*ans?\b.*/g, " ");
  const cleaned = s.trim().replace(/[\s-]+/g, "_").replace(/^_+|_+$/g, "");
  if (!cleaned) return null;
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

/**
 * Identifiant d'élève stable, partagé entre toutes les vues (stages, école,
 * archives, annuaire) pour synchroniser le niveau attribué par élève.
 * Basé sur nom + prénom normalisés (les frères/sœurs ont des prénoms
 * différents → clés distinctes).
 */
export function eleveKey(
  nom: string | null | undefined,
  prenom: string | null | undefined,
): string {
  const n = (nom ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const p = (prenom ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return `np:${n}|${p}`;
}

/** Âge en années à partir d'une date de naissance (ISO ou texte JJ/MM/AAAA).
 *  Retourne null si non parsable. Sert à exclure les adultes du niveau. */
export function ageFromDateNaissance(
  raw: string | null | undefined,
): number | null {
  if (!raw) return null;
  // pg peut renvoyer un objet Date pour une colonne `date` → on le normalise
  const str = typeof raw === "string" ? raw : String(raw);
  let d: Date | null = null;
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  } else {
    const fr = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (fr) {
      const y = Number(fr[3]) < 100 ? 2000 + Number(fr[3]) : Number(fr[3]);
      d = new Date(y, Number(fr[2]) - 1, Number(fr[1]));
    }
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

/** Un élève est considéré « adulte » (donc hors niveau Galaxie) si son âge
 *  est >= 18. Sans date de naissance → on considère jeune (on affiche le
 *  sélecteur). */
export function estAdulte(dateNaissance: string | null | undefined): boolean {
  const age = ageFromDateNaissance(dateNaissance);
  return age !== null && age >= 18;
}
