-- Coach attribué à un élève (École) pour la constitution des groupes.
-- La vue « Groupes École » range les élèves cochés « Ajouté au groupe » par
-- horaire effectif, et permet d'affecter un coach à chacun (colonne = coach).
alter table public.inscriptions_ecole
  add column if not exists coach_id uuid references public.coaches(id) on delete set null;

create index if not exists idx_inscriptions_ecole_coach
  on public.inscriptions_ecole(coach_id);
