# 📱 Configuration des Notifications Telegram

Ce guide vous explique comment configurer les notifications Telegram pour recevoir des alertes quand un produit passe en stock épuisé.

## 🚀 Étapes de Configuration

### 1. Créer un Bot Telegram

1. Ouvrez Telegram et cherchez **@BotFather**
2. Envoyez la commande `/newbot`
3. Suivez les instructions :
   - Donnez un nom à votre bot (ex: "Graph'Ink Stock Alert")
   - Donnez un nom d'utilisateur à votre bot (doit se terminer par "bot", ex: "graphink_stock_bot")
4. **Copiez le token** fourni par BotFather (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
   - ⚠️ **Important** : Gardez ce token secret, ne le partagez jamais publiquement

### 2. Obtenir votre Chat ID

1. Ouvrez Telegram et cherchez **@userinfobot**
2. Envoyez la commande `/start`
3. Le bot vous répondra avec votre **Chat ID** (un nombre, ex: `123456789`)
4. **Copiez ce Chat ID**

### 3. Configurer l'Application

1. Ouvrez le fichier `frontend/src/config/telegram.ts`
2. Remplissez les valeurs suivantes :

```typescript
export const TELEGRAM_CONFIG = {
  BOT_TOKEN: 'VOTRE_TOKEN_ICI', // Exemple: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
  CHAT_ID: 'VOTRE_CHAT_ID_ICI', // Exemple: '123456789'
  ENABLED: true, // Activez les notifications
};
```

3. Sauvegardez le fichier

### 4. Tester la Configuration

1. Redémarrez l'application (`npm start`)
2. Modifiez le stock d'un produit pour qu'il passe à 0
3. Vous devriez recevoir une notification Telegram !

## 📋 Types de Notifications

### Stock Épuisé
Vous recevrez une notification quand un produit passe de "en stock" à "stock épuisé" (0).

### Stock Faible
Vous recevrez également une notification quand un produit passe de "stock normal" (≥10) à "stock faible" (<10).

## 🔒 Sécurité

⚠️ **Important** : 
- Ne commitez jamais le fichier `telegram.ts` avec vos vraies clés dans un dépôt public
- Ajoutez `frontend/src/config/telegram.ts` à votre `.gitignore` si vous utilisez Git
- Considérez utiliser des variables d'environnement pour la production

## 🐛 Dépannage

### Les notifications ne fonctionnent pas ?

1. Vérifiez que `ENABLED` est à `true`
2. Vérifiez que le `BOT_TOKEN` est correct
3. Vérifiez que le `CHAT_ID` est correct
4. Ouvrez la console du navigateur (F12) pour voir les logs
5. Assurez-vous d'avoir démarré une conversation avec votre bot sur Telegram

### Comment obtenir le Chat ID d'un groupe ?

Si vous voulez envoyer les notifications à un groupe Telegram :

1. Ajoutez votre bot au groupe
2. Envoyez un message dans le groupe
3. Visitez : `https://api.telegram.org/bot<VOTRE_TOKEN>/getUpdates`
4. Cherchez `"chat":{"id":-123456789}` dans la réponse
5. Le Chat ID du groupe sera un nombre négatif (ex: `-123456789`)

## 📝 Exemple de Message Reçu

```
🚨 ALERTE STOCK ÉPUISÉ

📦 Produit: Mug Personnalisé
🆔 ID: SUB-MUG-1
📊 Stock: 0

⚠️ Le stock de ce produit est maintenant épuisé. Veuillez réapprovisionner.
```
