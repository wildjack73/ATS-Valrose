-- ============================================================================
-- Seed de la saison 2026-2027 avec les valeurs courantes.
-- Idempotent : peut être ré-exécuté, met à jour les valeurs.
-- À exécuter dans Supabase SQL Editor APRÈS schema.sql.
-- ============================================================================

-- 1. Saison (active par défaut)
insert into public.saisons (code, label, active, order_idx) values
  ('2026-2027', 'Saison 2026-2027', true, 100)
on conflict (code) do update set
  label = excluded.label,
  order_idx = excluded.order_idx;

-- Récupérer l'id pour les inserts suivants
with s as (select id from public.saisons where code = '2026-2027')

-- 2. Formules stages
insert into public.tarifs_stages_formules
  (saison_id, code, titre, sous_titre, description, prix, needs_creneau, has_dejeuner_option, is_a_la_carte, prix_dejeuner, details_horaires, order_idx)
select s.id, v.* from s, (values
  ('formule_1', 'Formule 1 — Baby Tennis', 'À partir de 3 ans', '1h30 de tennis par jour, lundi au vendredi.', 110, true, false, false, 0, 'Créneau 9h-10h30 ou 14h-15h30', 10),
  ('formule_2', 'Formule 2 — Demi-journée (3h)', 'Matin ou après-midi', 'Tennis, padel ou pickleball + goûter + multi-activités. Lundi au vendredi.', 180, true, false, false, 0, 'Matin 8h30-12h | Après-midi 13h30-17h', 20),
  ('formule_3', 'Formule 3 — Journée complète', '9h à 17h, au Club', 'Programme matin + après-midi. Option déjeuner encadré par les moniteurs.', 280, false, true, false, 35, '8h30-17h', 30),
  -- Note : prix_dejeuner_jour est défini séparément ci-dessous (8€)
  ('formule_4', 'Formule 4 — À la carte', 'Choisissez vos jours', 'Tarif selon les options choisies, jour par jour. Idéal si vous n''êtes pas disponible toute la semaine.', null, false, false, true, 0, 'Choix par jour', 40)
) as v(code, titre, sous_titre, description, prix, needs_creneau, has_dejeuner_option, is_a_la_carte, prix_dejeuner, details_horaires, order_idx)
on conflict (saison_id, code) do update set
  titre = excluded.titre, sous_titre = excluded.sous_titre, description = excluded.description,
  prix = excluded.prix, needs_creneau = excluded.needs_creneau,
  has_dejeuner_option = excluded.has_dejeuner_option, is_a_la_carte = excluded.is_a_la_carte,
  prix_dejeuner = excluded.prix_dejeuner, details_horaires = excluded.details_horaires,
  order_idx = excluded.order_idx;

-- 2bis. Prix déjeuner par jour (8€) pour les formules qui ont l'option
update public.tarifs_stages_formules
set prix_dejeuner_jour = 8
where saison_id = (select id from public.saisons where code = '2026-2027')
  and has_dejeuner_option = true;

-- 3. Options Formule 4
with s as (select id from public.saisons where code = '2026-2027')
insert into public.tarifs_options_f4 (saison_id, code, label, prix, detail, order_idx)
select s.id, v.* from s, (values
  ('option_1', 'Option 1', 25, 'Matin ou après-midi (1h30)', 10),
  ('option_2', 'Option 2', 35, 'Matin ou après-midi (2h30)', 20),
  ('option_3', 'Option 3', 55, 'Journée complète', 30)
) as v(code, label, prix, detail, order_idx)
on conflict (saison_id, code) do update set
  label = excluded.label, prix = excluded.prix, detail = excluded.detail, order_idx = excluded.order_idx;

-- 4. Semaines de stages (vacances scolaires Nice — Zone B)
with s as (select id from public.saisons where code = '2026-2027')
insert into public.semaines_stages (saison_id, code, periode, label, date_debut, ouverte, order_idx)
select s.id, v.* from s, (values
  -- Été 2026
  ('ete_juillet_1',  'Été 2026 — Juillet',  'Du 29/06 au 03/07', date '2026-06-29', true, 10),
  ('ete_juillet_2',  'Été 2026 — Juillet',  'Du 06/07 au 10/07', date '2026-07-06', true, 20),
  ('ete_juillet_3',  'Été 2026 — Juillet',  'Du 13/07 au 17/07', date '2026-07-13', true, 30),
  ('ete_juillet_4',  'Été 2026 — Juillet',  'Du 20/07 au 24/07', date '2026-07-20', true, 40),
  ('ete_juillet_5',  'Été 2026 — Juillet',  'Du 27/07 au 31/07', date '2026-07-27', true, 50),
  ('ete_aout_1',     'Été 2026 — Août',     'Du 03/08 au 07/08', date '2026-08-03', true, 60),
  ('ete_aout_2',     'Été 2026 — Août',     'Du 10/08 au 14/08', date '2026-08-10', true, 70),
  ('ete_aout_3',     'Été 2026 — Août',     'Du 17/08 au 21/08', date '2026-08-17', true, 80),
  ('ete_aout_4',     'Été 2026 — Août',     'Du 24/08 au 28/08', date '2026-08-24', true, 90),
  -- Toussaint 2026
  ('toussaint_1',    'Toussaint 2026',      'Du 19/10 au 23/10', date '2026-10-19', true, 100),
  ('toussaint_2',    'Toussaint 2026',      'Du 26/10 au 30/10', date '2026-10-26', true, 110),
  -- Noël 2026
  ('noel_1',         'Noël 2026',           'Du 21/12 au 25/12', date '2026-12-21', true, 120),
  ('noel_2',         'Noël 2026',           'Du 28/12 au 01/01', date '2026-12-28', true, 130),
  -- Hiver 2027
  ('hiver_1',        'Hiver 2027',          'Du 15/02 au 19/02', date '2027-02-15', true, 140),
  ('hiver_2',        'Hiver 2027',          'Du 22/02 au 26/02', date '2027-02-22', true, 150),
  -- Printemps 2027
  ('printemps_1',    'Printemps 2027',      'Du 12/04 au 16/04', date '2027-04-12', true, 160),
  ('printemps_2',    'Printemps 2027',      'Du 19/04 au 23/04', date '2027-04-19', true, 170)
) as v(code, periode, label, date_debut, ouverte, order_idx)
on conflict (saison_id, code) do update set
  periode = excluded.periode, label = excluded.label, date_debut = excluded.date_debut,
  ouverte = excluded.ouverte, order_idx = excluded.order_idx;

