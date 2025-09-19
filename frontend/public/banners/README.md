# 📸 Guide des Bannières - SubliMaroc

## 🎯 Comment ajouter de nouvelles bannières

### ✅ Formats supportés (TOUS les formats d'images)
- **JPG/JPEG** : `.jpg`, `.jpeg`
- **PNG** : `.png`
- **WebP** : `.webp`
- **GIF** : `.gif`
- **BMP** : `.bmp`
- **TIFF** : `.tiff`, `.tif`
- **SVG** : `.svg`
- **ICO** : `.ico`
- **AVIF** : `.avif`
- **HEIC/HEIF** : `.heic`, `.heif`

### 🚀 Comment ajouter une nouvelle bannière (MÉTHODE SIMPLE)

#### Étape 1 : Ajouter l'image
1. **Placez votre image** dans le dossier `frontend/public/banners/`
2. **Nommez-la** comme vous voulez (ex: `ma-banniere.jpg`)

#### Étape 2 : Configurer l'affichage
1. **Ouvrez le fichier** `frontend/src/config/banners.ts`
2. **Ajoutez une ligne** dans le tableau `bannerImages` :
   ```typescript
   { src: '/banners/ma-banniere.jpg', alt: 'Description de ma bannière' }
   ```
3. **Sauvegardez** le fichier
4. **Rechargez** votre site - la bannière apparaîtra !

### 📋 Exemple pratique

#### Ajouter une bannière "Promo spéciale" :
1. **Ajoutez** `promo-speciale.jpg` dans `frontend/public/banners/`
2. **Ouvrez** `frontend/src/config/banners.ts`
3. **Ajoutez** cette ligne dans le tableau :
   ```typescript
   { src: '/banners/promo-speciale.jpg', alt: 'Promo spéciale - Offres limitées' }
   ```
4. **Sauvegardez** et rechargez votre site

### 🔧 Fonctionnalités

- ✅ **Configuration simple** : Une seule ligne à ajouter
- ✅ **Support universel** : TOUTES les extensions d'images supportées
- ✅ **Contrôle total** : Vous choisissez l'ordre et les descriptions
- ✅ **Performance optimale** : Chargement direct, pas de détection asynchrone
- ✅ **Maintenance facile** : Un seul fichier à modifier

### 🎨 Conseils pour les bannières

- **Dimensions recommandées** : 1920x1080px (16:9)
- **Taille optimale** : < 2MB par image
- **Qualité** : Haute résolution pour un rendu optimal
- **Contenu** : Assurez-vous que le texte reste lisible
- **Formats modernes** : Utilisez WebP ou AVIF pour de meilleures performances

### 📁 Structure des fichiers

```
frontend/
├── public/
│   └── banners/           # Vos images ici
│       ├── bann1.jpg
│       ├── bann2.jpg
│       ├── ma-banniere.jpg
│       └── ...
└── src/
    └── config/
        └── banners.ts     # Configuration ici
```

### 🐛 Dépannage

Si une bannière n'apparaît pas :
1. ✅ Vérifiez que le fichier est dans `frontend/public/banners/`
2. ✅ Vérifiez que la ligne est ajoutée dans `frontend/src/config/banners.ts`
3. ✅ Vérifiez la syntaxe (virgules, guillemets)
4. ✅ Rechargez complètement la page (Ctrl+F5)

### 🎯 Ordre d'affichage

Les bannières s'affichent dans l'ordre du tableau dans `banners.ts`. Pour changer l'ordre, réorganisez simplement les lignes dans le fichier de configuration.
