/**
 * Structure de la grille « Horaires exacts » (École) — saisie admin.
 *
 * Seuls les cours TENNIS JEUNES ont des créneaux « flous » (« Mercredi
 * matin »…) qui nécessitent un horaire exact. Le padel, le pickleball et les
 * cours adultes ont déjà leur horaire dans le libellé du créneau.
 *
 * La `cle` = "tennis:<code>:<libellé créneau>" ; le libellé créneau reprend
 * EXACTEMENT les labels de creneaux-ecole.ts (ceux stockés dans dispo_semaine),
 * pour que l'email de confirmation puisse retrouver l'horaire.
 *
 * Pas de dépendance server-only : importable client + serveur.
 */

/** Cours tennis jeunes concernés (code + libellé + repère public). */
export const COURS_HORAIRES: { code: string; label: string; detail: string }[] =
  [
    { code: "baby_tennis", label: "Baby Tennis", detail: "dès 3 ans · 1h/sem" },
    { code: "mini_tennis", label: "Mini Tennis", detail: "dès 5 ans · 1h/sem" },
    { code: "initiation", label: "Initiation", detail: "dès 6 ans · 1h/sem" },
    {
      code: "perfectionnement",
      label: "Perfectionnement",
      detail: "dès 7 ans · 1h30/sem",
    },
    {
      code: "centre_entrainement",
      label: "Centre d'Entraînement",
      detail: "confirmés · 3h/sem",
    },
    {
      code: "demi_journee",
      label: "Demi-journée",
      detail: "multi-activités · 3h/sem",
    },
  ];

/** Créneaux jeunes (mêmes libellés que creneaux-ecole.ts / dispo_semaine). */
export const CRENEAUX_HORAIRES: string[] = [
  "Mercredi matin",
  "Mercredi Après-midi",
  "Samedi matin",
  "Samedi Après-midi",
  "Lundi soir",
  "Mardi soir",
  "Jeudi soir",
  "Vendredi soir",
];

/** Clé de stockage d'un horaire (unique par saison). */
export function horaireCle(coursCode: string, creneauLabel: string): string {
  return `tennis:${coursCode}:${creneauLabel}`;
}

/** Récupère l'horaire exact pour (cours, créneau) dans la map, ou "". */
export function horaireFor(
  horaires: Record<string, string>,
  coursCode: string,
  creneauLabel: string,
): string {
  return horaires[horaireCle(coursCode, creneauLabel)] ?? "";
}

/**
 * Options d'un menu déroulant « horaire exact » pour un élève : pour chacun de
 * ses créneaux choisis (dispoLabels) et de ses cours (coursCodes), on éclate
 * la liste d'horaires (« 9h-10h, 10h-11h ») en options « Créneau — 9h-10h ».
 * Dédupliqué, dans l'ordre des créneaux.
 */
export function horaireOptionsFor(
  horaires: Record<string, string>,
  coursCodes: string[],
  dispoLabels: string[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const creneau of dispoLabels) {
    for (const code of coursCodes) {
      const h = horaireFor(horaires, code, creneau);
      if (!h) continue;
      for (const slot of h
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)) {
        const opt = `${creneau} — ${slot}`;
        if (!seen.has(opt)) {
          seen.add(opt);
          out.push(opt);
        }
      }
    }
  }
  return out;
}

