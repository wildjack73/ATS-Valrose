/**
 * Tarifs annexes (leçons individuelles, locations, matériel).
 * Page d'information uniquement, pas de réservation en ligne.
 * Modifier ici puis redéployer pour mettre à jour.
 */

export const LECONS_INDIVIDUELLES = [
  { label: "Leçon Tennis (1 joueur)",        prix: "40€/h", detail: "ou 380€ le carnet de 10h" },
  { label: "Leçon Tennis pour 2 joueurs",    prix: "48€/h" },
  { label: "Leçon Tennis pour 3 joueurs",    prix: "50€/h" },
  { label: "Leçon Tennis étudiant",          prix: "35€/h" },
  { label: "Leçon Padel (semaine)",          prix: "60€/h" },
  { label: "Leçon Padel (week-end)",         prix: "70€/h" },
];

export const LOCATIONS = [
  { label: "Location court Tennis (semaine)",   prix: "16€/h" },
  { label: "Location court Tennis (week-end)",  prix: "20€/h" },
  { label: "Location court Padel",              prix: "40€ / 1h30" },
  { label: "Location court Pickleball",         prix: "20€ / 1h30" },
];

export const MATERIEL = [
  { label: "Tube de balles tennis",   prix: "9€" },
  { label: "Tube de balles padel",    prix: "8€" },
  { label: "Location raquette",       prix: "5€ / raquette" },
];
