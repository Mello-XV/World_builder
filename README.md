# World Builder — Wiki de World-Building

Application web pour créer et gérer un wiki de world-building (univers fictifs, personnages, nations, etc.). Construite avec React + Firebase.

---

## Table des matières

1. [Description de l'application](#description)
2. [Architecture du projet](#architecture)
3. [Lancer en local](#lancer-en-local)
4. [Plan de migration HTML → React](#plan-de-migration)
5. [Comment modifier le projet](#modifier)

---

## Description

World Builder est un outil personnel pour les auteurs et créateurs d'univers fictifs. Il permet de :

- **Créer plusieurs projets** (un par univers, saga, etc.)
- **Créer des fiches** organisées en 26 catégories : Personnages, Nations, Organisations, Dynasties, Religions, Lieux, Sorts, etc.
- **Lier les fiches entre elles** avec la syntaxe `[[Nom du personnage]]` dans les textes
- **Rechercher** dans toutes les fiches avec `Ctrl+K`
- **Exporter / importer** ses données en JSON
- **Synchroniser** ses données via Firebase (accessibles depuis n'importe quel appareil)

---

## Architecture

```
world-builder/
├── index.html                    ← Page HTML principale (point d'entrée)
├── package.json                  ← Dépendances et scripts npm
├── vite.config.js                ← Configuration du bundler Vite
├── eslint.config.js              ← Règles ESLint (qualité du code)
├── .prettierrc                   ← Règles Prettier (formatage)
│
└── src/
    ├── main.jsx                  ← Point d'entrée React (monte l'App dans le HTML)
    ├── App.jsx                   ← Composant racine, navigation globale
    │
    ├── constants/
    │   ├── categories.js         ← Définition des 26 catégories (champs, couleurs, icônes)
    │   └── options.js            ← Listes déroulantes (statuts, types de lieux, etc.)
    │
    ├── lib/
    │   ├── firebase.js           ← Connexion Firebase (initialisation auth + firestore)
    │   └── firestore.js          ← Fonctions CRUD (charger/sauvegarder projets et fiches)
    │
    ├── styles/
    │   ├── global.css            ← Styles globaux (reset CSS, scrollbar, body)
    │   └── theme.js              ← Palette de couleurs + styles inline réutilisables
    │
    ├── components/
    │   ├── auth/
    │   │   └── AuthGate.jsx      ← Écran connexion/inscription/mot de passe oublié
    │   │
    │   ├── ui/                   ← Composants génériques réutilisables partout
    │   │   ├── RichText.jsx      ← Rendu texte enrichi (liens [[]], images, tableaux)
    │   │   ├── MentionField.jsx  ← Champ texte avec @mention autocomplété
    │   │   ├── SearchSelect.jsx  ← Liste déroulante avec recherche (choix unique)
    │   │   └── MultiSearchSelect.jsx ← Liste déroulante avec recherche (multi-choix)
    │   │
    │   ├── fields/               ← Composants pour chaque type de champ de fiche
    │   │   ├── AffiliationsField.jsx    ← Liens organisation/nation/religion
    │   │   ├── FamilleField.jsx         ← Arbre familial
    │   │   ├── RelationsRField.jsx      ← Relations avec des royaumes/organisations
    │   │   ├── PersLiesField.jsx        ← Personnages secondaires liés
    │   │   ├── DynastyMembersView.jsx   ← Membres d'une dynastie (lecture seule)
    │   │   ├── AffiliatedMembersView.jsx ← Personnages affiliés (lecture seule)
    │   │   └── FieldRenderer.jsx        ← Dispatche vers le bon composant selon le type
    │   │
    │   ├── entry/                ← Composants pour afficher / éditer les fiches
    │   │   ├── EntryEditor.jsx   ← Formulaire d'édition d'une fiche
    │   │   ├── EntryView.jsx     ← Affichage en lecture d'une fiche
    │   │   └── EntryList.jsx     ← Liste des fiches d'une catégorie
    │   │
    │   ├── layout/               ← Éléments de mise en page communs
    │   │   ├── AppHeader.jsx     ← Barre de navigation du wiki
    │   │   ├── SearchOverlay.jsx ← Overlay de recherche globale (Ctrl+K)
    │   │   └── Toast.jsx         ← Notification temporaire (ex: "Enregistré")
    │   │
    │   └── modals/               ← Fenêtres de dialogue (confirmation)
    │       ├── DeleteEntryModal.jsx      ← Confirmer suppression d'une fiche
    │       ├── DeleteProjectModal.jsx    ← Confirmer suppression d'un projet
    │       └── EditProjectNameModal.jsx  ← Renommer un projet
    │
    └── screens/                  ← Grandes pages / vues de l'application
        ├── ProjectsScreen.jsx    ← Liste des projets (premier écran après connexion)
        ├── DashboardScreen.jsx   ← Tableau de bord d'un projet ouvert
        └── WikiScreen.jsx        ← Écran principal du wiki (gère list/fiche/nouveau)
```

### Flux de navigation

```
[Connexion] AuthGate
     │
     └── App (composant racine)
          │
          ├── ProjectsScreen     ← Choisir ou créer un projet
          │
          └── WikiScreen         ← Wiki du projet ouvert
               │
               ├── DashboardScreen   → grille des catégories + fiches récentes
               ├── EntryList         → liste des fiches d'une catégorie
               ├── EntryView         → lecture d'une fiche (mode visuel)
               ├── EntryEditor       → édition d'une fiche existante
               └── EntryEditor       → création d'une nouvelle fiche
```

---

## Lancer en local

### Prérequis

Installer **Node.js** (version 18 minimum) : https://nodejs.org

### Étapes

```bash
# 1. Aller dans le dossier du projet React
cd world-builder

# 2. Installer les dépendances (une seule fois)
npm install

# 3. Lancer le serveur de développement
npm run dev
```

L'application s'ouvre sur `http://localhost:5173`

Toute modification de code est visible instantanément sans recharger la page.

### Scripts disponibles

| Commande | Ce que ça fait |
|---|---|
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Compile l'application pour la mettre en production |
| `npm run preview` | Prévisualise la version compilée |
| `npm run lint` | Vérifie la qualité du code (ESLint) |
| `npm run lint:fix` | Corrige automatiquement les problèmes détectés |
| `npm run format` | Formate le code automatiquement (Prettier) |
| `npm run format:check` | Vérifie que le code est bien formaté |

---

## Plan de migration

Ce projet est la migration du fichier `index.html` d'origine (un seul fichier de 325 lignes avec React CDN + Babel inline) vers un projet React structuré avec Vite.

### ✅ Étape 1 — Initialisation du projet
- [x] Créer le projet Vite + React (`npm create vite@latest`)
- [x] Installer Firebase (`npm install firebase`)
- [x] Configurer ESLint + Prettier

### ✅ Étape 2 — Structure de base
- [x] Nettoyer le boilerplate Vite
- [x] Créer l'arborescence `src/`
- [x] Styles globaux (`global.css`)

### ✅ Étape 3 — Données et configuration
- [x] Constantes : `constants/categories.js` + `constants/options.js`
- [x] Firebase : `lib/firebase.js` + `lib/firestore.js`
- [x] Thème : `styles/theme.js`

### ✅ Étape 4 — Composants UI de base
- [x] `RichText.jsx` — texte enrichi avec liens wiki
- [x] `MentionField.jsx` — champ avec @mention
- [x] `SearchSelect.jsx` — liste déroulante avec recherche
- [x] `MultiSearchSelect.jsx` — multi-sélection avec recherche

### ✅ Étape 5 — Champs spécialisés
- [x] `AffiliationsField.jsx`
- [x] `FamilleField.jsx`
- [x] `RelationsRField.jsx`
- [x] `PersLiesField.jsx`
- [x] `DynastyMembersView.jsx`
- [x] `AffiliatedMembersView.jsx`
- [x] `FieldRenderer.jsx`

### ✅ Étape 6 — Auth, Layout, Modals
- [x] `AuthGate.jsx`
- [x] `AppHeader.jsx`, `SearchOverlay.jsx`, `Toast.jsx`
- [x] `DeleteEntryModal.jsx`, `DeleteProjectModal.jsx`, `EditProjectNameModal.jsx`

### ✅ Étape 7 — Composants de fiches
- [x] `EntryEditor.jsx`
- [x] `EntryView.jsx`
- [x] `EntryList.jsx`

### ✅ Étape 8 — Écrans et câblage final
- [x] `ProjectsScreen.jsx`
- [x] `DashboardScreen.jsx`
- [x] `WikiScreen.jsx`
- [x] `App.jsx` + `main.jsx`

### 🔜 Prochaines améliorations possibles
- [ ] Tests unitaires (Vitest + Testing Library)
- [ ] React Router pour avoir des URLs par fiche (`/projet/123/fiche/456`)
- [ ] Zustand ou Context API pour simplifier la transmission de données
- [ ] Remplacer les styles inline par CSS Modules ou Tailwind
- [ ] Mode PWA (application installable, utilisable hors ligne)

---

## Modifier le projet

### Modifier un composant existant

Chaque fichier commence par un commentaire qui explique son rôle. Pour modifier :

1. Repère le fichier dans l'arborescence ci-dessus
2. Lis le commentaire en haut du fichier
3. Modifie le code
4. Sauvegarde → le navigateur se met à jour automatiquement

### Ajouter une catégorie de fiche

Ouvre [src/constants/categories.js](src/constants/categories.js) :

```js
// 1. Ajouter dans CATEGORIES :
maCategorie: {
  label: 'Ma catégorie',
  icon: '🎯',
  color: '#aabbcc',
  fields: [
    { key: 'monChamp', label: 'Mon champ', type: 'text', group: 'general' },
    // ...
  ],
},

// 2. Ajouter dans CAT_ORDER :
export const CAT_ORDER = [
  // ...
  'maCategorie',
];
```

### Ajouter un type de champ

1. Définis le type dans la catégorie : `type: 'monType'`
2. Dans [src/components/fields/FieldRenderer.jsx](src/components/fields/FieldRenderer.jsx), ajoute un `case 'monType':` dans `renderFieldEdit` ET `renderFieldView`
