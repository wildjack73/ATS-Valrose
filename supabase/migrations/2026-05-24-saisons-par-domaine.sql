-- Refonte : les saisons sont maintenant typées par domaine ('stages' ou
-- 'ecole'), avec une saison active par domaine. Les tarifs stages et école
-- évoluent ainsi sur leurs propres cycles (ex : stages renouvelés en
-- septembre, école en juin).

begin;

-- 1. Colonne domaine (nullable au départ pour le backfill)
alter table public.saisons add column if not exists domaine text;

-- 2. Les lignes existantes deviennent des saisons stages par défaut
update public.saisons set domaine = 'stages' where domaine is null;

-- 3. NOT NULL + check
alter table public.saisons alter column domaine set not null;
alter table public.saisons drop constraint if exists saisons_domaine_check;
alter table public.saisons
  add constraint saisons_domaine_check check (domaine in ('stages', 'ecole'));

-- 4. Le code n'est plus unique tout court, mais unique par (code, domaine)
alter table public.saisons drop constraint if exists saisons_code_key;
alter table public.saisons
  drop constraint if exists saisons_code_domaine_key;
alter table public.saisons
  add constraint saisons_code_domaine_key unique (code, domaine);

-- 5. Un seul actif PAR DOMAINE (au lieu d'un seul actif total)
drop index if exists public.idx_saisons_one_active;
drop index if exists public.idx_saisons_one_active_per_domaine;
create unique index idx_saisons_one_active_per_domaine
  on public.saisons(domaine, active) where active = true;

-- 6. Dupliquer chaque saison stages existante comme saison école jumelle
insert into public.saisons (code, label, active, order_idx, domaine)
select code, label, active, order_idx, 'ecole'
from public.saisons
where domaine = 'stages';

-- 7. Déplacer les tarifs école vers leur saison école
update public.tarifs_cours_ecole tce
set saison_id = sec.id
from public.saisons sst, public.saisons sec
where tce.saison_id = sst.id
  and sst.domaine = 'stages'
  and sec.domaine = 'ecole'
  and sec.code = sst.code;

update public.tarifs_licence_fft t
set saison_id = sec.id
from public.saisons sst, public.saisons sec
where t.saison_id = sst.id
  and sst.domaine = 'stages'
  and sec.domaine = 'ecole'
  and sec.code = sst.code;

update public.tarifs_autres t
set saison_id = sec.id
from public.saisons sst, public.saisons sec
where t.saison_id = sst.id
  and sst.domaine = 'stages'
  and sec.domaine = 'ecole'
  and sec.code = sst.code;

-- 8. Les inscriptions école pointent vers la saison école
update public.inscriptions_ecole ie
set saison_id = sec.id
from public.saisons sst, public.saisons sec
where ie.saison_id = sst.id
  and sst.domaine = 'stages'
  and sec.domaine = 'ecole'
  and sec.code = sst.code;

-- 9. Groupes école pareil
update public.groupes_ecole g
set saison_id = sec.id
from public.saisons sst, public.saisons sec
where g.saison_id = sst.id
  and sst.domaine = 'stages'
  and sec.domaine = 'ecole'
  and sec.code = sst.code;

commit;
