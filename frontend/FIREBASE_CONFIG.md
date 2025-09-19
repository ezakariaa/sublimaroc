# Configuration Firebase - Résolution de l'erreur API Key

## Erreur identifiée
```
Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)
```

## Solution

### 1. Obtenir vos vraies clés Firebase

1. **Allez sur** : https://console.firebase.google.com/
2. **Sélectionnez votre projet** : `sublimaroc`
3. **Allez dans** : Project Settings (⚙️) → General
4. **Dans la section "Your apps"** :
   - Si vous avez déjà une app web, cliquez dessus
   - Sinon, cliquez sur "Add app" → Web (</>) → Créez l'app

### 2. Copier la configuration

Vous verrez quelque chose comme :
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...", // VOTRE VRAIE CLÉ
  authDomain: "sublimaroc.firebaseapp.com",
  projectId: "sublimaroc",
  storageBucket: "sublimaroc.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};
```

### 3. Mettre à jour le fichier firebase.ts

Remplacez le contenu de `frontend/src/firebase.ts` par :

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuration Firebase - VOS VRAIES CLÉS
const firebaseConfig = {
  apiKey: "VOTRE_VRAIE_CLE_API_ICI",
  authDomain: "sublimaroc.firebaseapp.com",
  projectId: "sublimaroc",
  storageBucket: "sublimaroc.appspot.com",
  messagingSenderId: "VOTRE_VRAI_SENDER_ID",
  appId: "VOTRE_VRAI_APP_ID"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser les services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
```

### 4. Alternative : Variables d'environnement

Créez un fichier `.env` dans le dossier `frontend/` :

```env
REACT_APP_FIREBASE_API_KEY=VOTRE_VRAIE_CLE_API
REACT_APP_FIREBASE_AUTH_DOMAIN=sublimaroc.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=sublimaroc
REACT_APP_FIREBASE_STORAGE_BUCKET=sublimaroc.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=VOTRE_VRAI_SENDER_ID
REACT_APP_FIREBASE_APP_ID=VOTRE_VRAI_APP_ID
```

### 5. Activer Google Authentication

1. **Dans Firebase Console** → Authentication → Sign-in method
2. **Cliquez sur "Google"**
3. **Activez le toggle**
4. **Ajoutez un email de support**
5. **Sauvegardez**

### 6. Configurer les domaines autorisés

1. **Dans Authentication** → Settings → Authorized domains
2. **Ajoutez** :
   - `localhost`
   - Votre domaine de production

### 7. Redémarrer l'application

```bash
cd frontend
npm start
```

## Vérification

Après avoir mis à jour la configuration :

1. **Ouvrez la console** (F12)
2. **Tentez une connexion Google**
3. **Vérifiez les logs** - vous devriez voir :
   ```
   Configuration Firebase: {
     projectId: "sublimaroc",
     authDomain: "sublimaroc.firebaseapp.com",
     apiKey: "Configuré"
   }
   ```

## Problèmes courants

- **Clé API invalide** → Vérifiez que vous avez copié la bonne clé
- **Projet incorrect** → Assurez-vous d'utiliser le bon projectId
- **Google Auth non activé** → Activez Google dans Sign-in method
- **Domaine non autorisé** → Ajoutez localhost dans Authorized domains

## Support

Si le problème persiste, partagez :
1. Les logs de la console
2. Votre configuration Firebase (sans la clé API)
3. Le message d'erreur exact

