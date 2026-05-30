-- Table de config des Journées Portes Ouvertes par saison école.
-- Une ligne par saison (école). Si aucune ligne, le bandeau n'est pas
-- affiché. Modifiable depuis l'admin Tarifs (section « JPO »).

create table if not exists public.jpo_ecole (
  id uuid primary key default gen_random_uuid(),
  saison_id uuid not null unique references public.saisons(id) on delete cascade,
  visible_jusqu_au date not null,
  annee_scolaire text not null,     -- ex: "2026/2027"
  date_reprise text not null,       -- ex: "mercredi 9 septembre 2026"
  jours jsonb not null default '[]',-- [{label, creneaux}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seeder la ligne pour la saison école 2026-2027 active
insert into public.jpo_ecole
  (saison_id, visible_jusqu_au, annee_scolaire, date_reprise, jours)
select
  s.id,
  date '2026-09-06',
  '2026/2027',
  'mercredi 9 septembre 2026',
  '[
    {"label":"Mardi 1ᵉʳ septembre","creneaux":"17h – 20h"},
    {"label":"Mercredi 2 septembre","creneaux":"9h – 12h et 13h30 – 18h"},
    {"label":"Jeudi 3 septembre","creneaux":"17h – 20h"},
    {"label":"Vendredi 4 septembre","creneaux":"17h – 20h"},
    {"label":"Samedi 5 septembre","creneaux":"9h – 12h et 13h30 – 18h"}
  ]'::jsonb
from public.saisons s
where s.code = '2026-2027' and s.domaine = 'ecole'
on conflict (saison_id) do update set
  visible_jusqu_au = excluded.visible_jusqu_au,
  annee_scolaire = excluded.annee_scolaire,
  date_reprise = excluded.date_reprise,
  jours = excluded.jours,
  updated_at = now();
