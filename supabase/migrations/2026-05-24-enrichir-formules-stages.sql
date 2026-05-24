-- Enrichissement des fiches formules stages pour coller au flyer officiel :
-- ajout du « Prêt de raquettes inclus » dans toutes les descriptions
-- + découpage détaillé accueil/activités/départ dans details_horaires
-- pour F2 et F3.
--
-- Cible toutes les saisons (where code = ...) → si on duplique sur une
-- nouvelle saison, on relance ce fichier sans rien changer d'autre.

-- ===== Formule 1 — Baby Tennis ============================================
update public.tarifs_stages_formules
set
  description = '1h30 de tennis par jour, du lundi au vendredi. 2 créneaux possibles. Prêt de raquettes inclus.',
  details_horaires = 'Créneau matin 9h-10h30 ou après-midi 14h-15h30'
where code = 'formule_1';

-- ===== Formule 2 — Demi-journée (3h) ======================================
update public.tarifs_stages_formules
set
  description = 'Tennis, padel ou pickleball, goûter et multi-activités. Du lundi au vendredi. Prêt de raquettes inclus.',
  details_horaires = 'Matin : accueil 8h30-9h, activités 9h-12h • Après-midi : accueil 13h30-14h, activités 14h-16h30, départ 16h30-17h'
where code = 'formule_2';

-- ===== Formule 3 — Journée complète =======================================
update public.tarifs_stages_formules
set
  description = 'Programme matin et après-midi : tennis, padel ou pickleball, goûter et multi-activités. Option déjeuner encadré disponible (35€ la semaine ou 8€ le jour). Prêt de raquettes inclus.',
  details_horaires = 'Accueil 8h30-9h • Matin 9h-12h • Déjeuner (option) • Après-midi 14h-16h30 • Départ 16h30-17h'
where code = 'formule_3';

-- ===== Formule 4 — À la carte =============================================
update public.tarifs_stages_formules
set
  description = 'Tarif selon les options choisies, jour par jour. Idéal si vous n''êtes pas disponible toute la semaine. Prêt de raquettes inclus.',
  details_horaires = 'Choix par jour (cf. tableau ci-dessous)'
where code = 'formule_4';
