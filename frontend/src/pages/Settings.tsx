import React, { useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import TelegramService from '../services/telegramService';
import { TELEGRAM_CONFIG } from '../config/telegram';
import './Settings.css';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  // Initialiser TelegramService au chargement de la page
  useEffect(() => {
    if (TELEGRAM_CONFIG.ENABLED && TELEGRAM_CONFIG.BOT_TOKEN && TELEGRAM_CONFIG.CHAT_ID) {
      TelegramService.initialize(TELEGRAM_CONFIG.BOT_TOKEN, TELEGRAM_CONFIG.CHAT_ID);
      console.log('✅ TelegramService initialisé depuis Settings');
    } else {
      console.warn('⚠️ Configuration Telegram incomplète:', {
        enabled: TELEGRAM_CONFIG.ENABLED,
        hasToken: !!TELEGRAM_CONFIG.BOT_TOKEN,
        hasChatId: !!TELEGRAM_CONFIG.CHAT_ID
      });
    }
  }, []);

  const handleTestTelegram = async () => {
    console.log('🧪 Test manuel Telegram...');
    
    // Réinitialiser au cas où la configuration aurait changé
    if (TELEGRAM_CONFIG.ENABLED && TELEGRAM_CONFIG.BOT_TOKEN && TELEGRAM_CONFIG.CHAT_ID) {
      TelegramService.initialize(TELEGRAM_CONFIG.BOT_TOKEN, TELEGRAM_CONFIG.CHAT_ID);
    }
    
    if (!TelegramService.isConfigured()) {
      toast.error('Telegram non configuré. Vérifiez votre configuration.');
      return;
    }
    
    const success = await TelegramService.testConnection();
    if (success) {
      toast.success('Message de test envoyé ! Vérifiez Telegram.');
    } else {
      toast.error('Échec de l\'envoi. Vérifiez la console pour plus de détails.');
    }
  };

  return (
    <div className="settings-page">
      <Container className="py-5">
        <Row>
          <Col>
            <h1 className="mb-4">
              <i className="bi bi-gear me-2"></i>
              Paramètres
            </h1>
            
            <Row className="g-4">
              <Col md={6}>
                <Card className="h-100 settings-card">
                  <Card.Body>
                    <h5>
                      <i className="bi bi-tags"></i>
                      Gestion des Caractéristiques
                    </h5>
                    <p className="text-muted">
                      Gérez les caractéristiques disponibles pour chaque produit (type, anse, couleurs, dimensions, etc.)
                    </p>
                    <Button 
                      variant="primary" 
                      className="w-100 mt-3"
                      onClick={() => navigate('/settings/characteristics')}
                    >
                      <i className="bi bi-arrow-right-circle"></i>
                      Accéder à la gestion
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6}>
                <Card className="h-100 settings-card">
                  <Card.Body>
                    <h5>
                      <i className="bi bi-telegram"></i>
                      Notifications Telegram
                    </h5>
                    {TELEGRAM_CONFIG.ENABLED ? (
                      <>
                        <p className="text-muted">
                          Les notifications Telegram sont activées. Vous recevrez des alertes lorsque le stock d'un produit devient faible ou épuisé.
                        </p>
                        <Button 
                          variant="outline-info" 
                          className="w-100 mt-3"
                          onClick={handleTestTelegram}
                          title="Tester la connexion Telegram"
                        >
                          <i className="bi bi-telegram"></i>
                          Test Telegram
                        </Button>
                      </>
                    ) : (
                      <p className="text-muted">
                        Les notifications Telegram sont désactivées. Activez-les dans la configuration pour recevoir des alertes de stock.
                      </p>
                    )}
                  </Card.Body>
                </Card>
              </Col>

            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Settings;
