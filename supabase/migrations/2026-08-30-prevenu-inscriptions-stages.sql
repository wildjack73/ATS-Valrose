-- ============================================================================
-- Suivi « prévenu » des inscriptions Stages (email de confirmation).
-- prevenu_at = date d'envoi. NULL = pas encore prévenu. Idempotent.
-- ============================================================================
alter table public.inscriptions_stages
  add column if not exists prevenu_at timestamptz;
