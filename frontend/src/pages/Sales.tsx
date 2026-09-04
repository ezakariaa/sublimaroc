import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, InputGroup, Spinner, Alert, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  SubProduct,
  CatalogueArticle,
  Vente,
  VenteStatut,
  VentePaiement,
} from '../types';
import { SubProductService, ArticleService, VenteService } from '../services/apiService';
import { downloadInvoice, invoiceObjectUrl } from '../services/invoiceService';
import ConfirmModal from '../components/modals/ConfirmModal';
import AddVenteModal from '../components/modals/AddVenteModal';
import CustomSelect from '../components/CustomSelect';
import './Sales.css';
import '../styles/PreviewModal.css';

const STATUT_CONFIG: Record<VenteStatut, { variant: string; text: string }> = {
  pending: { variant: 'warning', text: 'En attente' },
  confirmed: { variant: 'info', text: 'Confirmée' },
  shipped: { variant: 'primary', text: 'Expédiée' },
  delivered: { variant: 'success', text: 'Livrée' },
  cancelled: { variant: 'danger', text: 'Annulée' },
};

/** Les documents Firestore renvoient des Timestamp : on ramène tout à une Date. */
function toDate(value: any): Date {
  if (!value) return new Date(0);
  const date = value?.toDate ? value.toDate() : new Date(value);
  return isNaN(date.getTime()) ? new Date(0) : date;
}

