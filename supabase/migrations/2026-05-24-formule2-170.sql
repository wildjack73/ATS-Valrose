-- Retour au tarif Formule 2 = 170€ (était passé à 180€).
-- Aligne le site sur les prix affichés du flyer en cours pour ne pas
-- décaler les familles inscrites au tarif historique.
update public.tarifs_stages_formules
set prix = 170
where code = 'formule_2';
