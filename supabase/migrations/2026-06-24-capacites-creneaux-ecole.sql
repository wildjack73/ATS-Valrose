-- Capacités (nombre de places) par créneau de l'École, éditables depuis l'admin.
--
-- Avant : le nombre de places de chaque créneau était écrit en dur dans
-- app/ecole/EcoleForm.tsx. Désormais, l'admin peut le modifier par saison.
--
-- Cette table ne contient QUE les overrides : un créneau sans ligne utilise la
-- valeur par défaut définie dans le code (lib/data/creneaux-ecole.ts).
--
-- Clé fonctionnelle : (saison_id, creneau_key) où creneau_key est le LIBELLÉ
-- COMPLET du créneau (ex: "Lundi 18h30-20h", "Samedi Après-midi (padel)").
-- capacite = nombre de places ; NULL = illimité.

create table if not exists public.capacites_creneaux_ecole (
  id uuid primary key default gen_random_uuid(),
  saison_id uuid not null references public.saisons(id) on delete cascade,
  creneau_key text not null,
  capacite int,
  updated_at timestamptz not null default now(),
  unique (saison_id, creneau_key)
);

create index if not exists idx_capacites_creneaux_saison
  on public.capacites_creneaux_ecole(saison_id);

-- RLS : pas de policy public — seul service_role lit/modifie (comme les autres
-- tables de config tarifaire). Le formulaire public lit via les API/server.
alter table public.capacites_creneaux_ecole enable row level security;