const Sales: React.FC = () => {
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [subProducts, setSubProducts] = useState<SubProduct[]>([]);
  const [articles, setArticles] = useState<CatalogueArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

  const [showVenteModal, setShowVenteModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState('');

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [venteToDelete, setVenteToDelete] = useState<Vente | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAlert = useCallback((type: 'success' | 'danger', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
    if (type === 'success') toast.success(message);
    else toast.error(message);
  }, []);

  const loadVentes = useCallback(async () => {
    const ventesData = await VenteService.getAllVentes();
    const formatted: Vente[] = ventesData.map((vente: any) => ({
      id: vente.id,
      referenceVente: vente.referenceVente || vente.id,
      client: vente.client || { nom: '', telephone: '', email: '', adresse: '', ville: '' },
      produits: Array.isArray(vente.produits) ? vente.produits : [],
      total: vente.total || 0,
      statut: (vente.statut || 'pending') as VenteStatut,
      paiement: (vente.paiement || 'impaye') as VentePaiement,
      dateVente: toDate(vente.dateVente),
      notes: vente.notes || '',
      createdAt: vente.createdAt,
      updatedAt: vente.updatedAt,
    }));
    setVentes(formatted);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [, subProductsData, articlesData] = await Promise.all([
          loadVentes(),
          SubProductService.getAllSubProducts().catch(() => [] as SubProduct[]),
          ArticleService.getAllArticles().catch(() => [] as any[]),
        ]);

        setSubProducts(subProductsData);
        setArticles(
          articlesData.map((article: any) => ({
            id: article.id || article.referenceArticle,
            referenceArticle: article.referenceArticle || article.id,
            nom: article.nom || '',
            categorieArticle: article.categorieArticle || '',
            image: article.image || '',
            prixUnitaire: article.prixUnitaire || 0,
            quantite: article.quantite || 0,
          }))
        );
      } catch (error) {
        console.error('❌ Erreur lors du chargement des ventes:', error);
        setAlert({ type: 'danger', message: 'Erreur lors du chargement des ventes' });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [loadVentes]);

  /**
   * Image d'une ligne, retrouvée dans le catalogue au moment de l'affichage.
   *
   * Elle n'est volontairement pas copiée dans le document de vente : les
   * images sont stockées en base64, et les dupliquer dans chaque vente
   * ferait dépasser la limite de 1 Mio par document Firestore.
   */
  const imageBySource = useMemo(() => {
    const map = new Map<string, string>();
    const usable = (img?: string) =>
      img && img !== '/mug.webp' && img !== '/placeholder-product.jpg' ? img : '';

    subProducts.forEach((subProduct) => {
      const image =
        usable(Array.isArray(subProduct.images) ? subProduct.images[0] : '') ||
        usable(subProduct.image);
      if (image) map.set(`sousproduit:${subProduct.id}`, image);
    });

    articles.forEach((article) => {
      const image = usable(article.image);
      if (image) map.set(`article:${article.id}`, image);
    });

    return map;
  }, [subProducts, articles]);

  /** Une vente sans règlement renseigné est considérée impayée. */
  const getPaiementBadge = (paiement: VentePaiement) => (
    <Badge bg={paiement === 'paye' ? 'success' : 'danger'}>
      {paiement === 'paye' ? 'Payé' : 'Impayé'}
    </Badge>
  );

  const getStatusBadge = (statut: VenteStatut) => {
    const config = STATUT_CONFIG[statut] || STATUT_CONFIG.pending;
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(price || 0);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);

  const filteredVentes = ventes.filter((vente) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      vente.referenceVente.toLowerCase().includes(term) ||
      vente.client.nom.toLowerCase().includes(term) ||
      vente.produits.some((ligne) => (ligne.designation || '').toLowerCase().includes(term));

    const matchesStatus = !statusFilter || vente.statut === statusFilter;
    const matchesDate =
      !dateFilter || vente.dateVente.toDateString() === new Date(dateFilter).toDateString();

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getTotalSales = () => ventes.reduce((total, vente) => total + (vente.total || 0), 0);
  const getVentesByStatus = (statut: VenteStatut) =>
    ventes.filter((vente) => vente.statut === statut).length;

  // ── Actions ────────────────────────────────────────────
  const handleAddVente = () => {
    setSelectedVente(null);
    setIsEditMode(false);
    setShowVenteModal(true);
  };

  const handleEditVente = (vente: Vente) => {
    setSelectedVente(vente);
    setIsEditMode(true);
    setShowVenteModal(true);
  };

  const handlePreviewVente = (vente: Vente) => {
    setSelectedVente(vente);
    setShowPreviewModal(true);
  };

  const handleDeleteClick = (vente: Vente) => {
    setVenteToDelete(vente);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!venteToDelete) return;
    setIsDeleting(true);
    try {
      await VenteService.deleteVente(venteToDelete.id);
      await loadVentes();
      handleAlert('success', `Vente "${venteToDelete.referenceVente}" supprimée avec succès`);
      setShowConfirmDelete(false);
      setVenteToDelete(null);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      handleAlert('danger', 'Erreur lors de la suppression de la vente');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Facture ────────────────────────────────────────────
  const handleShowInvoice = (vente: Vente) => {
    try {
      setSelectedVente(vente);
      setInvoiceUrl(invoiceObjectUrl(vente));
      setShowInvoiceModal(true);
    } catch (error) {
      console.error('❌ Erreur lors de la génération de la facture:', error);
      handleAlert('danger', 'Erreur lors de la génération de la facture');
    }
  };

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    if (invoiceUrl) {
      URL.revokeObjectURL(invoiceUrl);
      setInvoiceUrl('');
    }
  };

  const handleDownloadInvoice = (vente: Vente) => {
    try {
      downloadInvoice(vente);
    } catch (error) {
      console.error('❌ Erreur lors du téléchargement de la facture:', error);
      handleAlert('danger', 'Erreur lors du téléchargement de la facture');
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Chargement des ventes...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <div className="sales-page">
      <Container className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <h1 className="page-title">
              <i className="bi bi-graph-up me-2"></i>
              Gestion des Ventes
            </h1>
            <p className="page-subtitle">
              Suivez et gérez toutes vos commandes et ventes
            </p>
          </Col>
        </Row>

        {/* Alertes */}
        {alert && (
          <Row className="mb-3">
            <Col>
              <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>
                {alert.message}
              </Alert>
            </Col>
          </Row>
        )}

        {/* Statistiques */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="stat-card-body d-flex align-items-center">
                <div className="stat-icon">
                  <i className="bi bi-cart-check"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">{ventes.length}</h3>
                  <p className="stat-label">Total Commandes</p>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="stat-card-body d-flex align-items-center">
                <div className="stat-icon">
                  <i className="bi bi-currency-dollar"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">{new Intl.NumberFormat('fr-MA').format(getTotalSales())}</h3>
                  <p className="stat-label">Chiffre d'Affaires</p>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="stat-card-body d-flex align-items-center">
                <div className="stat-icon">
                  <i className="bi bi-clock"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">{getVentesByStatus('pending')}</h3>
                  <p className="stat-label">En Attente</p>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="stat-card-body d-flex align-items-center">
                <div className="stat-icon">
                  <i className="bi bi-check-circle"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">{getVentesByStatus('delivered')}</h3>
                  <p className="stat-label">Livrées</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Filtres */}
        <Row className="mb-4 mt-5">
          <Col md={4}>
            <InputGroup>
              <InputGroup.Text>
                <i className="bi bi-search"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Rechercher une vente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>

          <Col md={3}>
            <CustomSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmée</option>
              <option value="shipped">Expédiée</option>
              <option value="delivered">Livrée</option>
              <option value="cancelled">Annulée</option>
            </CustomSelect>
          </Col>

          <Col md={3}>
            <Form.Control
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </Col>

          <Col md={2}>
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setDateFilter('');
              }}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Réinitialiser
            </Button>
          </Col>
        </Row>

        {/* Résultats */}
        <Row className="mb-3">
          <Col>
            <p className="results-count">
              {filteredVentes.length} vente{filteredVentes.length > 1 ? 's' : ''} trouvée
              {filteredVentes.length > 1 ? 's' : ''}
            </p>
          </Col>
        </Row>

        {/* Tableau des ventes */}
        <Row>
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-list-ul me-2"></i>
                  Liste des Ventes
                </h5>
                <Button
                  variant="link"
                  className="text-white text-decoration-none fw-bold sales-header-add-sale"
                  style={{ fontSize: '0.95rem', padding: '0.25rem 0.75rem' }}
                  onClick={handleAddVente}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Ajouter une vente
                </Button>
              </Card.Header>

              <Card.Body className="p-3">
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '12%' }}>Client</th>
                        <th style={{ width: '33%' }}>Produits</th>
                        <th style={{ width: '9%' }}>Total</th>
                        <th style={{ width: '9%' }}>Statut</th>
                        <th style={{ width: '9%' }}>Paiement</th>
                        <th style={{ width: '9%' }}>Date</th>
                        <th style={{ width: '9%' }}>Facture</th>
                        <th style={{ width: '10%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVentes.map((vente) => (
                        <tr key={vente.id}>
                          <td>
                            <div className="customer-info">
                              <div className="customer-name">{vente.client.nom || 'Client non renseigné'}</div>
                              {vente.client.ville && (
                                <small className="text-muted">{vente.client.ville}</small>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="vente-reference">{vente.referenceVente}</div>
                            <div className="products-info">
                              {vente.produits.map((ligne, index) => {
                                // L'image saisie sur la ligne prime ; à défaut,
                                // celle du catalogue via son enregistrement d'origine.
                                const image =
                                  ligne.image ||
                                  (ligne.sourceType && ligne.sourceId
                                    ? imageBySource.get(`${ligne.sourceType}:${ligne.sourceId}`)
                                    : '');
                                return (
                                  <div key={index} className="product-item">
                                    {image ? (
                                      <img
                                        src={image}
                                        alt={ligne.designation}
                                        title={ligne.designation}
                                        className="vente-thumb"
                                        loading="lazy"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = '/mug.webp';
                                        }}
                                      />
                                    ) : (
                                      <div className="vente-thumb vente-thumb-empty" title="Aucune image">
                                        <i className="bi bi-image"></i>
                                      </div>
                                    )}
                                    <div className="product-text">
                                      <span className="product-name">{ligne.designation}</span>
                                      <small className="text-muted">
                                        x{ligne.quantite} - {formatPrice(ligne.prixUnitaire)}
                                      </small>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td>
                            <span className="order-total">{formatPrice(vente.total)}</span>
                          </td>
                          <td>{getStatusBadge(vente.statut)}</td>
                          <td>{getPaiementBadge(vente.paiement)}</td>
                          <td>
                            <div className="date-info">{formatDate(vente.dateVente)}</div>
                          </td>

                          {/* Facture */}
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-dark"
                                size="sm"
                                title="Voir la facture PDF"
                                onClick={() => handleShowInvoice(vente)}
                              >
                                <i className="bi bi-file-earmark-pdf"></i>
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                title="Télécharger la facture PDF"
                                onClick={() => handleDownloadInvoice(vente)}
                              >
                                <i className="bi bi-download"></i>
                              </Button>
                            </div>
                          </td>

                          {/* Actions */}
                          <td>
                            <div className="action-buttons d-flex gap-1">
                              <Button
                                variant="outline-warning"
                                size="sm"
                                title="Éditer"
                                onClick={() => handleEditVente(vente)}
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                title="Aperçu"
                                onClick={() => handlePreviewVente(vente)}
                              >
                                <i className="bi bi-eye"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                title="Supprimer"
                                onClick={() => handleDeleteClick(vente)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {filteredVentes.length === 0 && (
          <Row>
            <Col className="text-center py-5">
              <i className="bi bi-search display-1 text-muted"></i>
              <h3 className="mt-3 text-muted">Aucune vente trouvée</h3>
              <p className="text-muted">
                {ventes.length === 0
                  ? 'Commencez par enregistrer une vente avec le bouton « Ajouter une vente »'
                  : 'Essayez de modifier vos critères de recherche'}
              </p>
            </Col>
          </Row>
        )}
      </Container>

      {/* Saisie / modification */}
      <AddVenteModal
        show={showVenteModal}
        onHide={() => {
          setShowVenteModal(false);
          setIsEditMode(false);
          setSelectedVente(null);
        }}
        onVenteSaved={loadVentes}
        onAlert={handleAlert}
        subProducts={subProducts}
        articles={articles}
        initialVente={selectedVente}
        isEditMode={isEditMode}
      />

      {/* Aperçu de la vente */}
      <Modal
        show={showPreviewModal}
        onHide={() => setShowPreviewModal(false)}
        size="lg"
        centered
        className="preview-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-eye me-2"></i>
            Aperçu de la Vente
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedVente && (
            <>
              <div className="preview-ref">
                <div>
                  <span className="preview-ref-label">
                    <i className="bi bi-receipt me-1"></i>
                    Référence de vente
                  </span>
                  <p className="preview-ref-value">{selectedVente.referenceVente}</p>
                </div>
                {getStatusBadge(selectedVente.statut)}
              </div>

              <Row className="g-3">
                <Col md={6}>
                  <div className="preview-card">
                    <div className="preview-card-title">
                      <i className="bi bi-person"></i>
                      Client
                    </div>
                    <dl className="mb-0">
                      <div className="preview-row">
                        <dt>Nom</dt>
                        <dd className={selectedVente.client.nom ? '' : 'is-empty'}>
                          {selectedVente.client.nom || 'Non renseigné'}
                        </dd>
                      </div>
                      <div className="preview-row">
                        <dt>Téléphone</dt>
                        <dd className={selectedVente.client.telephone ? '' : 'is-empty'}>
                          {selectedVente.client.telephone || 'Non renseigné'}
                        </dd>
                      </div>
                      <div className="preview-row">
                        <dt>Email</dt>
                        <dd className={selectedVente.client.email ? '' : 'is-empty'}>
                          {selectedVente.client.email || 'Non renseigné'}
                        </dd>
                      </div>
                      <div className="preview-row">
                        <dt>Adresse</dt>
                        <dd className={selectedVente.client.adresse ? '' : 'is-empty'}>
                          {selectedVente.client.adresse || 'Non renseignée'}
                        </dd>
                      </div>
                      <div className="preview-row">
                        <dt>Ville</dt>
                        <dd className={selectedVente.client.ville ? '' : 'is-empty'}>
                          {selectedVente.client.ville || 'Non renseignée'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="preview-card">
                    <div className="preview-card-title">
                      <i className="bi bi-calendar-event"></i>
                      Vente
                    </div>
                    <dl className="mb-0">
                      <div className="preview-row">
                        <dt>Date</dt>
                        <dd>{formatDate(selectedVente.dateVente)}</dd>
                      </div>
                      <div className="preview-row">
                        <dt>Statut</dt>
                        <dd>{getStatusBadge(selectedVente.statut)}</dd>
                      </div>
                      <div className="preview-row">
                        <dt>Paiement</dt>
                        <dd>{getPaiementBadge(selectedVente.paiement)}</dd>
                      </div>
                      <div className="preview-row">
                        <dt>Ventes</dt>
                        <dd>{selectedVente.produits.length}</dd>
                      </div>
                      <div className="preview-row">
                        <dt>Total</dt>
                        <dd>{formatPrice(selectedVente.total)}</dd>
                      </div>
                      <div className="preview-row">
                        <dt>Notes</dt>
                        <dd className={selectedVente.notes ? '' : 'is-empty'}>
                          {selectedVente.notes || 'Aucune'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </Col>
              </Row>

              <div className="preview-section-title">
                <i className="bi bi-cart"></i>
                Produits vendus
              </div>

              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th style={{ width: '52%' }}>Désignation</th>
                      <th style={{ width: '12%' }} className="center">Qté</th>
                      <th style={{ width: '18%' }} className="num">Prix unitaire</th>
                      <th style={{ width: '18%' }} className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVente.produits.map((ligne, index) => (
                      <tr key={index}>
                        <td className="line-name">{ligne.designation}</td>
                        <td className="center">{ligne.quantite}</td>
                        <td className="num">{formatPrice(ligne.prixUnitaire)}</td>
                        <td className="num">{formatPrice(ligne.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Total de la vente</td>
                      <td className="num">{formatPrice(selectedVente.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          {selectedVente && (
            <>
              <span className="preview-total">
                Total<strong>{formatPrice(selectedVente.total)}</strong>
              </span>
              <Button variant="outline-dark" onClick={() => handleDownloadInvoice(selectedVente)}>
                <i className="bi bi-download me-2"></i>
                Télécharger la facture
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
            <i className="bi bi-x-circle me-2"></i>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Facture PDF */}
      <Modal show={showInvoiceModal} onHide={closeInvoiceModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-file-earmark-pdf me-2"></i>
            Facture {selectedVente?.referenceVente}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {invoiceUrl && (
            <iframe
              title="Facture PDF"
              src={invoiceUrl}
              style={{ width: '100%', height: '70vh', border: 'none' }}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedVente && (
            <Button variant="dark" onClick={() => handleDownloadInvoice(selectedVente)}>
              <i className="bi bi-download me-2"></i>
              Télécharger le PDF
            </Button>
          )}
          <Button variant="secondary" onClick={closeInvoiceModal}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirmation de suppression */}
      <ConfirmModal
        show={showConfirmDelete}
        onHide={() => {
          setShowConfirmDelete(false);
          setVenteToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Confirmer la suppression"
        message={
          venteToDelete
            ? `Êtes-vous sûr de vouloir supprimer cette vente ?\n\n` +
              `Référence : ${venteToDelete.referenceVente}\n` +
              `Client : ${venteToDelete.client.nom || 'Non renseigné'}\n` +
              `Total : ${formatPrice(venteToDelete.total)}\n\n` +
              `Cette action est irréversible et supprimera définitivement la vente de Firebase.`
            : ''
        }
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};

export default Sales;
