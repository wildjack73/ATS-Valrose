-- Précise que le « Perfectionnement Padel » est un cours jeune (7-17 ans).
-- Aligne le format de la description avec les cours adultes pour cohérence.
update public.tarifs_cours_ecole
set description = 'Jeunes de 7 à 17 ans · 1h30/semaine'
where type = 'padel' and code = 'perfectionnement';
