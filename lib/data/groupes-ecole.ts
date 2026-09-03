/**
 * Vue « Groupes École » — modèle DÉRIVÉ (pas de table de groupes).
 *
 * Chaque élève coché « Ajouté au groupe » est rangé par son HORAIRE EFFECTIF :
 *   1. horaire_confirme (saisi en admin) s'il est rempli,
 *   2. sinon l'horaire déduit tout seul quand un seul créneau est possible,
 *   3. sinon son unique créneau de dispo,
 *   4. sinon "" → bac « À classer ».
 *
 * On affecte ensuite un coach à chaque élève (colonne = coach dans la grille),
 * ce qui permet de scinder un même créneau entre plusieurs coachs.
 *
 * Client-safe : réutilisé côté serveur (requête) ET client (composant).
 */
import { horaireOptionsFor } from "@/lib/data/horaires-ecole";

export interface GroupeEleveRow {
  id: string;
  prenom: string;
  nom: string;
  date_naissance: string;
  cours_tennis: string[] | null;
  cours_padel: string[] | null;
  cours_pickleball: string[] | null;
  dispo_mercredi: string | null;
  dispo_samedi: string | null;
  dispo_semaine: string | null;
  horaire_confirme: string | null;
  ajoute_au_groupe: boolean;
  coach_id: string | null;
  telephone: string;
}

/** Libellé du bac des élèves sans horaire déterminable. */
export const A_CLASSER = "À classer";

/** Créneaux de dispo d'un élève, éclatés (un libellé par créneau). */
export function dispoLabelsOf(row: {
  dispo_mercredi: string | null;
  dispo_samedi: string | null;
  dispo_semaine: string | null;
}): string[] {
  return [row.dispo_mercredi, row.dispo_samedi, row.dispo_semaine]
    .filter((x): x is string => Boolean(x && x.trim()))
    .flatMap((s) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    );
}

/**
 * Horaire effectif d'un élève (voir cascade en tête de fichier).
 * Retourne "" quand indéterminable (→ « À classer »).
 */
export function effectiveHoraireLabel(
  row: {
    cours_tennis: string[] | null;
    dispo_mercredi: string | null;
    dispo_samedi: string | null;
    dispo_semaine: string | null;
    horaire_confirme: string | null;
  },
  horaires: Record<string, string>,
): string {
  const confirmed = row.horaire_confirme?.trim();
  if (confirmed) return confirmed;

  const dispoLabels = dispoLabelsOf(row);
  const options = horaireOptionsFor(
    horaires,
    (row.cours_tennis ?? []) as string[],
    dispoLabels,
  );
  if (options.length === 1) return options[0];
  if (dispoLabels.length === 1) return dispoLabels[0];
  return "";
}

const JOURS_ORDRE = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

/**
 * Clé de tri d'un libellé horaire : jour (0-6) puis 1re heure trouvée (minutes).
 * Les libellés « À classer » / non reconnus sont renvoyés en dernier.
 */
export function horaireSortKey(label: string): number {
  const low = label.toLowerCase();
  let jour = 9;
  for (let i = 0; i < JOURS_ORDRE.length; i++) {
    if (low.includes(JOURS_ORDRE[i])) {
      jour = i;
      break;
    }
  }
  const m = low.match(/(\d{1,2})\s*h\s*(\d{2})?/);
  const minutes = m ? parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0) : 9999;
  return jour * 100000 + minutes;
}
