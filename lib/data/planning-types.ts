/**
 * Types pour le module Planning École.
 */

export interface Coach {
  id: string;
  nom: string;
  couleur: string | null;
  actif: boolean;
  order_idx: number;
}

export type JourSemaine =
  | "lundi"
  | "mardi"
  | "mercredi"
  | "jeudi"
  | "vendredi"
  | "samedi";

export const JOURS_LABELS: Record<JourSemaine, string> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
};

export const JOURS_ORDER: JourSemaine[] = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

export interface GroupeEcole {
  id: string;
  saison_id: string;
  jour: JourSemaine;
  heure_debut: string;        // "17:00:00"
  heure_fin: string | null;
  court: string | null;
  coach_id: string | null;
  niveau: string | null;
  capacite_max: number;
  notes: string | null;
  order_idx: number;
}

/** Vue enrichie d'un groupe avec son coach et ses membres */
export interface GroupeWithMembers extends GroupeEcole {
  coach: Coach | null;
  membres: GroupeMembre[];
}

export interface GroupeMembre {
  inscription_id: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  niveau: string | null;
  email: string;
  telephone: string;
}

/** Format court "HH:MM" depuis une heure pg "HH:MM:SS" */
export function formatHeure(h: string | null): string {
  if (!h) return "";
  return h.slice(0, 5);
}
