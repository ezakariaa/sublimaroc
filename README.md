# SUBLIMAROC — Version Firebase

Site : **https://sublimaroc-580d3.web.app**
Console : https://console.firebase.google.com/project/sublimaroc-580d3

## Architecture

React (CRA + TypeScript) → Firebase SDK → Firestore / Auth / Storage.
Il n'y a plus de backend : le navigateur parle directement à Firebase, et la
sécurité est assurée par les règles Firestore et Storage.

```
SUBLIMAROC/
├── frontend/                    ← Application React
│   ├── .env                     ← Configuration Firebase (clés publiques)
│   └── src/
│       ├── firebase.ts          ← Initialisation du SDK
│       ├── services/apiService.ts ← Tous les accès Firestore + Storage
│       └── contexts/AuthContext.tsx ← Session Firebase Auth
├── firebase.json                ← Hosting (rewrite SPA) + rules
├── firestore.rules              ← Sécurité de la base
├── storage.rules                ← Sécurité des images
├── .firebaserc                  ← Projet par défaut : sublimaroc-580d3
│
└── (hérité, plus utilisé)
    ├── api/                     ← Ancienne API PHP Hostinger
    ├── database/schema.sql      ← Ancien schéma MySQL
    └── migration/               ← Ancien script Firebase → MySQL
```

## Collections Firestore

| Collection       | Contenu                          | Lecture publique |
|------------------|----------------------------------|:----------------:|
| `Produits`       | Catalogue                        | oui              |
| `SousProduits`   | Déclinaisons (champ `productId`)  | oui              |
| `Settings`       | Doc `characteristicLabels`        | oui              |
| `Articles`       | Articles                          | non              |
| `Achats`         | Achats de matériels               | non              |
| `AchatsArticles` | Achats d'articles                 | non              |
| `users`          | Profil et rôle (doc = UID Auth)   | son propre doc   |

Toute écriture exige un compte authentifié.

## Développement

```bash
cd frontend
npm install
npm start          # http://localhost:3000, connecté à la base de production
```

## Déploiement

```bash
cd frontend && npm run build && cd ..
firebase deploy --only hosting
```

Pour publier les règles de sécurité :

```bash
firebase deploy --only firestore:rules,storage
```

## Comptes

Les comptes se créent dans **Firebase Console → Authentication → Users**.

Pour donner un rôle explicite à un compte, créer dans Firestore un document
`users/{UID}` contenant `{ nom: "...", role: "admin" }`. Sans ce document, tout
compte authentifié est traité comme admin.

## Images

Les nouvelles images sont téléversées dans Cloud Storage (`images/produits`,
`images/articles`, `images/materiels`, `images/sous-produits`) et seules leurs
URLs sont stockées dans Firestore.

Les documents créés avant cette migration contiennent encore des images en
base64 (`data:image/...`) directement dans les champs. Elles restent affichées
correctement ; elles pourront être converties plus tard.
