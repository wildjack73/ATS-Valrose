-- Ajoute un flag « desactive » (boolean) sur chaque inscription, pour
-- permettre au club de mettre temporairement en pause une réservation
-- (différent de « annulé » : la donnée est conservée, l'inscription
-- est juste mise en sommeil et peut être réactivée d'un clic).
--
-- Effets de desactive=true :
--   - la ligne apparaît grisée/barrée dans les tables admin
--   - elle n'est pas comptée dans les chiffres dashboard (à encaisser /
--     encaissés)
--   - elle libère son créneau (école) pour le compteur de places
--   - elle n'apparaît pas dans la vue Encaissements par défaut

alter table public.inscriptions_stages
  add column if not exists desactive boolean default false;

alter table public.inscriptions_ecole
  add column if not exists desactive boolean default false;

create index if not exists idx_inscriptions_stages_desactive
  on public.inscriptions_stages(desactive)
  where desactive = true;

create index if not exists idx_inscriptions_ecole_desactive
  on public.inscriptions_ecole(desactive)
  where desactive = true;
