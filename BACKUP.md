# Backups de la base ATS Valrose

Ce document explique **3 niveaux** de protection des données du club, du plus simple au plus pro.

---

## 🔒 Niveau 1 — Automatique (déjà actif, rien à faire)

**Supabase** fait des **snapshots quotidiens automatiques** de ta base.
- Plan **Free** : 7 jours de rétention
- Plan **Pro (25 $/mois)** : 30 jours + Point-in-Time Recovery (peut restaurer à la minute près)

→ Va dans [Supabase Dashboard](https://supabase.com) → ton projet → **Database → Backups** pour voir tes snapshots et les restaurer.

**👉 Pour un club, je recommande de passer en Pro** dès que tu as les moyens. 25 $/mois pour 30 jours de rétention et la possibilité de restaurer à une minute donnée, c'est l'assurance qui vaut le coup.

---

## 💾 Niveau 2 — Backup local hebdo (recommandé, gratuit)

Un script qui dump toute ta base en un fichier JSON daté, que tu stockes dans **OneDrive** (synchro automatique cloud → backup hors-Supabase).

### Backup manuel (à lancer 1×/semaine)

```bash
npm run backup
```

Par défaut, ça crée un fichier `backups/ats-valrose-YYYY-MM-DD-HHhMM.json` à la racine du projet.

**Pour stocker directement dans ton OneDrive** :

```powershell
# PowerShell (Windows)
$env:BACKUP_DIR = "C:\Users\wildj\OneDrive\ATS Valrose Backups"
npm run backup
```

Le fichier fait ~0.5 Mo pour 900 lignes → tu peux garder des mois d'historique sans souci.

### Automatiser avec le Planificateur de tâches Windows

1. Ouvre **Planificateur de tâches** (taper "planificateur" dans la recherche Windows)
2. Clic droit sur "Bibliothèque du Planificateur" → **Créer une tâche…**
3. Onglet **Général** :
   - Nom : `ATS Valrose - Backup hebdo`
   - Cocher "Exécuter même si l'utilisateur n'est pas connecté"
4. Onglet **Déclencheurs** → **Nouveau** :
   - Hebdomadaire, tous les lundis à 6h00
5. Onglet **Actions** → **Nouvelle action** :
   - Programme : `powershell.exe`
   - Arguments :
     ```
     -Command "cd 'C:\Users\wildj\ats valrose'; $env:BACKUP_DIR='C:\Users\wildj\OneDrive\ATS Valrose Backups'; npm run backup"
     ```
6. Onglet **Conditions** → décocher "Démarrer la tâche seulement si l'ordinateur est sur secteur" (pour qu'elle s'exécute sur batterie aussi)
7. Onglet **Paramètres** → cocher "Exécuter la tâche dès que possible si un démarrage planifié a été manqué" (au cas où ton PC est éteint au moment du run)
8. Valider → entrer ton mot de passe Windows

✅ Tu peux tester la tâche tout de suite : clic droit sur la tâche → **Exécuter**.

### Tester le backup

Le fichier généré contient toutes les inscriptions, paiements, coachs, tarifs, etc. dans un JSON lisible. Tu peux l'ouvrir avec n'importe quel éditeur de texte pour vérifier.

### Restaurer un backup (⚠️ destructif)

```bash
npm run restore -- backups/ats-valrose-2026-06-01-04h08.json
```

Le script affiche ce qu'il va faire et demande de **taper OUI** pour confirmer. Il EFFACE puis ré-insère toutes les tables. À utiliser uniquement en cas de pépin majeur.

---

## ☁️ Niveau 3 — Backup hors-site automatique (pour les paranoïaques)

Si tu veux un backup vraiment hors de ta zone (incendie, vol PC, etc.), 2 options :

### Option A — GitHub Actions (gratuit, technique)
Configurer une GitHub Action qui lance le backup chaque dimanche et committe le résultat dans un repo privé séparé `ats-valrose-backups`. Demande à Claude la prochaine fois si ça t'intéresse.

### Option B — Supabase Pro + leur stockage S3
En plan Pro, tu peux configurer un export quotidien vers ton propre bucket S3 (AWS, OVH, Backblaze). Plus pro mais plus de setup.

---

## 🔐 Sécurité des backups

Les fichiers backups contiennent **toutes les données personnelles** des familles inscrites (noms, emails, téléphones, adresses, dates de naissance, paiements). À traiter avec soin :

- ✅ Le dossier `backups/` est dans `.gitignore` → **jamais** committé sur GitHub
- ✅ Stocker dans un **OneDrive personnel** (chiffré côté Microsoft) ou disque chiffré
- ❌ **Ne pas** mettre dans Dropbox public, sur un disque partagé, ou envoyer par mail
- ⚠️ Si tu changes de PC ou prêtes ton PC → **effacer les backups locaux** avant

---

## 🗓️ Routine recommandée

| Fréquence | Action |
|---|---|
| **Quotidien** | Supabase fait ses snapshots auto (Free 7j / Pro 30j) |
| **Hebdo** | Le script local tourne tous les lundis 6h via Planificateur Windows |
| **Mensuel** | Tu vérifies que les fichiers OneDrive arrivent bien (juste regarder le dossier) |
| **Annuel** | Tester une restauration sur une base Supabase de test, pour valider que le script marche encore |
