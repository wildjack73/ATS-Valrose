-- ============================================================================
-- Suivi « prévenu » des inscriptions École.
-- prevenu_at = date d'envoi de l'email de confirmation d'inscription
-- (validation après journées portes ouvertes). NULL = pas encore prévenu.
-- Idempotent. N'impacte pas les inscriptions existantes.
-- ============================================================================
alter table public.inscriptions_ecole
  add column if not exists prevenu_at timestamptz;
