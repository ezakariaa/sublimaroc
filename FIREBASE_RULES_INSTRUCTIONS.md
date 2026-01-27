# Instructions pour configurer les règles Firebase

## ⚠️ IMPORTANT : Copiez ces règles dans Firebase Console

### 1. Règles Firestore Database

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet **sublimaroc-580d3**
3. Dans le menu de gauche, cliquez sur **Firestore Database**
4. Cliquez sur l'onglet **Règles** (Rules)
5. **Supprimez tout le contenu existant** et copiez-collez exactement ce qui suit :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permettre l'accès complet à toutes les collections et sous-collections pour le développement
    // ⚠️ ATTENTION: Ces règles sont très permissives et ne doivent être utilisées qu'en développement
    // Le pattern {document=**} couvre tous les documents et sous-collections récursivement
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

6. Cliquez sur **Publier** (Publish)

### 2. Règles Firebase Storage

1. Dans Firebase Console, cliquez sur **Storage** dans le menu de gauche
2. Cliquez sur l'onglet **Règles** (Rules)
3. **Supprimez tout le contenu existant** et copiez-collez exactement ce qui suit :

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Règles pour les achats de matériel
    match /Achats/Materiel/{referenceAchat}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null 
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null;
    }
    
    // Règles pour les produits (ancien format)
    match /produits/{productName}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null 
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null;
    }
    
    // Règles pour les sous-produits (nouveau format avec productId/subProductId)
    match /produits/{productId}/{subProductId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null 
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null;
    }
    
    // Bloquer tous les autres chemins
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

4. Cliquez sur **Publier** (Publish)

### 3. Vérification

Après avoir publié les règles :
1. Attendez quelques secondes pour que les règles soient propagées
2. Rafraîchissez votre application (F5)
3. Essayez à nouveau d'ajouter un sous-produit

### ⚠️ Note importante

- Les règles Firestore permettent **TOUT** (`if true`) - c'est pour le développement uniquement
- Les règles Storage nécessitent une **authentification** (`request.auth != null`)
- Assurez-vous d'être **connecté** dans l'application avant d'ajouter un sous-produit
