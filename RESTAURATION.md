# 🛟 Restaurer l'ensemble du site ATS Valrose

Ce document liste **tous les réglages** nécessaires pour reconstruire le site
de zéro (par ex. si le compte Vercel était perdu). Il ne contient **aucune
valeur secrète** — juste la liste de ce qu'il faut et où le retrouver.

> ⚠️ **Où sont les vraies valeurs ?**
> - Dans **Vercel → Settings → Environment Variables** (production).
> - Dans ton fichier **`.env.local`** sur ton PC (jamais commité).
>
> Si tu perds Vercel, tu perds aussi les valeurs qui y sont. Garde donc une
> copie de ces secrets dans un **gestionnaire de mots de passe** (ou ton
> `.env.local` sauvegardé). Ce document ne sert qu'à savoir **quoi** remettre.

---

## 1. Les 3 choses à conserver

| Élément | Où c'est sauvegardé | Restauration |
|---|---|---|
| **Code du site** | GitHub (dépôt privé `wildjack73/ATS-Valrose`) | Recréer un projet Vercel branché sur ce dépôt |
| **Structure de la base** | `supabase/schema.sql` + `supabase/migrations/` (dans le code) | Exécuter ces fichiers SQL dans un nouveau projet Supabase |
| **Données de la base** | Sauvegarde quotidienne dans `OneDrive\ATS-Valrose-Sauvegardes` | `npm run restore -- <fichier.json>` |
| **Réglages (env vars)** | Ce document + Vercel + `.env.local` | Les re-saisir dans Vercel (section 2) |

---

## 2. Variables d'environnement à remettre dans Vercel

À recréer dans **Vercel → Settings → Environment Variables** (portée
« Production », et « Preview » si besoin).

### Indispensables (le site ne marche pas sans)

| Nom | À quoi ça sert | Où récupérer la valeur |
|---|---|---|
| `SUPABASE_URL` | Adresse du projet Supabase | Supabase → Project Settings → **API** → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète serveur (lecture/écriture) | Supabase → Project Settings → **API** → *service_role / secret key* |
| `ADMIN_PASSWORD` | Mot de passe de l'espace `/admin` | Choisi par toi (gestionnaire de mots de passe) |
| `SMTP_HOST` | Serveur d'envoi des emails | Hostinger → réglages email (ex. `smtp.hostinger.com`) |
| `SMTP_PORT` | Port SMTP | Hostinger (ex. `465`) |
| `SMTP_USER` | Adresse email d'envoi | Hostinger (ex. `contact@ats-valrose.fr`) |
| `SMTP_PASS` | Mot de passe de cette boîte email | Hostinger (⚠️ secret) |

### Emails — recommandées (ont une valeur par défaut sinon)

| Nom | Sert à | Défaut si absent |
|---|---|---|
| `EMAIL_FROM` | Nom + adresse affichés en expéditeur | `contact@ats-valrose.fr` |
| `EMAIL_TO_NOTIFICATIONS` | Reçoit les notifs de nouvelles inscriptions | `contact@ats-valrose.fr` |
| `EMAIL_COACH_PICKLEBALL` | Prof prévenu des inscriptions Pickleball | `Bo.dollet@orange.fr` |
| `IMAP_HOST` | Copie les emails envoyés dans « Envoyés » | (copie désactivée si absent) |
| `IMAP_PORT` | Port IMAP | — |

### Page planning coachs

| Nom | Sert à | Défaut si absent |
|---|---|---|
| `PLANNING_PUBLIC_TOKEN` | Jeton secret du lien `/planning-stages/<jeton>` | un jeton par défaut est dans le code |

> Pour **changer/révoquer** le lien planning, définir cette variable avec une
> nouvelle valeur au hasard, puis redéployer. L'ancien lien tombe en 404.

### Suivi des erreurs — optionnelles (Sentry)

| Nom | Sert à |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Envoi des erreurs à Sentry |
| `SENTRY_ORG` | Organisation Sentry (build) |
| `SENTRY_PROJECT` | Projet Sentry (build) |

> Ces trois-là sont facultatives : sans elles, le site marche, il n'y a
> juste pas de rapport d'erreurs. Valeurs sur **sentry.io**.

### ❌ À NE PAS mettre dans Vercel

- `NODE_ENV`, `VERCEL_ENV`, `NEXT_RUNTIME` → définis automatiquement par Vercel.
- `SUPABASE_DB_URL`, `BACKUP_DIR`, `ZAI_API_KEY` → utilisés **seulement par les
  scripts locaux** (sauvegarde, migrations, outil image) sur ton PC, dans
  `.env.local`. Pas nécessaires pour faire tourner le site.

---

## 3. Services externes (comptes à conserver)

| Service | Rôle | À garder |
|---|---|---|
| **Vercel** | Héberge le site + variables + cron (`vercel.json`) | Accès au compte |
| **Supabase** | Base de données | Accès au projet + les clés API |
| **Hostinger** (email) | Envoi des emails via SMTP | Identifiants de la boîte `contact@` |
| **Domaine `ats-valrose.fr`** | Adresse du site | Accès au registrar + DNS pointant vers Vercel |
| **Sentry** (optionnel) | Rapports d'erreurs | Accès au projet |
| **UptimeRobot** (optionnel) | Ping `/api/keepalive` pour éviter les cold starts | Le monitor |

---

## 4. Procédure de reconstruction complète (from scratch)

1. **Nouveau projet Supabase** → dans le SQL Editor, exécuter `supabase/schema.sql`,
   puis chaque fichier de `supabase/migrations/` (par ordre de date).
2. **Restaurer les données** : `npm run restore -- <dernière sauvegarde OneDrive>`.
3. **Nouveau projet Vercel** branché sur le dépôt GitHub `ATS-Valrose`.
4. **Re-saisir les variables** de la section 2 dans Vercel.
5. **Rebrancher le domaine** `ats-valrose.fr` sur le nouveau projet Vercel
   (Vercel → Domains, puis DNS chez le registrar).
6. **Redéployer** (un `git push` ou « Redeploy » dans Vercel).
7. Vérifier : page d'accueil, un formulaire d'inscription, `/admin`, envoi d'un
   email test.

---

## 5. Sauvegardes en place (rappel)

- **Base de données** : sauvegarde **automatique quotidienne** (tâche Windows
  « ATS Valrose - Sauvegarde BDD », 12h30) → `OneDrive\ATS-Valrose-Sauvegardes`.
- **Code** : GitHub privé + Vercel garde tous les déploiements (rollback 1 clic).
- **Restauration base en 1 clic** (idéal) : nécessite le plan **Supabase Pro**
  (sauvegardes quotidiennes + point-in-time depuis le dashboard).

_Dernière mise à jour : 2026-08-23._
