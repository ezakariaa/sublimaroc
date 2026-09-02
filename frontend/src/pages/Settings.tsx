import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import TelegramService from '../services/telegramService';
import { migrateSubProductIdFormat, SubProductIdMigrationReport } from '../services/apiService';
import { TELEGRAM_CONFIG } from '../config/telegram';
import './Settings.css';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [migrating, setMigrating] = useState(false);
  const [migrationReport, setMigrationReport] = useState<SubProductIdMigrationReport | null>(null);

  /**
   * Renomme les sous-produits dont l'identifiant ne suit pas le format
   * « <identifiant du produit>-<5 chiffres> ». Opération ponctuelle :
   * relancée, elle ne touche plus rien puisque tout est déjà conforme.
   */
  const handleMigrateSubProductIds = async () => {
    const message = [
      'Renommer les identifiants des sous-produits non conformes ?',
      '',
      'Chaque sous-produit sera recréé sous son nouvel identifiant, les articles et '
        + 'ventes qui le référencent seront mis à jour, puis l’ancien document sera supprimé.',
      '',
      'Cette action est irréversible.',
    ].join('\n');

    if (!window.confirm(message)) return;

    setMigrating(true);
    setMigrationReport(null);
    try {
      const report = await migrateSubProductIdFormat();
      setMigrationReport(report);

      if (report.migrated.length === 0 && report.errors.length === 0) {
        toast.info('Aucun identifiant à migrer : tout est déjà conforme.');
      } else if (report.errors.length > 0) {
        toast.warning(`${report.migrated.length} migré(s), ${report.errors.length} en erreur.`);
      } else {
        toast.success(`${report.migrated.length} sous-produit(s) migré(s).`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error);
      toast.error((error as Error)?.message || 'Erreur lors de la migration');
    } finally {
      setMigrating(false);
    }
  };

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

              <Col md={12}>
                <Card className="h-100 settings-card">
                  <Card.Body>
                    <h5 className="mb-2">
                      <i className="bi bi-wrench-adjustable me-2"></i>
                      Maintenance des identifiants
                    </h5>
                    <p className="text-muted mb-3">
                      Renomme les sous-produits créés avant la mise en place du format
                      « identifiant du produit + 5 chiffres ». Les articles et les ventes
                      qui les référencent sont mis à jour automatiquement.
                    </p>

                    <Button
                      variant="outline-primary"
                      onClick={handleMigrateSubProductIds}
                      disabled={migrating}
                    >
                      {migrating ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Migration en cours…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-arrow-repeat me-2"></i>
                          Migrer les identifiants des sous-produits
                        </>
                      )}
                    </Button>

                    {migrationReport && (
                      <Alert
                        variant={migrationReport.errors.length > 0 ? 'warning' : 'success'}
                        className="mt-3 mb-0"
                      >
                        <div className="mb-2">
                          <strong>{migrationReport.scanned}</strong> sous-produit(s) examiné(s),{' '}
                          <strong>{migrationReport.migrated.length}</strong> migré(s),{' '}
                          <strong>{migrationReport.articlesUpdated}</strong> article(s) et{' '}
                          <strong>{migrationReport.ventesUpdated}</strong> vente(s) mis à jour.
                        </div>

                        {migrationReport.migrated.map((item) => (
                          <div key={item.oldId} style={{ fontSize: '0.82rem' }}>
                            <span className="font-monospace">{item.oldId}</span>
                            {' → '}
                            <span className="font-monospace fw-bold">{item.newId}</span>
                            {item.nom ? ` (${item.nom})` : ''}
                          </div>
                        ))}

                        {migrationReport.errors.map((err, index) => (
                          <div key={index} className="text-danger" style={{ fontSize: '0.82rem' }}>
                            {err}
                          </div>
                        ))}
                      </Alert>
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
