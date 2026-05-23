/**
 * Types pour les tarifs stockés en DB (multi-saison).
 * Pas de `server-only` ici : utilisables en composants client (en props).
 */

export interface Saison {
  id: string;
  code: string;
  label: string;
  active: boolean;
  order_idx: number;
  created_at?: string;
}

export interface Formule {
  id: string;
  saison_id: string;
  code: string;            // 'formule_1' ...
  titre: string;
  sous_titre: string | null;
  description: string | null;
  prix: number | null;
  needs_creneau: boolean;
  has_dejeuner_option: boolean;
  is_a_la_carte: boolean;
  prix_dejeuner: number;
  details_horaires: string | null;
  order_idx: number;
}

export interface OptionF4 {
  id: string;
  saison_id: string;
  code: string;
  label: string;
  prix: number;
  detail: string | null;
  order_idx: number;
}

export interface Semaine {
  id: string;
  saison_id: string;
  code: string;
  periode: string;
  label: string;
  date_debut: string | null;
  ouverte: boolean;
  order_idx: number;
}

export interface CoursEcole {
  id: string;
  saison_id: string;
  type: "tennis" | "padel";
  code: string;
  label: string;
  prix: number;
  order_idx: number;
}

export interface LicenceFftRow {
  id: string;
  saison_id: string;
  code: string;
  label: string;
  prix: number;
  order_idx: number;
}

export interface TarifAutre {
  id: string;
  saison_id: string;
  category: "lecons" | "locations" | "materiel";
  label: string;
  prix: string;
  detail: string | null;
  order_idx: number;
}

/**
 * Bundle complet des tarifs d'une saison, prêt à être passé en props
 * du serveur aux composants client.
 */
export interface TarifsBundle {
  saison: Saison;
  formules: Formule[];
  optionsF4: OptionF4[];
  semaines: Semaine[];
  coursTennis: CoursEcole[];
  coursPadel: CoursEcole[];
  licenceFft: LicenceFftRow[];
  autres: TarifAutre[];
}

export interface JourSemaine {
  id: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi";
  label: string;
}

export const JOURS_SEMAINE: JourSemaine[] = [
  { id: "lundi", label: "Lundi" },
  { id: "mardi", label: "Mardi" },
  { id: "mercredi", label: "Mercredi" },
  { id: "jeudi", label: "Jeudi" },
  { id: "vendredi", label: "Vendredi" },
];
