-- ============================================================================
-- ATS Valrose - Schéma de base de données
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================================

-- Activer l'extension pgcrypto pour gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================================
-- Table : inscriptions_stages
-- ============================================================================
create table if not exists public.inscriptions_stages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Identité
  nom text not null,
  prenom text not null,
  date_naissance date not null,

  -- Contact
  adresse text not null,
  telephone text not null,
  email text not null,

  -- Tennis
  niveau text,

  -- Stage choisi
  formule text not null check (formule in ('formule_1', 'formule_2', 'formule_3', 'formule_4')),
  formule_creneau text, -- 'matin' | 'apres_midi' (pour F1 et F2)
  formule_dejeuner boolean default false, -- pour F3 (option +35€)
  formule_4_selection jsonb, -- [{"jour": "lundi", "option": "option_1"}, ...]

  -- Période
  semaine text not null, -- ex: 'ete_juillet_1', 'toussaint_2'
  semaine_label text not null, -- libellé lisible : "Été - Du 29/06 au 03/07"

  -- Tarif
  prix_total integer not null, -- en euros

  -- Notes parents
  notes text,

  -- Statut admin
  statut text not null default 'en_attente' check (statut in ('en_attente', 'paye', 'annule')),
  notes_admin text
);

create index if not exists idx_stages_created on public.inscriptions_stages(created_at desc);
create index if not exists idx_stages_semaine on public.inscriptions_stages(semaine);
create index if not exists idx_stages_email on public.inscriptions_stages(email);

-- ============================================================================
-- Table : inscriptions_ecole
-- ============================================================================
create table if not exists public.inscriptions_ecole (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Identité
  nom text not null,
  prenom text not null,
  date_naissance date not null,

  -- Contact
  adresse text not null,
  code_postal_ville text not null,
  telephone text not null,
  email text not null,

  -- Tennis
  niveau text,

  -- Cours choisis
  cours_tennis jsonb default '[]'::jsonb,    -- ['baby_tennis', 'mini_tennis', ...]
  cours_padel jsonb default '[]'::jsonb,     -- ['perfectionnement', 'cours_adultes_annuel', ...]
  licence_pickleball boolean default false,

  -- Tarif calculé (cours + licence FFT)
  prix_total integer not null default 0,

  -- Disponibilités (texte libre)
  dispo_mercredi text,
  dispo_samedi text,
  dispo_semaine text,

  -- Paiement
  mode_reglement text not null check (mode_reglement in ('especes', 'cheque')),
  nb_paiements integer not null check (nb_paiements between 1 and 4),

  -- Licence FFT
  licence_fft text not null check (licence_fft in ('non_adulte', 'oui_23', 'oui_13')),

  -- Notes parents
  notes text,

  -- Statut admin
  statut text not null default 'en_attente' check (statut in ('en_attente', 'paye', 'annule')),
  notes_admin text
);

create index if not exists idx_ecole_created on public.inscriptions_ecole(created_at desc);
create index if not exists idx_ecole_email on public.inscriptions_ecole(email);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Stratégie :
--   - Le formulaire public peut INSÉRER avec la clé anon
--   - Toute lecture/modification se fait côté serveur via la SERVICE ROLE KEY
--     (l'admin Next.js, protégé par mot de passe, utilise cette clé)
--   - Aucune lecture n'est possible avec la clé anon (vie privée des inscrits)

alter table public.inscriptions_stages enable row level security;
alter table public.inscriptions_ecole enable row level security;

-- Autoriser l'insertion publique (formulaire)
drop policy if exists "Public insert stages" on public.inscriptions_stages;
create policy "Public insert stages" on public.inscriptions_stages
  for insert to anon
  with check (true);

drop policy if exists "Public insert ecole" on public.inscriptions_ecole;
create policy "Public insert ecole" on public.inscriptions_ecole
  for insert to anon
  with check (true);

-- Pas de policy SELECT/UPDATE/DELETE pour anon → seul service_role peut lire/modifier
