# Guide de déploiement — ATS Valrose

Procédure pas à pas pour mettre le site en ligne sur `ats-valrose.fr` (Hostinger Node.js + Supabase + Resend).

Compter **~1 heure** la première fois.

---

## 1. Créer la base de données Supabase

1. Aller sur https://supabase.com et créer un compte (gratuit).
2. **New project** :
   - **Name** : `ats-valrose`
   - **Database Password** : générer un mot de passe fort et le **noter**
   - **Region** : `West EU (Paris)` (pour la latence)
3. Attendre 2 min que le projet soit prêt.
4. Onglet **SQL Editor** → **New query** → coller le contenu de `supabase/schema.sql` → **Run**.
5. Onglet **Project Settings → API**, noter :
   - `Project URL` → ce sera `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → ce sera `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (cliquer "Reveal") → ce sera `SUPABASE_SERVICE_ROLE_KEY` **(à garder secret)**

---

## 2. Configurer Resend pour les emails

1. Aller sur https://resend.com et créer un compte.
2. **Domains → Add Domain** → entrer `ats-valrose.fr`.
3. Resend affiche des enregistrements DNS à ajouter (SPF, DKIM). Aller dans Hostinger → DNS Zone Editor de `ats-valrose.fr` et ajouter ces enregistrements.
4. Revenir sur Resend, attendre la vérification (~15 min).
5. **API Keys → Create API Key** → nommer `ats-valrose-prod` → noter la clé (`re_...`). Ce sera `RESEND_API_KEY`.

> Si la vérification du domaine tarde, on peut démarrer sans Resend : les emails seront simplement skip (logs serveur). Configurer après coup.

---

## 3. Pousser le code sur GitHub

1. Sur GitHub : créer un dépôt **privé** `ats-valrose-inscriptions`.
2. Dans le dossier du projet, ouvrir un terminal et faire :

   ```bash
   git init
   git add .
   git commit -m "Version initiale"
   git branch -M main
   git remote add origin https://github.com/<votre-pseudo>/ats-valrose-inscriptions.git
   git push -u origin main
   ```

---

## 4. Créer l'app Node.js sur Hostinger

1. Dans hPanel → **Sites web** → ats-valrose.fr → **Créer un site → Application web Node.js**.
2. Choisir **Node.js 22** (ou la version la plus récente disponible).
3. Connecter le dépôt GitHub `ats-valrose-inscriptions` (Hostinger demande l'autorisation).
4. Configuration :
   - **Branche** : `main`
   - **Build command** : `npm install && npm run build`
   - **Start command** : `npm run start`
   - **Port** : Hostinger fournit automatiquement la variable `PORT`

---

## 5. Variables d'environnement Hostinger

Dans le panneau de l'app Node.js → **Variables d'environnement**, ajouter une par une :

| Clé                              | Valeur                                                  |
| -------------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | `https://xxxxx.supabase.co` (étape 1)                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | `eyJ...` (étape 1)                                      |
| `SUPABASE_SERVICE_ROLE_KEY`      | `eyJ...` (étape 1, **secret**)                          |
| `ADMIN_PASSWORD`                 | Un mot de passe fort de votre choix pour `/admin`       |
| `RESEND_API_KEY`                 | `re_...` (étape 2)                                      |
| `EMAIL_FROM`                     | `ATS Valrose <contact@ats-valrose.fr>`                  |
| `EMAIL_TO_NOTIFICATIONS`         | `contact@ats-valrose.fr`                                |
| `NODE_ENV`                       | `production`                                            |

Puis **Redémarrer l'app**.

---

## 6. Configurer le domaine

Le domaine `ats-valrose.fr` est déjà chez Hostinger.

- Si l'app Node.js a été créée sur le domaine principal, c'est déjà fait.
- Sinon : hPanel → **Domaines** → assigner `ats-valrose.fr` à l'app Node.js.
- **SSL** : hPanel → SSL → activer le certificat Let's Encrypt gratuit (1 clic).

---

## 7. Tester

1. Aller sur https://ats-valrose.fr → page d'accueil OK
2. Faire une inscription test sur `/stages` et `/ecole` (utiliser votre propre email)
3. Vérifier :
   - Email de confirmation reçu
   - Email de notification reçu sur `contact@ats-valrose.fr`
   - L'inscription apparaît dans `/admin` (login avec `ADMIN_PASSWORD`)
4. Mettre à jour le statut depuis `/admin`, tester l'export CSV.

---

## 8. Lier depuis le site actuel

Sur votre site WordPress (`padeltennisnicevalrose.fr` ou équivalent), ajouter un bouton qui pointe vers `https://ats-valrose.fr` (ou directement `https://ats-valrose.fr/stages` pour les inscriptions stages).

---

## Mises à jour ultérieures

- **Changer les tarifs ou ajouter une semaine** : éditer `lib/data/stages.ts` puis `git push` → Hostinger redéploie tout seul.
- **Voir les inscriptions** : se connecter sur `/admin` avec `ADMIN_PASSWORD`.
- **Sauvegardes** : Supabase fait des backups automatiques quotidiens (plan gratuit : 7 jours conservés).

## En cas de problème

- **L'app ne démarre pas** : aller dans les logs Hostinger (panneau Node.js → Logs).
- **Erreur "Variables d'environnement manquantes"** : revérifier l'étape 5 et redémarrer l'app.
- **Pas d'email reçu** : vérifier que le domaine est bien validé chez Resend (étape 2).
- **`/admin` refuse le mot de passe** : vérifier `ADMIN_PASSWORD` dans les env vars Hostinger.
