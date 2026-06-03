-- Active la Row Level Security (RLS) sur les 3 tables où elle manquait.
-- Sans RLS, n'importe qui connaissant l'URL Supabase + la clé anon
-- (publique par design) pourrait lire/écrire dans ces tables via l'API
-- PostgREST publique.
--
-- L'app accède à la base UNIQUEMENT côté serveur via la clé service_role
-- (cf. lib/supabase/server.ts), qui bypass RLS automatiquement. Activer
-- RLS sans définir de policy = blocage total pour les autres accès,
-- exactement ce qu'on veut.
--
-- Si plus tard on a besoin d'une lecture publique sur une de ces tables
-- (par exemple jpo_ecole pour afficher le bandeau côté client sans
-- passer par le serveur), on ajoutera une policy SELECT explicite.

alter table public.paiements enable row level security;
alter table public.jpo_ecole enable row level security;
alter table public.admin_login_attempts enable row level security;
