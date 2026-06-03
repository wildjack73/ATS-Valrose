-- Sépare le niveau DÉCLARÉ par la famille (champ `niveau`, rempli au
-- formulaire d'inscription) du niveau ATTRIBUÉ par le prof (`niveau_attribue`,
-- édité dans l'admin via le dropdown Galaxie Blanc → Vert 2).
--
-- Avant cette migration, le prof écrasait la déclaration de la famille en
-- éditant le champ `niveau`. Désormais les deux coexistent :
--   - niveau           : ce que la famille a indiqué (« Rouge 6-7 ans »,
--                         « Intermédiaire », texte libre…) — non modifié
--                         par le prof
--   - niveau_attribue  : le niveau officiel attribué par le coach (code
--                         Galaxie : blanc, violet, rouge, rouge_1, …)

alter table public.inscriptions_stages
  add column if not exists niveau_attribue text;

alter table public.inscriptions_ecole
  add column if not exists niveau_attribue text;
