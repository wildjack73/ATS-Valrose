-- Ajoute un flag « ferme » (boolean) sur chaque cours école et chaque
-- formule de stage, pour permettre au club de fermer temporairement
-- certaines réservations sans supprimer l'option (ex: cours complet).

alter table public.tarifs_cours_ecole
  add column if not exists ferme boolean default false;

alter table public.tarifs_stages_formules
  add column if not exists ferme boolean default false;
