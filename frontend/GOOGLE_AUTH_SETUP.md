# Configuration de l'authentification Google

## Problème identifié
L'erreur "Erreur lors de la connexion avec Google" indique un problème de configuration Firebase.

## Étapes de résolution

### 1. Configuration Firebase Console

1. **Accédez à la console Firebase** : https://console.firebase.google.com/
2. **Sélectionnez votre projet** : `sublimaroc`
3. **Allez dans Authentication** → **Sign-in method**
4. **Activez Google** :
   - Cliquez sur "Google"
   - Activez le toggle
   - Ajoutez un email de support projet
   - Sauvegardez

### 2. Configuration des domaines autorisés

1. **Dans Authentication** → **Settings** → **Authorized domains**
2. **Ajoutez vos domaines** :
   - `localhost` (pour le développement)
   - Votre domaine de production (ex: `sublimaroc.com`)

### 3. Mise à jour de la configuration Firebase

Remplacez les valeurs d'exemple dans `frontend/src/firebase.ts` par vos vraies clés :

```typescript
const firebaseConfig = {
  apiKey: "VOTRE_VRAIE_CLE_API",
  authDomain: "sublimaroc.firebaseapp.com",
  projectId: "sublimaroc",
  storageBucket: "sublimaroc.appspot.com",
  messagingSenderId: "VOTRE_VRAI_SENDER_ID",
  appId: "VOTRE_VRAI_APP_ID"
};
```

### 4. Vérification des erreurs courantes

#### Erreur `auth/operation-not-allowed`
- **Cause** : Google Auth non activé dans Firebase
- **Solution** : Activer Google dans Authentication → Sign-in method

#### Erreur `auth/unauthorized-domain`
- **Cause** : Domaine non autorisé
- **Solution** : Ajouter le domaine dans Authorized domains

#### Erreur `auth/popup-blocked`
- **Cause** : Popup bloquée par le navigateur
- **Solution** : Autoriser les popups pour votre site

### 5. Test de la configuration

1. **Ouvrez la console du navigateur** (F12)
2. **Tentez une connexion Google**
3. **Vérifiez les logs** pour identifier l'erreur exacte

### 6. Configuration OAuth Google (optionnel)

Si vous voulez une configuration plus avancée :

1. **Allez dans Google Cloud Console**
2. **Créez des identifiants OAuth 2.0**
3. **Configurez les URI de redirection** :
   - `http://localhost:3000` (développement)
   - `https://votre-domaine.com` (production)

## Messages d'erreur détaillés

Le code a été mis à jour pour afficher des messages d'erreur plus spécifiques :

- `auth/operation-not-allowed` → "L'authentification Google n'est pas activée"
- `auth/unauthorized-domain` → "Ce domaine n'est pas autorisé"
- `auth/network-request-failed` → "Erreur de réseau"
- Autres erreurs → Message détaillé avec le code d'erreur

## Prochaines étapes

1. Vérifiez la configuration Firebase
2. Testez la connexion Google
3. Consultez les logs de la console pour plus de détails
4. Contactez-moi si le problème persiste

