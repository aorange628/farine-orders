# 🥖 FARINE - Système de Gestion de Commandes

Système de commande en ligne pour la Boulangerie FARINE (Le Pré Saint-Gervais)

## 📋 Table des matières

- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration Supabase](#configuration-supabase)
- [Lancement local](#lancement-local)
- [Déploiement Vercel](#déploiement-vercel)
- [Structure du projet](#structure-du-projet)

---

## 🎯 Prérequis

Avant de commencer, assurez-vous d'avoir :

- **Node.js** 18+ installé ([télécharger ici](https://nodejs.org/))
- Un compte **GitHub** (gratuit) → [créer un compte](https://github.com/signup)
- Un compte **Supabase** (gratuit) → [créer un compte](https://supabase.com/)
- Un compte **Vercel** (gratuit) → [créer un compte](https://vercel.com/signup)

---

## 📦 Installation

### 1. Télécharger le projet

Si vous avez Git installé :
```bash
git clone [URL_DU_REPO]
cd farine-orders
```

Sinon, téléchargez le ZIP et décompressez-le.

### 2. Installer les dépendances

```bash
npm install
```

---

## 🗄️ Configuration Supabase

### Étape 1 : Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com/)
2. Cliquez sur "Start your project"
3. Créez une nouvelle organisation (ex: "FARINE")
4. Créez un nouveau projet :
   - **Nom** : farine-orders
   - **Database Password** : notez-le bien !
   - **Region** : choisissez Europe (proche de la France)
5. Attendez 2-3 minutes que le projet soit créé

### Étape 2 : Importer le schéma de base de données

1. Dans votre projet Supabase, allez dans **SQL Editor** (dans le menu latéral)
2. Cliquez sur "+ New query"
3. Copiez TOUT le contenu du fichier `supabase-schema.sql`
4. Collez-le dans l'éditeur
5. Cliquez sur **Run** (ou Ctrl+Enter)
6. Vous devriez voir "Success. No rows returned"

### Étape 3 : Récupérer vos clés API

1. Allez dans **Project Settings** (icône ⚙️ en bas à gauche)
2. Cliquez sur **API** dans le menu
3. Notez ces deux valeurs :
   - **Project URL** (ex: https://xxxxx.supabase.co)
   - **anon public** key (la clé `anon` sous "Project API keys")

### Étape 4 : Configurer les variables d'environnement

1. Dupliquez le fichier `.env.local.example` et renommez-le `.env.local`
2. Ouvrez `.env.local` et remplacez :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_ici
NEXT_PUBLIC_ADMIN_USERNAME=Farine
NEXT_PUBLIC_ADMIN_PASSWORD=FARINE
```

⚠️ **Important** : Ne partagez JAMAIS ce fichier `.env.local` publiquement !

---

## 🚀 Lancement local

Une fois la configuration terminée :

```bash
npm run dev
```

Le site sera accessible sur : **http://localhost:3000**

- **Page publique** : http://localhost:3000
- **Back-office** : http://localhost:3000/admin

**Identifiants admin** :
- User : `Farine`
- Mot de passe : `FARINE`

---

## 🌐 Déploiement sur Vercel

### Étape 1 : Préparer GitHub

1. Créez un nouveau repository sur GitHub
2. Poussez votre code :

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin [URL_DE_VOTRE_REPO]
git push -u origin main
```

### Étape 2 : Déployer sur Vercel

1. Allez sur [vercel.com](https://vercel.com/)
2. Cliquez sur "Add New" → "Project"
3. Importez votre repository GitHub
4. Dans la section "Environment Variables", ajoutez :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_USERNAME`
   - `NEXT_PUBLIC_ADMIN_PASSWORD`
5. Cliquez sur **Deploy**
6. Attendez 2-3 minutes

Votre site sera accessible sur : `https://votre-projet.vercel.app`

### Étape 3 : Configurer votre domaine OVH

Une fois le site déployé sur Vercel :

1. Dans Vercel, allez dans **Settings** → **Domains**
2. Ajoutez votre domaine : `farine-lepresaintgervais.com`
3. Vercel vous donnera un enregistrement CNAME à ajouter
4. Connectez-vous sur **OVH** :
   - Allez dans votre Zone DNS
   - Ajoutez un enregistrement CNAME selon les instructions de Vercel
5. Attendez la propagation DNS (peut prendre quelques heures)

---

## 📁 Structure du projet

```
farine-orders/
├── public/              # Fichiers statiques (logo, images)
│   └── logo.png
├── src/
│   ├── app/            # Pages Next.js (App Router)
│   │   ├── page.tsx              # Page publique de commande
│   │   ├── admin/                # Back-office
│   │   │   ├── page.tsx          # Dashboard admin
│   │   │   ├── products/         # Gestion produits
│   │   │   ├── orders/           # Gestion commandes
│   │   │   └── settings/         # Paramètres
│   │   └── api/                  # API routes
│   ├── components/     # Composants React réutilisables
│   ├── lib/           # Utilitaires et configuration
│   │   ├── supabase.ts          # Client Supabase
│   │   └── utils.ts             # Fonctions utilitaires
│   └── types/         # Types TypeScript
├── supabase-schema.sql # Schéma de base de données
├── package.json
├── tailwind.config.js
└── README.md
```

---

## 🔧 Commandes utiles

```bash
# Lancer en développement
npm run dev

# Compiler pour la production
npm run build

# Lancer en production (après build)
npm start

# Vérifier les erreurs de code
npm run lint
```

---

## 📝 Notes importantes

### Sécurité

- Les identifiants admin sont stockés en variables d'environnement
- Les données sensibles ne sont jamais exposées côté client
- Supabase Row Level Security (RLS) protège la base de données

### Base de données

- Les données sont stockées sur Supabase (PostgreSQL)
- Backups automatiques inclus dans le plan gratuit
- Vous pouvez voir/modifier les données directement dans Supabase

### Limitations du plan gratuit

- **Supabase** : 500 MB stockage, 2 GB bandwidth/mois
- **Vercel** : 100 GB bandwidth/mois, builds illimités
- Largement suffisant pour votre usage !

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :

1. Vérifiez que toutes les variables d'environnement sont correctes
2. Vérifiez que le schéma SQL a bien été importé dans Supabase
3. Regardez les logs dans la console du navigateur (F12)
4. Regardez les logs de build sur Vercel

---

## 📞 Contact

Boulangerie FARINE  
37 rue de Stalingrad  
Le Pré Saint-Gervais

---

**Développé avec ❤️ pour FARINE**
