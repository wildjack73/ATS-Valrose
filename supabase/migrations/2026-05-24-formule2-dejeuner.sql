-- Active l'option déjeuner sur la Formule 2 (demi-journée).
-- L'ancien Google Form l'autorisait déjà ; on l'aligne sur le nouveau
-- formulaire. Tarifs identiques à la F3 : 35€ la semaine, 8€ le jour.
update public.tarifs_stages_formules
set
  has_dejeuner_option = true,
  prix_dejeuner = 35,
  prix_dejeuner_jour = 8
where code = 'formule_2';
