-- ============================================================================
-- Horaires exacts par cours × créneau (École), saisis depuis l'admin.
-- cle = "<type>:<cours_code>:<créneau libellé>" (ex. "tennis:baby_tennis:Mercredi matin")
-- Idempotent.
-- ============================================================================
create table if not exists public.horaires_ecole (
  id uuid primary key default gen_random_uuid(),
  saison_id uuid not null references public.saisons(id) on delete cascade,
  cle text not null,
  horaire text not null,
  updated_at timestamptz not null default now(),
  unique (saison_id, cle)
);

create index if not exists idx_horaires_ecole_saison
  on public.horaires_ecole(saison_id);

alter table public.horaires_ecole enable row level security;
-- Aucune policy publique : seul le service_role (admin) lit/écrit.
