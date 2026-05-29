-- Active l'option déjeuner sur la Formule 4 (à la carte).
-- Le repas s'ajoute aux options journalières choisies. Tarifs club : 35€
-- la semaine, 8€ le jour (identiques aux autres formules).
update public.tarifs_stages_formules
set
  has_dejeuner_option = true,
  prix_dejeuner = 35,
  prix_dejeuner_jour = 8
where code = 'formule_4';
