-- Case « Ajouté au groupe » par inscription école (suivi post-JPO).
alter table public.inscriptions_ecole
  add column if not exists ajoute_au_groupe boolean default false;
