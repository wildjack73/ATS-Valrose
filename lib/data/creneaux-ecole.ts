/**
 * Source UNIQUE des créneaux école proposés sur le formulaire public.
 * Utilisée par :
 *  - EcoleForm.tsx          (rendu des pills de disponibilité + places restantes)
 *  - EcoleTable.tsx         (filtre Créneau dans l'admin)
 *  - CreneauxEcoleEditor.tsx (édition des dispos d'une inscription)
 *  - CapacitesEditor.tsx    (édition du nombre de places par créneau)
 *
 * La STRUCTURE (libellés, regroupements) est définie ici, en code. Seul le
 * NOMBRE de places par créneau est éditable depuis l'admin (stocké en base,
 * cf. lib/data/ecole-capacites.ts).
 *
 * NB : la VALEUR stockée en DB sur les inscriptions est le `label` (texte exact
 * tel qu'il apparaît sur la pill), pas un code. Ce `label` sert aussi de clé
 * pour les capacités → il doit être unique.
 *
 * Ce fichier ne dépend d'aucun module server-only : importable client + serveur.
 */

export type CreneauCategorie = "jeunes" | "adultes_tennis" | "padel";

/** Entrée à plat (label + catégorie) — pour les filtres admin. */
export interface CreneauEcole {
  /** Texte exact stocké en DB (dispo_mercredi / samedi / semaine) */
  label: string;
  /** Catégorie pour grouper l'affichage dans le filtre */
  categorie: CreneauCategorie;
}

export type CreneauOption = {
  /** Valeur stockée en DB + clé des capacités. Doit être unique. */
  label: string;
  /** Texte affiché sur la pastille. */
  display: string;
  /** Capacité par défaut (code). undefined = illimité (cas des cours jeunes).
   *  Seuls les créneaux ayant un defaultMax sont gérables depuis l'admin. */
  defaultMax?: number;
  /** Petite mention entre parenthèses (« non débutant », etc.). */
  note?: string;
};

export type CreneauGroupe = { titre: string; options: CreneauOption[] };

export type CreneauSection = {
  categorie: CreneauCategorie;
  titre: string;
  groupes: CreneauGroupe[];
};

/**
 * Définition complète et structurée des créneaux École, dans l'ordre
 * d'affichage du formulaire (Jeunes, Adultes Tennis, Padel).
 */
export const SECTIONS_CRENEAUX: CreneauSection[] = [
  {
    categorie: "jeunes",
    titre: "🎾 Cours jeunes",
    groupes: [
      {
        titre: "Mercredi",
        options: [
          { label: "Mercredi matin", display: "matin" },
          { label: "Mercredi Après-midi", display: "Après-midi" },
        ],
      },
      {
        titre: "Samedi",
        options: [
          { label: "Samedi matin", display: "matin" },
          { label: "Samedi Après-midi", display: "Après-midi" },
        ],
      },
      {
        titre: "Soir en semaine",
        options: [
          { label: "Lundi soir", display: "Lundi" },
          { label: "Mardi soir", display: "Mardi" },
          { label: "Jeudi soir", display: "Jeudi" },
          { label: "Vendredi soir", display: "Vendredi" },
        ],
      },
    ],
  },
  {
    categorie: "adultes_tennis",
    titre: "🎾 Cours Adultes Tennis",
    groupes: [
      {
        titre: "Soir en semaine — 18h30-20h",
        options: [
          { label: "Lundi 18h30-20h", display: "Lundi", defaultMax: 5 },
          { label: "Mardi 18h30-20h", display: "Mardi", defaultMax: 5 },
          { label: "Jeudi 18h30-20h", display: "Jeudi", defaultMax: 5 },
          { label: "Vendredi 18h30-20h", display: "Vendredi", defaultMax: 5 },
        ],
      },
      {
        titre: "Samedi",
        options: [
          { label: "Samedi 9h-10h30", display: "9h-10h30", defaultMax: 15 },
          {
            label: "Samedi Après-midi",
            display: "Après-midi",
            defaultMax: 5,
            note: "non débutant",
          },
        ],
      },
      {
        titre: "Compétition — 20h-21h30",
        options: [
          {
            label: "Lundi 20h-21h30",
            display: "Lundi",
            defaultMax: 4,
            note: "niveau Compétition uniquement",
          },
        ],
      },
    ],
  },
  {
    categorie: "padel",
    titre: "🏓 Cours Padel",
    groupes: [
      {
        titre: "Après-midi",
        options: [
          {
            label: "Mercredi Après-midi (padel)",
            display: "Mercredi",
            defaultMax: 4,
          },
          {
            label: "Samedi Après-midi (padel)",
            display: "Samedi",
            defaultMax: 4,
          },
        ],
      },
      {
        titre: "Soir en semaine — 17h-18h30",
        options: [
          { label: "Lundi 17h-18h30 (padel)", display: "Lundi", defaultMax: 4 },
          { label: "Mardi 17h-18h30 (padel)", display: "Mardi", defaultMax: 4 },
          { label: "Jeudi 17h-18h30 (padel)", display: "Jeudi", defaultMax: 4 },
          {
            label: "Vendredi 17h-18h30 (padel)",
            display: "Vendredi",
            defaultMax: 4,
          },
        ],
      },
    ],
  },
];

