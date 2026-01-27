// Service pour envoyer des notifications Telegram

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

class TelegramService {
  private static config: TelegramConfig | null = null;

  /**
   * Initialise la configuration Telegram
   * @param botToken Token du bot Telegram (obtenu via @BotFather)
   * @param chatId ID du chat Telegram où envoyer les messages
   */
  static initialize(botToken: string, chatId: string): void {
    if (!botToken || !chatId) {
      console.warn('⚠️ Tentative d\'initialisation Telegram avec des valeurs vides:', {
        hasToken: !!botToken,
        hasChatId: !!chatId
      });
      return;
    }
    this.config = { botToken, chatId };
    console.log('✅ Configuration Telegram initialisée', {
      hasToken: !!this.config.botToken,
      hasChatId: !!this.config.chatId,
      chatId: this.config.chatId
    });
  }

  /**
   * Vérifie si le service est configuré
   */
  static isConfigured(): boolean {
    const isConfig = this.config !== null && 
                     this.config.botToken !== '' && 
                     this.config.chatId !== '';
    
    if (!isConfig) {
      console.warn('⚠️ Telegram non configuré:', {
        hasConfig: this.config !== null,
        hasToken: this.config?.botToken ? 'Oui' : 'Non',
        hasChatId: this.config?.chatId ? 'Oui' : 'Non',
        tokenLength: this.config?.botToken?.length || 0,
        chatIdLength: this.config?.chatId?.length || 0
      });
    }
    
    return isConfig;
  }

  /**
   * Envoie un message Telegram
   * @param message Message à envoyer
   */
  static async sendMessage(message: string): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Telegram non configuré. Message non envoyé:', message);
      console.warn('Configuration actuelle:', {
        hasConfig: this.config !== null,
        hasToken: this.config?.botToken ? 'Oui' : 'Non',
        hasChatId: this.config?.chatId ? 'Oui' : 'Non'
      });
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.config!.botToken}/sendMessage`;
      console.log('📤 Envoi du message Telegram...', {
        url: url.replace(this.config!.botToken, '***'),
        chatId: this.config!.chatId,
        messageLength: message.length
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config!.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        console.error('❌ Erreur lors de la lecture de la réponse Telegram:', e);
        return false;
      }
      
      if (!response.ok) {
        const errorDescription = responseData.description || responseData.error_description || 'Erreur inconnue';
        const errorCode = responseData.error_code || 'N/A';
        
        console.error('❌ Erreur Telegram API:', {
          status: response.status,
          statusText: response.statusText,
          errorCode: errorCode,
          description: errorDescription,
          fullError: responseData
        });
        
        // Messages d'erreur spécifiques avec solutions
        if (errorDescription.includes('chat not found') || errorDescription.includes('chat_id')) {
          console.error('💡 SOLUTION: Le Chat ID est incorrect ou le bot n\'a pas été démarré.');
          console.error('   1. Cherchez votre bot sur Telegram (celui créé avec @BotFather)');
          console.error('   2. Envoyez-lui /start pour démarrer la conversation');
          console.error('   3. Vérifiez votre Chat ID avec @userinfobot');
        } else if (errorDescription.includes('Unauthorized') || errorDescription.includes('invalid token')) {
          console.error('💡 SOLUTION: Le BOT_TOKEN est incorrect ou invalide.');
          console.error('   1. Vérifiez le token dans @BotFather');
          console.error('   2. Assurez-vous que le token est complet et correct');
        } else {
          console.error('💡 Erreur Telegram:', errorDescription);
        }
        
        return false;
      }

      console.log('✅ Message Telegram envoyé avec succès:', responseData);
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du message Telegram:', error);
      return false;
    }
  }

  /**
   * Teste la connexion Telegram en envoyant un message de test
   */
  static async testConnection(): Promise<boolean> {
    const testMessage = '🧪 Test de connexion Telegram - Si vous recevez ce message, la configuration est correcte !';
    return await this.sendMessage(testMessage);
  }

  /**
   * Envoie une notification de stock épuisé
   * @param productName Nom du produit
   * @param productId ID du produit
   */
  static async notifyStockOut(productName: string, productId: string): Promise<boolean> {
    const message = `
🚨 <b>ALERTE STOCK ÉPUISÉ</b>

📦 <b>Produit:</b> ${productName}
🆔 <b>ID:</b> ${productId}
📊 <b>Stock:</b> 0

⚠️ Le stock de ce produit est maintenant épuisé. Veuillez réapprovisionner.
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Envoie une notification de stock faible
   * @param productName Nom du produit
   * @param productId ID du produit
   * @param currentStock Stock actuel
   */
  static async notifyLowStock(productName: string, productId: string, currentStock: number): Promise<boolean> {
    const message = `
⚠️ <b>ALERTE STOCK FAIBLE</b>

📦 <b>Produit:</b> ${productName}
🆔 <b>ID:</b> ${productId}
📊 <b>Stock actuel:</b> ${currentStock}

⚠️ Le stock de ce produit est faible. Pensez à réapprovisionner.
    `.trim();

    return await this.sendMessage(message);
  }
}

export default TelegramService;
