-- Horaire exact confirmé (choisi par l'admin dans un menu déroulant) par élève.
alter table public.inscriptions_ecole
  add column if not exists horaire_confirme text;
