# SubliMaroc - Application de Sublimation

Application complète de gestion de produits de sublimation développée avec React, Node.js, TypeScript et Firebase.

## 🚀 Technologies Utilisées

### Frontend
- **React 18** avec TypeScript
- **React Router** pour la navigation
- **Bootstrap 5** et **React Bootstrap** pour l'interface
- **Bootstrap Icons** pour les icônes
- **Firebase** pour l'authentification et Firestore

### Backend
- **Node.js** avec **Express**
- **TypeScript** pour la sécurité des types
- **Firebase Admin SDK** pour l'accès aux données
- **CORS** et **Helmet** pour la sécurité
- **Morgan** pour le logging

## 📁 Structure du Projet

```
sublimaroc-react/
├── frontend/                 # Application React
│   ├── src/
│   │   ├── components/      # Composants réutilisables
│   │   ├── pages/          # Pages de l'application
│   │   ├── services/       # Services Firebase
│   │   ├── types/          # Types TypeScript
│   │   └── App.tsx         # Composant principal
│   └── public/             # Assets statiques
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── controllers/    # Contrôleurs API
│   │   ├── routes/         # Routes Express
│   │   ├── services/       # Services Firebase
│   │   ├── middleware/     # Middlewares Express
│   │   ├── types/          # Types TypeScript
│   │   └── app.ts          # Application Express
│   └── dist/               # Code compilé
└── README.md
```

## 🛠️ Installation et Configuration

### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn
- Compte Firebase avec Firestore activé

### 1. Configuration Firebase

1. Créez un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)
2. Activez Firestore Database
3. Générez une clé de service pour Firebase Admin SDK
4. Configurez les variables d'environnement

### 2. Installation du Frontend

```bash
cd frontend
npm install
```

### 3. Installation du Backend

```bash
cd backend
npm install
```

### 4. Configuration des Variables d'Environnement

Copiez le fichier `env.example` vers `.env` dans le dossier backend :

```bash
cp env.example .env
```

Modifiez le fichier `.env` avec vos configurations Firebase :

```env
PORT=5000
NODE_ENV=development
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_PRIVATE_KEY_ID=votre-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVOTRE_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=votre-service-account@votre-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=votre-client-id
FRONTEND_URL=http://localhost:3000
```

## 🚀 Démarrage de l'Application

### Développement

1. **Démarrer le Backend** :
```bash
cd backend
npm run dev
```

2. **Démarrer le Frontend** :
```bash
cd frontend
npm start
```

L'application sera accessible sur :
- Frontend : http://localhost:3000
- Backend API : http://localhost:5000/api

### Production

1. **Compiler le Backend** :
```bash
cd backend
npm run build
npm start
```

2. **Compiler le Frontend** :
```bash
cd frontend
npm run build
```

## 📋 Fonctionnalités

### Frontend
- ✅ Page d'accueil avec carousel et services
- ✅ Catalogue des produits avec filtres
- ✅ Gestion du stock avec statistiques
- ✅ Interface responsive avec Bootstrap
- ✅ Navigation avec React Router
- ✅ Intégration Firebase/Firestore

### Backend
- ✅ API REST pour les produits
- ✅ API REST pour les sous-produits
- ✅ Gestion d'erreurs centralisée
- ✅ Middleware de sécurité (CORS, Helmet)
- ✅ Logging avec Morgan
- ✅ Types TypeScript complets

## 🔧 API Endpoints

### Produits
- `GET /api/products` - Récupérer tous les produits
- `GET /api/products/:id` - Récupérer un produit par ID
- `POST /api/products` - Créer un nouveau produit
- `PUT /api/products/:id` - Mettre à jour un produit
- `DELETE /api/products/:id` - Supprimer un produit

### Sous-produits
- `GET /api/sub-products/product/:productId` - Récupérer les sous-produits d'un produit
- `POST /api/sub-products` - Créer un nouveau sous-produit
- `PUT /api/sub-products/:id` - Mettre à jour un sous-produit
- `DELETE /api/sub-products/:id` - Supprimer un sous-produit

### Santé
- `GET /api/health` - Vérifier l'état de l'API

## 🎨 Interface Utilisateur

L'application utilise Bootstrap 5 avec un design moderne et responsive :
- Navigation sticky avec logo et menu
- Carousel hero sur la page d'accueil
- Cards pour les produits avec effets hover
- Tableaux pour la gestion du stock
- Modales pour les formulaires
- Footer informatif

## 🔒 Sécurité

- Variables d'environnement pour les clés sensibles
- Middleware CORS configuré
- Helmet pour les en-têtes de sécurité
- Validation des données côté serveur
- Gestion d'erreurs sécurisée

## 📱 Responsive Design

L'application est entièrement responsive et s'adapte à tous les écrans :
- Mobile (320px+)
- Tablette (768px+)
- Desktop (1024px+)

## 🚀 Déploiement

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Déployer le dossier build/
```

### Backend (Heroku/Railway)
```bash
cd backend
npm run build
# Déployer avec les variables d'environnement configurées
```

## 📝 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📞 Support

Pour toute question ou support, contactez l'équipe de développement.




