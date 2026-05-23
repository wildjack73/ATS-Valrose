/**
 * Données des stages ATS Valrose.
 * Si les tarifs/dates changent, modifier ce fichier puis redéployer.
 */

export type FormuleId = "formule_1" | "formule_2" | "formule_3" | "formule_4";
export type Creneau = "matin" | "apres_midi";
export type OptionF4 = "option_1" | "option_2" | "option_3";
export type JourSemaine =
  | "lundi"
  | "mardi"
  | "mercredi"
  | "jeudi"
  | "vendredi";

export type Formule = {
  id: FormuleId;
  titre: string;
  sousTitre: string;
  description: string;
  prix?: number;        // F1, F2, F3 ont un prix fixe (€/semaine)
  needsCreneau?: boolean; // F1, F2 demandent matin ou après-midi
  hasDejeunerOption?: boolean; // F3
  isALaCarte?: boolean; // F4
  detailsHoraires: string;
};

export const FORMULES: Formule[] = [
  {
    id: "formule_1",
    titre: "Formule 1 — Baby Tennis",
    sousTitre: "À partir de 3 ans",
    description: "1h30 de tennis par jour, lundi au vendredi.",
    prix: 110,
    needsCreneau: true,
    detailsHoraires: "Créneau 9h-10h30 ou 14h-15h30",
  },
  {
    id: "formule_2",
    titre: "Formule 2 — Demi-journée (3h)",
    sousTitre: "Matin ou après-midi",
    description:
      "Tennis, padel ou pickleball + goûter + multi-activités. Lundi au vendredi.",
    prix: 180,
    needsCreneau: true,
    detailsHoraires: "Matin 8h30-12h | Après-midi 13h30-17h",
  },
  {
    id: "formule_3",
    titre: "Formule 3 — Journée complète",
    sousTitre: "9h à 17h, au Club",
    description:
      "Programme matin + après-midi. Option déjeuner encadré par les moniteurs (+35€/semaine).",
    prix: 280,
    hasDejeunerOption: true,
    detailsHoraires: "8h30-17h",
  },
  {
    id: "formule_4",
    titre: "Formule 4 — À la carte",
    sousTitre: "Choisissez vos jours",
    description:
      "Tarif selon les options choisies, jour par jour. Idéal si vous n'êtes pas disponible toute la semaine.",
    isALaCarte: true,
    detailsHoraires: "Choix par jour",
  },
];

export const OPTIONS_F4: Record<
  OptionF4,
  { label: string; prix: number; detail: string }
> = {
  option_1: { label: "Option 1", prix: 25, detail: "Matin ou après-midi (1h30)" },
  option_2: { label: "Option 2", prix: 35, detail: "Matin ou après-midi (2h30)" },
  option_3: { label: "Option 3", prix: 55, detail: "Journée complète" },
};

export const JOURS: { id: JourSemaine; label: string }[] = [
  { id: "lundi", label: "Lundi" },
  { id: "mardi", label: "Mardi" },
  { id: "mercredi", label: "Mercredi" },
  { id: "jeudi", label: "Jeudi" },
  { id: "vendredi", label: "Vendredi" },
];

export const PRIX_DEJEUNER = 35;

export type Semaine = {
  id: string;
  label: string;
  periode: string;
  ouverte: boolean;
};

/**
 * Semaines disponibles. Mettre `ouverte: false` pour cacher du formulaire
 * sans supprimer (pratique pour clôturer les inscriptions d'une semaine).
 */
export const SEMAINES: Semaine[] = [
  // ÉTÉ 2026
  { id: "ete_juillet_1", periode: "Été 2026 — Juillet", label: "Du 29/06 au 03/07", ouverte: true },
  { id: "ete_juillet_2", periode: "Été 2026 — Juillet", label: "Du 06/07 au 10/07", ouverte: true },
  { id: "ete_juillet_3", periode: "Été 2026 — Juillet", label: "Du 13/07 au 17/07", ouverte: true },
  { id: "ete_juillet_4", periode: "Été 2026 — Juillet", label: "Du 20/07 au 24/07", ouverte: true },
  { id: "ete_juillet_5", periode: "Été 2026 — Juillet", label: "Du 27/07 au 31/07", ouverte: true },
  { id: "ete_aout_1",    periode: "Été 2026 — Août",    label: "Du 03/08 au 07/08", ouverte: true },
  { id: "ete_aout_2",    periode: "Été 2026 — Août",    label: "Du 10/08 au 14/08", ouverte: true },
  { id: "ete_aout_3",    periode: "Été 2026 — Août",    label: "Du 17/08 au 21/08", ouverte: true },
  { id: "ete_aout_4",    periode: "Été 2026 — Août",    label: "Du 24/08 au 28/08", ouverte: true },
  // TOUSSAINT 2026
  { id: "toussaint_1", periode: "Toussaint 2026", label: "Du 19/10 au 23/10", ouverte: true },
  { id: "toussaint_2", periode: "Toussaint 2026", label: "Du 26/10 au 30/10", ouverte: true },
  // NOËL 2026
  { id: "noel_1", periode: "Noël 2026", label: "Du 21/12 au 25/12", ouverte: true },
  { id: "noel_2", periode: "Noël 2026", label: "Du 28/12 au 01/01", ouverte: true },
  // HIVER 2027
  { id: "hiver_1", periode: "Hiver 2027", label: "Du 15/02 au 19/02", ouverte: true },
  { id: "hiver_2", periode: "Hiver 2027", label: "Du 22/02 au 26/02", ouverte: true },
  // PRINTEMPS 2027
  { id: "printemps_1", periode: "Printemps 2027", label: "Du 12/04 au 16/04", ouverte: true },
  { id: "printemps_2", periode: "Printemps 2027", label: "Du 19/04 au 23/04", ouverte: true },
];

/**
 * Calcule le prix total d'une inscription stage.
 */
export function calculerPrix(input: {
  formule: FormuleId;
  dejeuner?: boolean;
  formule4Selection?: { jour: JourSemaine; option: OptionF4 }[];
}): number {
  const formule = FORMULES.find((f) => f.id === input.formule);
  if (!formule) return 0;

  if (formule.isALaCarte) {
    const items = input.formule4Selection ?? [];
    return items.reduce((sum, it) => sum + (OPTIONS_F4[it.option]?.prix ?? 0), 0);
  }

  let total = formule.prix ?? 0;
  if (input.formule === "formule_3" && input.dejeuner) {
    total += PRIX_DEJEUNER;
  }
  return total;
}
