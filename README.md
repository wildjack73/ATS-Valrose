# ATS Valrose — Site d'inscriptions

Application Next.js d'inscription en ligne aux stages et à l'école de tennis du club **ATS Valrose** (Nice).

## Pages

- `/` — Accueil, choix entre Stages et École
- `/stages` — Formulaire d'inscription aux stages (4 formules, calcul prix en direct)
- `/ecole` — Formulaire d'inscription à l'école de tennis 2026-2027
- `/admin` — Tableau de bord (protégé par mot de passe) : tableau filtrable, export CSV, gestion des statuts

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- React Hook Form + Zod (validation)
- Supabase (Postgres) — base de données
- Resend — emails de confirmation

## Démarrer en local

1. Créer un projet Supabase puis exécuter `supabase/schema.sql` dans le SQL Editor
2. Copier `.env.example` en `.env.local` et remplir les valeurs
3. `npm install`
4. `npm run dev` → http://localhost:3000

## Déploiement

Voir **`DEPLOIEMENT.md`** pour la procédure pas à pas (Supabase, Hostinger, DNS, Resend).