-- 4bis. Pas de déjeuner à Noël (restauration fermée) et sur les semaines qui démarrent en juin
update public.semaines_stages
set dejeuner_disponible = false
where saison_id = (select id from public.saisons where code = '2026-2027')
  and (
    code like 'noel%'
    or (date_debut is not null and extract(month from date_debut) = 6)
  );

-- Sécurité : les autres semaines de la saison gardent le déjeuner actif
update public.semaines_stages
set dejeuner_disponible = true
where saison_id = (select id from public.saisons where code = '2026-2027')
  and code not like 'noel%'
  and (date_debut is null or extract(month from date_debut) <> 6);

-- 5. Cours École Tennis
with s as (select id from public.saisons where code = '2026-2027')
insert into public.tarifs_cours_ecole (saison_id, type, code, label, prix, order_idx)
select s.id, 'tennis', v.* from s, (values
  ('baby_tennis',             'Baby Tennis (1h)',                       250, 10),
  ('mini_tennis',             'Mini Tennis (1h)',                       250, 20),
  ('initiation',              'Initiation (1h)',                        250, 30),
  ('perfectionnement',        'Perfectionnement (1h30)',                360, 40),
  ('centre_entrainement',     'Centre d''Entraînement (3h)',            720, 50),
  ('demi_journee',            'Demi-journée (3h)',                      750, 60),
  ('cours_adultes_annuel',    'Cours Adultes (1h30, annuel)',           520, 70),
  ('cours_adultes_trimestre', 'Cours Adultes (1h30, 1 trimestre)',      180, 80)
) as v(code, label, prix, order_idx)
on conflict (saison_id, type, code) do update set
  label = excluded.label, prix = excluded.prix, order_idx = excluded.order_idx;

-- 6. Cours École Padel
with s as (select id from public.saisons where code = '2026-2027')
insert into public.tarifs_cours_ecole (saison_id, type, code, label, prix, order_idx)
select s.id, 'padel', v.* from s, (values
  ('perfectionnement',        'Perfectionnement Padel (1h30)',          450, 10),
  ('cours_adultes_annuel',    'Cours Adultes Padel (annuel)',           680, 20),
  ('cours_adultes_trimestre', 'Cours Adultes Padel (1 trimestre)',      240, 30)
) as v(code, label, prix, order_idx)
on conflict (saison_id, type, code) do update set
  label = excluded.label, prix = excluded.prix, order_idx = excluded.order_idx;

-- 7. Licence FFT
with s as (select id from public.saisons where code = '2026-2027')
insert into public.tarifs_licence_fft (saison_id, code, label, prix, order_idx)
select s.id, v.* from s, (values
  ('non_adulte', 'Non (adulte)',                0, 10),
  ('oui_23',     'Oui — 23€ (7-18 ans)',       23, 20),
  ('oui_13',     'Oui — 13€ (6 ans et moins)', 13, 30)
) as v(code, label, prix, order_idx)
on conflict (saison_id, code) do update set
  label = excluded.label, prix = excluded.prix, order_idx = excluded.order_idx;

-- 8. Autres tarifs (leçons / locations / matériel) — pas de unique constraint
-- → on supprime et réinsère pour idempotence
delete from public.tarifs_autres
where saison_id = (select id from public.saisons where code = '2026-2027');

with s as (select id from public.saisons where code = '2026-2027')
insert into public.tarifs_autres (saison_id, category, label, prix, detail, order_idx)
select s.id, v.* from s, (values
  -- Leçons individuelles
  ('lecons', 'Leçon Tennis (1 joueur)',        '40€/h', 'ou 380€ le carnet de 10h', 10),
  ('lecons', 'Leçon Tennis pour 2 joueurs',    '48€/h', null, 20),
  ('lecons', 'Leçon Tennis pour 3 joueurs',    '50€/h', null, 30),
  ('lecons', 'Leçon Tennis étudiant',          '35€/h', null, 40),
  ('lecons', 'Leçon Padel (semaine)',          '60€/h', null, 50),
  ('lecons', 'Leçon Padel (week-end)',         '70€/h', null, 60),
  -- Locations
  ('locations', 'Location court Tennis (semaine)',   '16€/h', null, 10),
  ('locations', 'Location court Tennis (week-end)',  '20€/h', null, 20),
  ('locations', 'Location court Padel',              '40€ / 1h30', null, 30),
  ('locations', 'Location court Pickleball',         '20€ / 1h30', null, 40),
  -- Matériel
  ('materiel', 'Tube de balles tennis',   '9€', null, 10),
  ('materiel', 'Tube de balles padel',    '8€', null, 20),
  ('materiel', 'Location raquette',       '5€ / raquette', null, 30)
) as v(category, label, prix, detail, order_idx);
