/**
 * Données École de Tennis ATS Valrose 2026-2027.
 * Si les tarifs/cours changent, modifier ce fichier puis redéployer.
 */

export type CoursItem = {
  id: string;
  label: string;
  prix: number;
};

/**
 * Cours Tennis — tarifs annuels (sauf Cours Adultes qui ont aussi une option trimestre).
 */
export const COURS_TENNIS: CoursItem[] = [
  { id: "baby_tennis",            label: "Baby Tennis (1h)",                 prix: 250 },
  { id: "mini_tennis",            label: "Mini Tennis (1h)",                 prix: 250 },
  { id: "initiation",             label: "Initiation (1h)",                  prix: 250 },
  { id: "perfectionnement",       label: "Perfectionnement (1h30)",          prix: 360 },
  { id: "centre_entrainement",    label: "Centre d'Entraînement (3h)",       prix: 720 },
  { id: "demi_journee",           label: "Demi-journée (3h)",                prix: 750 },
  { id: "cours_adultes_annuel",   label: "Cours Adultes (1h30, annuel)",     prix: 520 },
  { id: "cours_adultes_trimestre",label: "Cours Adultes (1h30, 1 trimestre)",prix: 180 },
];

export const COURS_PADEL: CoursItem[] = [
  { id: "perfectionnement",       label: "Perfectionnement Padel (1h30)",     prix: 450 },
  { id: "cours_adultes_annuel",   label: "Cours Adultes Padel (annuel)",       prix: 680 },
  { id: "cours_adultes_trimestre",label: "Cours Adultes Padel (1 trimestre)", prix: 240 },
];

export const COURS_PICKLEBALL: CoursItem[] = [
  { id: "cours_adultes_pickleball", label: "Cours Adultes Pickleball (1 trimestre)", prix: 180 },
];

export const MODES_REGLEMENT = [
  { id: "especes", label: "Espèces" },
  { id: "cheque",  label: "Chèque" },
] as const;

export const LICENCE_FFT = [
  { id: "non_adulte", label: "Non (adulte)" },
  { id: "oui_23",     label: "Oui — 23€ (7-18 ans)" },
  { id: "oui_13",     label: "Oui — 13€ (6 ans et moins)" },
] as const;

export type CoursTennisId = (typeof COURS_TENNIS)[number]["id"];
export type CoursPadelId = (typeof COURS_PADEL)[number]["id"];
export type CoursPickleballId = (typeof COURS_PICKLEBALL)[number]["id"];
export type ModeReglementId = (typeof MODES_REGLEMENT)[number]["id"];
export type LicenceFftId = (typeof LICENCE_FFT)[number]["id"];

/**
 * Tarif licence FFT (à ajouter au total).
 */
export const PRIX_LICENCE_FFT: Record<LicenceFftId, number> = {
  non_adulte: 0,
  oui_23: 23,
  oui_13: 13,
};

/**
 * Calcule le total d'une inscription école.
 */
export function calculerPrixEcole(input: {
  cours_tennis: CoursTennisId[];
  cours_padel: CoursPadelId[];
  licence_fft: LicenceFftId;
}): number {
  let total = 0;
  for (const id of input.cours_tennis) {
    total += COURS_TENNIS.find((c) => c.id === id)?.prix ?? 0;
  }
  for (const id of input.cours_padel) {
    total += COURS_PADEL.find((c) => c.id === id)?.prix ?? 0;
  }
  total += PRIX_LICENCE_FFT[input.licence_fft] ?? 0;
  return total;
}

/**
 * Pour la validation : un parent ne peut pas cocher "annuel" ET "trimestre" du même cours adultes.
 */
export function hasConflitAdultes(ids: string[]): boolean {
  return (
    ids.includes("cours_adultes_annuel") &&
    ids.includes("cours_adultes_trimestre")
  );
}
