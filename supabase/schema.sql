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

-- ============================================================================
-- Table : inscriptions_stages_historique
-- ----------------------------------------------------------------------------
-- Contient les inscriptions importées depuis les anciens Google Forms
-- (Saisons antérieures à 2026-2027). Contraintes souples car les données
-- d'origine sont brutes (champs manquants, formats variables).
-- ============================================================================
create table if not exists public.inscriptions_stages_historique (
  id uuid primary key default gen_random_uuid(),
  imported_at timestamptz not null default now(),

  source text not null,         -- nom du fichier d'origine (ex: 'stages-2025-2026.csv')

  -- Champs bruts du CSV (tels quels, en texte)
  horodateur text,              -- timestamp d'origine (texte, pas date typée)
  nom text,
  prenom text,
  date_naissance text,          -- parfois "8 ans" plutôt qu'une date
  adresse text,
  telephone text,
  email text,
  niveau text,
  formule text,                 -- libellé brut, ex: "Formule 2 matin - 170 euros"
  semaine text,                 -- libellé brut, ex: "Toussaint du 27/10 au 31/10"
  repas text,
  jours_f4 text,                -- texte libre pour les jours de formule 4

  -- Métadonnées normalisées
  formule_normalisee text,      -- 'formule_1' | 'formule_2' | 'formule_3' | 'formule_4' | null
  creneau_normalise text,       -- 'matin' | 'apres_midi' | null
  dejeuner boolean default false,
  prix_estime integer default 0 -- best-effort à partir du libellé formule
);

create index if not exists idx_hist_stages_imported on public.inscriptions_stages_historique(imported_at desc);
create index if not exists idx_hist_stages_source on public.inscriptions_stages_historique(source);
create index if not exists idx_hist_stages_email on public.inscriptions_stages_historique(email);
create index if not exists idx_hist_stages_semaine on public.inscriptions_stages_historique(semaine);

alter table public.inscriptions_stages_historique enable row level security;
-- Aucune policy → seul service_role peut lire/modifier (lecture admin uniquement)

-- ============================================================================
-- Table : inscriptions_ecole_historique
-- ----------------------------------------------------------------------------
-- Inscriptions historiques école (saisons antérieures à 2026-2027).
-- ============================================================================
create table if not exists public.inscriptions_ecole_historique (
  id uuid primary key default gen_random_uuid(),
  imported_at timestamptz not null default now(),

  source text not null,

  -- Bruts CSV
  horodateur text,
  nom text,
  prenom text,
  date_naissance text,
  adresse text,
  code_postal_ville text,
  telephone text,
  email text,
  niveau text,
  cours_tennis_raw text,
  cours_padel_raw text,
  formule_mixte_raw text,
  nouvelles_formules_raw text,
  dispo_mercredi text,
  dispo_samedi text,
  dispo_semaine text,
  mode_reglement text,
  nb_paiements text,
  licence_fft text,
  licence_extra text,
  reglement_notes text,
  commentaires text,

  -- Estimé
  prix_estime integer default 0
);

create index if not exists idx_hist_ecole_imported on public.inscriptions_ecole_historique(imported_at desc);
create index if not exists idx_hist_ecole_source on public.inscriptions_ecole_historique(source);
create index if not exists idx_hist_ecole_email on public.inscriptions_ecole_historique(email);

alter table public.inscriptions_ecole_historique enable row level security;
-- Aucune policy → seul service_role peut lire/modifier

