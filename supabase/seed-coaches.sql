-- Seed des coaches du club. Idempotent (insert seulement s'il n'existe pas déjà).

insert into public.coaches (nom, couleur, actif, order_idx)
select nom, couleur, true, order_idx
from (values
  ('Agnès',     '#e89923', 10),
  ('Bruno',     '#7c3aed', 20),
  ('Camille',   '#06b6d4', 30),
  ('Doriane',   '#ec4899', 40),
  ('Jean-Marc', '#16a34a', 50),
  ('Jérôme',    '#dc2626', 60),
  ('Nino',      '#0ea5e9', 70),
  ('Romain',    '#f59e0b', 80)
) as v(nom, couleur, order_idx)
where not exists (
  select 1 from public.coaches c where c.nom = v.nom
);
