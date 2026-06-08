-- Suivi de l'envoi du récapitulatif d'inscription aux familles déjà en base
-- (campagne ponctuelle après la bascule emails vers SMTP). Permet de ne jamais
-- renvoyer deux fois le même récap à une famille.

alter table public.inscriptions_stages
  add column if not exists recap_email_at timestamptz;

comment on column public.inscriptions_stages.recap_email_at is
  'Date d''envoi du récapitulatif d''inscription à la famille (campagne de rattrapage emails). NULL = pas encore envoyé.';