-- ============================================================================
-- MULTI-SAISONS : tarifs éditables depuis l'admin
-- ============================================================================
-- Au lieu de hardcoder les tarifs dans lib/data/*.ts, ils sont stockés en DB
-- avec une notion de "saison" (2025-2026, 2026-2027, etc.).
-- Une seule saison est active à la fois — c'est celle qu'affichent les
-- formulaires publics. L'admin peut éditer/créer d'autres saisons.
-- ============================================================================

create table if not exists public.saisons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,            -- "2026-2027"
  label text not null,                  -- "Saison 2026-2027"
  active boolean not null default false,
  order_idx int not null default 0,
  created_at timestamptz default now()
);

-- Une seule saison active à la fois
create unique index if not exists idx_saisons_one_active
  on public.saisons(active) where active = true;

-- ----- Stages : Formules -----
create table if not exists public.tarifs_stages_formules (
  id uuid primary key default gen_random_uuid(),
  saison_id uuid not null references public.saisons(id) on delete cascade,
  code text not null,                   -- 'formule_1' .. 'formule_4'
  titre text not null,
  sous_titre text,
  description text,
  prix int,                             -- null pour à la carte
  needs_creneau boolean default false,
  has_dejeuner_option boolean default false,
  is_a_la_carte boolean default false,
  prix_dejeuner int default 0,
  details_horaires text,
  order_idx int default 0,
  unique(saison_id, code)
);

-- ----- Stages : Options Formule 4 -----
create table if not exists public.tarifs_options_f4 (
  id uuid primary key default gen_random_uuid(),
  saison_id uuid not null references public.saisons(id) on delete cascade,
  code text not null,                   -- 'option_1' .. 'option_3'
  label text not null,
  prix int not null,
  detail text,
  order_idx int default 0,
  unique(saison_id, code)
);

-- ----- Stages : Semaines (vacances scolaires) -----
create table if not exists public.semaines_stages (
  id uuid primary key default gen_random_uuid(),
  saison_id uuid not null references public.saisons(id) on delete cascade,
  code text not null,                   -- 'ete_juillet_1'
  periode text not null,                -- 'Été 2026 — Juillet'
  label text not null,                  -- 'Du 29/06 au 03/07'
  date_debut date,                      -- (optionnel, pour tri)
  ouverte boolean default true,
  order_idx int default 0,
  unique(saison_id, code)
);

-- ----- École : Cours Tennis + Padel -----
create table if not exists public.tarifs_cours_ecole (
  id uuid primary key default gen_random_uuid(),
  saison_id uuid not null references public.saisons(id) on delete cascade,
  type text not null check (type in ('tennis', 'padel')),
  code text not null,                   -- 'baby_tennis', 'cours_adultes_annuel', etc.
  label text not null,
  prix int not null,
  order_idx int default 0,
  unique(saison_id, type, code)
);

-- ----- École : Licence FFT -----
create table if not exists public.tarifs_licence_fft (
  id uuid primary key default gen_random_uuid(),
  saison_id uuid not null references public.saisons(id) on delete cascade,
  code text not null,                   -- 'non_adulte', 'oui_23', 'oui_13'
  label text not null,
  prix int not null default 0,
  order_idx int default 0,
  unique(saison_id, code)
);

-- ----- Autres tarifs : leçons individuelles, locations, matériel -----
create table if not exists public.tarifs_autres (
  id uuid primary key default gen_random_uuid(),
  saison_id uuid not null references public.saisons(id) on delete cascade,
  category text not null check (category in ('lecons', 'locations', 'materiel')),
  label text not null,
  prix text not null,                   -- format libre: "40€/h", "5€/raquette"
  detail text,
  order_idx int default 0
);

-- RLS : pas de policy public — seul service_role lit/modifie ces tables.
-- Les pages publiques fetchent via les API routes (server-side).
alter table public.saisons enable row level security;
alter table public.tarifs_stages_formules enable row level security;
alter table public.tarifs_options_f4 enable row level security;
alter table public.semaines_stages enable row level security;
alter table public.tarifs_cours_ecole enable row level security;
alter table public.tarifs_licence_fft enable row level security;
alter table public.tarifs_autres enable row level security;

-- ----- Liaison inscriptions ↔ saison (pour pouvoir filtrer par année plus tard) -----
alter table public.inscriptions_stages
  add column if not exists saison_id uuid references public.saisons(id);
alter table public.inscriptions_ecole
  add column if not exists saison_id uuid references public.saisons(id);

create index if not exists idx_stages_saison on public.inscriptions_stages(saison_id);
create index if not exists idx_ecole_saison on public.inscriptions_ecole(saison_id);

-- Déjeuner au jour (8€/jour si pas la semaine entière à 35€)
alter table public.tarifs_stages_formules
  add column if not exists prix_dejeuner_jour int default 8;

alter table public.semaines_stages
  add column if not exists dejeuner_disponible boolean default true;

-- Jours de déjeuner choisis (array de noms de jours)
alter table public.inscriptions_stages
  add column if not exists dejeuner_jours jsonb;

-- Détails du règlement saisis par l'admin (chèque n°XX, espèces, virement...)
alter table public.inscriptions_stages
  add column if not exists paiement_info text;
alter table public.inscriptions_ecole
  add column if not exists paiement_info text;

-- Description optionnelle par cours école (âge, durée, public…)
alter table public.tarifs_cours_ecole
  add column if not exists description text;

-- ============================================================================
-- PLANNING ÉCOLE : coaches + groupes + assignation des élèves
-- ============================================================================

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  couleur text,                      -- hex pour code couleur dans le planning
  actif boolean default true,
  order_idx int default 0,
  created_at timestamptz default now()
);

create table if not exists public.groupes_ecole (
  id uuid primary key default gen_random_uuid(),
  saison_id uuid not null references public.saisons(id) on delete cascade,
  jour text not null check (jour in ('lundi','mardi','mercredi','jeudi','vendredi','samedi')),
  heure_debut time not null,
  heure_fin time,
  court text,                        -- 'Court 3', 'Padel 1', 'Padel 2'
  coach_id uuid references public.coaches(id) on delete set null,
  niveau text,                       -- 'Baby tennis', 'Rouge', 'Adultes', etc.
  capacite_max int default 8,
  notes text,
  order_idx int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_groupes_saison on public.groupes_ecole(saison_id);
create index if not exists idx_groupes_jour on public.groupes_ecole(jour, heure_debut);

-- Liaison N-N : un élève peut être dans plusieurs groupes (tennis + padel par ex)
create table if not exists public.inscriptions_groupes (
  inscription_id uuid not null references public.inscriptions_ecole(id) on delete cascade,
  groupe_id uuid not null references public.groupes_ecole(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (inscription_id, groupe_id)
);

create index if not exists idx_inscriptions_groupes_groupe on public.inscriptions_groupes(groupe_id);

alter table public.coaches enable row level security;
alter table public.groupes_ecole enable row level security;
alter table public.inscriptions_groupes enable row level security;
