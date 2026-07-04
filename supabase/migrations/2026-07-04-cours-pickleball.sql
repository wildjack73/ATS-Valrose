-- ============================================================================
-- Cours Pickleball : nouveau type de cours école + colonne d'inscription
-- ----------------------------------------------------------------------------
-- Idempotent : ré-exécutable sans danger. N'impacte pas les inscriptions
-- existantes (nouvelle colonne à '[]' par défaut).
-- ============================================================================

-- 1) Autoriser le type 'pickleball' (en plus de tennis / padel)
alter table public.tarifs_cours_ecole
  drop constraint if exists tarifs_cours_ecole_type_check;
alter table public.tarifs_cours_ecole
  add constraint tarifs_cours_ecole_type_check
  check (type in ('tennis', 'padel', 'pickleball'));

-- 2) Colonne cours_pickleball sur les inscriptions école (vide par défaut)
alter table public.inscriptions_ecole
  add column if not exists cours_pickleball jsonb default '[]'::jsonb;

-- 3) Créer le cours « Cours Adultes Pickleball » dans la saison école active
insert into public.tarifs_cours_ecole
  (saison_id, type, code, label, prix, order_idx, description, ferme)
select s.id, 'pickleball', 'cours_adultes_pickleball',
       'Cours Adultes Pickleball', 180, 0,
       'Adultes · 1h30/semaine · 1 trimestre', false
from public.saisons s
where s.domaine = 'ecole' and s.active = true
on conflict (saison_id, type, code) do nothing;
