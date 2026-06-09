/**
 * Liste centralisée des créneaux école proposés sur le formulaire public.
 * Utilisée par :
 *  - EcoleForm.tsx (rendu des pills de disponibilité)
 *  - EcoleTable.tsx (filtre Créneau dans l'admin)
 *
 * Garder la liste alignée avec ce qui est rendu dans le formulaire — toute
 * nouvelle pill ajoutée doit aussi figurer ici, pour que le filtre admin
 * puisse la proposer même sans inscription existante.
 *
 * NB : la VALEUR stockée en DB sur les inscriptions est le `label` (texte
 * exact tel qu'il apparaît sur la pill), pas un code.
 */

export type CreneauCategorie = "jeunes" | "adultes_tennis" | "padel";

export interface CreneauEcole {
  /** Texte exact stocké en DB (dispo_mercredi / samedi / semaine) */
  label: string;
  /** Catégorie pour grouper l'affichage dans le filtre */
  categorie: CreneauCategorie;
}

export const CRENEAUX_ECOLE: CreneauEcole[] = [
  // ----- Jeunes (Tennis) -----
  { label: "Mercredi matin", categorie: "jeunes" },
  { label: "Mercredi Après-midi", categorie: "jeunes" },
  { label: "Samedi matin", categorie: "jeunes" },
  { label: "Samedi Après-midi", categorie: "jeunes" },
  { label: "Lundi soir", categorie: "jeunes" },
  { label: "Mardi soir", categorie: "jeunes" },
  { label: "Jeudi soir", categorie: "jeunes" },
  { label: "Vendredi soir", categorie: "jeunes" },

  // ----- Adultes Tennis -----
  { label: "Lundi 18h30-20h", categorie: "adultes_tennis" },
  { label: "Mardi 18h30-20h", categorie: "adultes_tennis" },
  { label: "Jeudi 18h30-20h", categorie: "adultes_tennis" },
  { label: "Vendredi 18h30-20h", categorie: "adultes_tennis" },
  { label: "Lundi 20h-21h30", categorie: "adultes_tennis" },
  { label: "Samedi 9h-10h30", categorie: "adultes_tennis" },
  // « Samedi Après-midi » existe aussi pour les jeunes — même valeur stockée
  // donc pas besoin de la dupliquer (on filtre par label).

  // ----- Padel -----
  { label: "Mercredi Après-midi (padel)", categorie: "padel" },
  { label: "Samedi Après-midi (padel)", categorie: "padel" },
  { label: "Lundi 17h-18h30 (padel)", categorie: "padel" },
  { label: "Mardi 17h-18h30 (padel)", categorie: "padel" },
  { label: "Jeudi 17h-18h30 (padel)", categorie: "padel" },
  { label: "Vendredi 17h-18h30 (padel)", categorie: "padel" },
];

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
