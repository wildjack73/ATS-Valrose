-- Tentatives de connexion admin (rate-limiting brute-force).
--
-- On enregistre chaque tentative (réussie ou non) avec l'IP source et un
-- timestamp. La logique de blocage : si une même IP cumule N échecs sur
-- une fenêtre glissante de M minutes, on refuse les nouvelles tentatives.
--
-- Les lignes sont auto-purgées au-delà de 24h pour ne pas garder un
-- historique massif (via un job de nettoyage simple côté API au moment du
-- check, ou cron Supabase si on veut faire propre plus tard).

create table if not exists public.admin_login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_login_attempts_ip_time
  on public.admin_login_attempts(ip, created_at desc);
