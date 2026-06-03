-- Niveau attribué PAR ÉLÈVE (et non plus par inscription).
--
-- Le niveau Galaxie attribué par le prof est une propriété de l'ÉLÈVE :
-- il doit être le même partout (stages, école, archives, annuaire) et sur
-- toutes les saisons. On le stocke donc dans une table dédiée, keyée par un
-- identifiant d'élève stable (nom + prénom normalisés).
--
-- La colonne `niveau_attribue` ajoutée précédemment sur les tables
-- d'inscriptions devient obsolète (on la garde pour ne pas casser, mais
-- l'UI lit/écrit désormais ici). `niveau` (déclaré famille) reste tel quel.

create table if not exists public.niveaux_eleves (
  eleve_key text primary key,          -- ex: "np:dupont|lea"
  nom text,                            -- pour debug / lisibilité
  prenom text,
  niveau text not null,                -- code Galaxie : blanc, rouge_1, …
  updated_at timestamptz not null default now()
);
