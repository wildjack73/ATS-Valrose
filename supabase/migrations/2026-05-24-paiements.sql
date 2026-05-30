-- Table des paiements : 1 ligne = 1 encaissement reçu pour une inscription.
-- Un paiement appartient à UNE inscription (stage OU école, exclusif).
-- Plusieurs paiements peuvent s'accumuler par inscription (paiements partiels).

create table if not exists public.paiements (
  id uuid primary key default gen_random_uuid(),
  inscription_stage_id uuid references public.inscriptions_stages(id) on delete cascade,
  inscription_ecole_id uuid references public.inscriptions_ecole(id) on delete cascade,
  montant integer not null check (montant > 0),       -- en euros (cents pas nécessaires ici)
  moyen text not null check (moyen in ('especes', 'cheque', 'virement', 'cb', 'autre')),
  reference text,                                       -- n° chèque, libellé virement, etc.
  date_paiement date not null default current_date,
  notes text,
  created_at timestamptz default now(),
  -- Contrainte : exactement une des 2 FK doit être renseignée
  check (
    (inscription_stage_id is not null and inscription_ecole_id is null)
    or
    (inscription_stage_id is null and inscription_ecole_id is not null)
  )
);

create index if not exists idx_paiements_stage
  on public.paiements(inscription_stage_id)
  where inscription_stage_id is not null;

create index if not exists idx_paiements_ecole
  on public.paiements(inscription_ecole_id)
  where inscription_ecole_id is not null;

create index if not exists idx_paiements_date
  on public.paiements(date_paiement desc);