/**
 * Liste À PLAT des créneaux (label + catégorie), dérivée de SECTIONS_CRENEAUX.
 * Dédupliquée par `label` (« Samedi Après-midi » est partagé jeunes/adultes →
 * conservé une seule fois, sous sa 1re catégorie). Utilisée par les filtres
 * admin.
 */
export const CRENEAUX_ECOLE: CreneauEcole[] = (() => {
  const seen = new Set<string>();
  const out: CreneauEcole[] = [];
  for (const section of SECTIONS_CRENEAUX) {
    for (const groupe of section.groupes) {
      for (const option of groupe.options) {
        if (seen.has(option.label)) continue;
        seen.add(option.label);
        out.push({ label: option.label, categorie: section.categorie });
      }
    }
  }
  return out;
})();

export function categorieLabel(c: CreneauCategorie): string {
  switch (c) {
    case "jeunes":
      return "Jeunes";
    case "adultes_tennis":
      return "Adultes Tennis";
    case "padel":
      return "Padel";
  }
}

/**
 * Normalise un libellé de créneau pour la comparaison d'occupation (insensible
 * casse / espaces). Sert au comptage des places occupées (slotsOccupes).
 *
 * IMPORTANT : on retire UNIQUEMENT les vieux suffixes parasites du type
 * « (5 places max) » présents dans d'anciennes données. On CONSERVE les
 * marqueurs significatifs comme « (padel) », sinon un créneau padel
 * (« Mercredi Après-midi (padel) ») serait confondu avec le créneau jeunes
 * homonyme (« Mercredi Après-midi ») et compterait ses inscrits.
 */
export function normalizeSlot(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*\([^)]*places?\s*max[^)]*\)/g, "") // « (5 places max) » → bruit
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Capacité effective d'un créneau : override admin (si une ligne existe en DB
 * pour ce `label`) sinon valeur par défaut du code. Renvoie `undefined` =
 * illimité.
 *
 * Tant qu'aucun override n'existe, le comportement par défaut est préservé :
 * les créneaux Tennis/Padel utilisent leur `defaultMax`, les cours jeunes
 * (sans `defaultMax`) restent illimités.
 */
export function capaciteEffective(
  option: CreneauOption,
  capacites: Record<string, number | null>,
): number | undefined {
  if (option.label in capacites) {
    return capacites[option.label] ?? undefined; // null = illimité explicite
  }
  return option.defaultMax; // undefined pour les jeunes = illimité
}

/**
 * Capacité par défaut (code) associée à un `label`, tous cours confondus.
 * Un label partagé (ex. « Samedi Après-midi » jeunes + adultes) prend la
 * valeur définie sur la variante qui en a une (l'adulte, 5). undefined =
 * illimité par défaut (cas des créneaux jeunes purs).
 */
export function defaultMaxForLabel(label: string): number | undefined {
  let def: number | undefined = undefined;
  for (const section of SECTIONS_CRENEAUX) {
    for (const groupe of section.groupes) {
      for (const option of groupe.options) {
        if (option.label === label && option.defaultMax !== undefined) {
          def = option.defaultMax;
        }
      }
    }
  }
  return def;
}

/**
 * Liste des créneaux gérables depuis l'admin, dédupliquée par `label`.
 * Un label partagé entre catégories (ex. « Samedi Après-midi ») n'apparaît
 * qu'une fois — sur la variante qui porte une capacité par défaut (adultes),
 * car le réglage est commun (même valeur stockée en DB).
 */
export function listCreneauxGerables(): {
  categorie: CreneauCategorie;
  sectionTitre: string;
  groupeTitre: string;
  option: CreneauOption;
}[] {
  type Entry = {
    categorie: CreneauCategorie;
    sectionTitre: string;
    groupeTitre: string;
    option: CreneauOption;
  };
  const byLabel = new Map<string, Entry>();
  for (const section of SECTIONS_CRENEAUX) {
    for (const groupe of section.groupes) {
      for (const option of groupe.options) {
        const entry: Entry = {
          categorie: section.categorie,
          sectionTitre: section.titre,
          groupeTitre: groupe.titre,
          option,
        };
        const existing = byLabel.get(option.label);
        // On garde la variante qui porte un defaultMax (réglage de référence).
        if (
          !existing ||
          (existing.option.defaultMax === undefined &&
            option.defaultMax !== undefined)
        ) {
          byLabel.set(option.label, entry);
        }
      }
    }
  }
  return [...byLabel.values()];
}
