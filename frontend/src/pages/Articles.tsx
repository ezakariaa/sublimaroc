import React, { useState, useEffect, Suspense } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, InputGroup, Spinner, Alert, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Product } from '../types';
import { ProductService, AchatService, ArticleService, SubProductService } from '../services/apiService';
import ConfirmModal from '../components/modals/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import './Purchases.css';

// Lazy loading de la modal pour optimiser les performances
const AddArticleModal = React.lazy(() => import('../components/modals/AddArticleModal'));

interface ArticleAchat {
  nom: string;
  description: string;
  image: string;
  referenceFournisseur: string;
  prixUnitaire: number;
  quantite: number;
  prixPaye: number;
}

interface Fournisseur {
  nom: string;
  telephone: string;
  email: string;
  ville: string;
}

interface Achat {
  id: string;
  referenceAchat: string;
  fournisseur: Fournisseur;
  articles: ArticleAchat[];
  dateAchat: Date;
  dateCommande: Date;
  dateLivraison: Date;
  etat: 'Reçue' | 'En cours';
  totalAchat: number;
  createdAt: any;
  updatedAt?: any;
}

interface Variation {
  id: string;
  characteristics: {
    type?: string;
    anse?: string;
    couleurs?: string;
    dimensions?: string;
    materiau?: string;
    capacite?: string;
    poids?: string;
  };
  prixUnitaire?: number;
  quantite?: number;
  image?: string;
}

interface Article {
  id: string;
  referenceArticle: string;
  nom: string;
  categorieArticle: string;
  image?: string;
  petiteDescription?: string;
  description?: string;
  prixUnitaire: number;
  quantite: number;
  prixAPayer: number;
  dateCreation: Date;
  dateModification: Date;
  selectedTags?: {
    type?: string[];
    anse?: string[];
    couleurs?: string[];
    dimensions?: string[];
    materiau?: string[];
    capacite?: string[];
    poids?: string[];
  };
  variations?: Variation[];
}

const Articles: React.FC = () => {
  const [achats, setAchats] = useState<Achat[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [subProducts, setSubProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddArticleModal, setShowAddArticleModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedAchat, setSelectedAchat] = useState<Achat | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    supplier: '',
    products: [] as any[],
    expectedDate: ''
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'danger', message: string } | null>(null);
  const [showConfirmDeleteAchat, setShowConfirmDeleteAchat] = useState(false);
  const [achatToDelete, setAchatToDelete] = useState<Achat | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Chargement des données
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Chargement des données...');
        
        // Charger les produits
        const productsData = await ProductService.getAllProducts();
        setProducts(productsData);
        console.log('✅ Produits chargés:', productsData.length);
        
        // Charger tous les sous-produits pour les catégories
        const allSubProducts: any[] = [];
        for (const product of productsData) {
          try {
            const productSubProducts = await SubProductService.getSubProductsByProductId(product.id);
            allSubProducts.push(...productSubProducts);
          } catch (error) {
            console.error(`Erreur lors du chargement des sous-produits pour ${product.nom}:`, error);
          }
        }
        setSubProducts(allSubProducts);
        console.log('✅ Sous-produits chargés:', allSubProducts.length);
        
        // Charger les articles depuis la collection "Articles"
        const articlesData = await ArticleService.getAllArticles();
        console.log('✅ Articles chargés depuis Firebase:', articlesData.length);
        
        // Convertir les données Firebase en format compatible
        const formattedArticles: Article[] = articlesData.map((article: any) => ({
          id: article.id || article.referenceArticle,
          referenceArticle: article.referenceArticle || article.id,
          nom: article.nom || '',
          categorieArticle: article.categorieArticle || '',
          image: article.image || '',
          petiteDescription: article.petiteDescription || '',
          description: article.description || '',
          prixUnitaire: article.prixUnitaire || 0,
          quantite: article.quantite || 0,
          prixAPayer: article.prixAPayer || (article.prixUnitaire || 0) * (article.quantite || 0),
          dateCreation: article.dateCreation?.toDate ? article.dateCreation.toDate() : new Date(article.dateCreation || new Date()),
          dateModification: article.dateModification?.toDate ? article.dateModification.toDate() : new Date(article.dateModification || new Date())
        }));
        
        setArticles(formattedArticles);
        console.log('✅ Articles formatés:', formattedArticles.length);
        
        // Charger aussi les achats d'articles depuis Firebase (pour compatibilité)
        try {
          const achatsData = await AchatService.getAllAchatsArticles();
          console.log('✅ Achats d\'articles chargés depuis Firebase:', achatsData.length);
          
          const formattedAchats: Achat[] = achatsData.map(achat => ({
            id: achat.id,
            referenceAchat: achat.referenceAchat || `SUB-ART-${new Date().toLocaleDateString('fr-FR').replace(/\//g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            fournisseur: achat.fournisseur,
            articles: achat.articles,
            dateAchat: achat.dateAchat?.toDate ? achat.dateAchat.toDate() : new Date(achat.dateAchat),
            dateCommande: achat.dateCommande?.toDate ? achat.dateCommande.toDate() : new Date(achat.dateCommande || new Date()),
            dateLivraison: achat.dateLivraison?.toDate ? achat.dateLivraison.toDate() : new Date(achat.dateLivraison || new Date()),
            etat: achat.etat || 'En cours',
            totalAchat: achat.totalAchat,
            createdAt: achat.createdAt,
            updatedAt: achat.updatedAt
          }));
          
          setAchats(formattedAchats);
        } catch (error) {
          console.warn('⚠️ Erreur lors du chargement des achats (non bloquant):', error);
        }
        
        setLoading(false);
        console.log('🎉 Chargement terminé');
        
      } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        setAlert({ type: 'danger', message: 'Erreur lors du chargement des données' });
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(price);
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Filtrer seulement les achats d'articles
  const filteredPurchases = achats.filter(achat => {
    const matchesSearch = achat.referenceAchat.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         achat.fournisseur.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         achat.articles.some(a => a.nom.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Appliquer le filtre de statut
    const matchesStatus = !statusFilter || achat.etat === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getTotalPurchases = () => {
    return achats.reduce((total, achat) => total + achat.totalAchat, 0);
  };

  const getPurchasesByStatus = (status: string) => {
    if (status === 'received') {
      return achats.filter(achat => achat.etat === 'Reçue').length;
    } else if (status === 'pending') {
      return achats.filter(achat => achat.etat === 'En cours').length;
    }
    return 0;
  };

  const handleAddPurchase = () => {
    // Logique pour ajouter un nouvel achat
    console.log('Ajouter achat:', newPurchase);
    setShowAddModal(false);
    setNewPurchase({ supplier: '', products: [], expectedDate: '' });
  };

  const handleAlert = (type: 'success' | 'danger', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  // Fonction pour rafraîchir les articles
  const refreshArticles = async () => {
    try {
      const articlesData = await ArticleService.getAllArticles();
      const formattedArticles: Article[] = articlesData.map((article: any) => ({
        id: article.id || article.referenceArticle,
        referenceArticle: article.referenceArticle || article.id,
        nom: article.nom || '',
        categorieArticle: article.categorieArticle || '',
        image: article.image || '',
        petiteDescription: article.petiteDescription || '',
        description: article.description || '',
        prixUnitaire: article.prixUnitaire || 0,
        quantite: article.quantite || 0,
        prixAPayer: article.prixAPayer || (article.prixUnitaire || 0) * (article.quantite || 0),
        dateCreation: article.dateCreation?.toDate ? article.dateCreation.toDate() : new Date(article.dateCreation || new Date()),
        dateModification: article.dateModification?.toDate ? article.dateModification.toDate() : new Date(article.dateModification || new Date())
      }));
      setArticles(formattedArticles);
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement des articles:', error);
    }
  };

  // Filtrer les articles selon la recherche
  const filteredArticles = articles.filter((article: Article) => {
    const matchesSearch = !searchTerm || 
      article.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.referenceArticle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleCloseArticleModal = () => {
    setShowAddArticleModal(false);
    setIsEditMode(false);
    setSelectedAchat(null);
    setSelectedArticle(null);
  };

  const refreshAchats = async () => {
    try {
      console.log('🔄 Rafraîchissement des achats...');
      const achatsData = await AchatService.getAllAchatsArticles();
      console.log('📥 Données brutes reçues de Firebase:', achatsData);
      
      const formattedAchats: Achat[] = achatsData.map(achat => ({
        id: achat.id,
        referenceAchat: achat.referenceAchat || `SUB-ART-${new Date().toLocaleDateString('fr-FR').replace(/\//g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        fournisseur: achat.fournisseur,
        articles: achat.articles,
        dateAchat: achat.dateAchat?.toDate ? achat.dateAchat.toDate() : new Date(achat.dateAchat),
        dateCommande: achat.dateCommande?.toDate ? achat.dateCommande.toDate() : new Date(achat.dateCommande || new Date()),
        dateLivraison: achat.dateLivraison?.toDate ? achat.dateLivraison.toDate() : new Date(achat.dateLivraison || new Date()),
        etat: achat.etat || 'En cours',
        totalAchat: achat.totalAchat,
        createdAt: achat.createdAt,
        updatedAt: achat.updatedAt
      }));
      
      console.log('🔍 Achats formatés avec leurs états:', formattedAchats.map(a => ({ id: a.id, etat: a.etat })));
      setAchats(formattedAchats);
      console.log('✅ Achats rafraîchis:', formattedAchats.length);
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement:', error);
    }
  };

  const handlePreviewAchat = (purchase: any) => {
    setSelectedAchat(purchase);
    setShowPreviewModal(true);
  };

  const handleEditAchat = (purchase: any) => {
    setSelectedAchat(purchase);
    setIsEditMode(true);
    setShowAddArticleModal(true);
  };

  const handleDeleteAchatClick = (purchase: Achat) => {
    setAchatToDelete(purchase);
    setShowConfirmDeleteAchat(true);
  };

  const handleConfirmDeleteAchat = async () => {
    if (!achatToDelete) return;
    
    setIsDeleting(true);
    try {
      const articleNames = achatToDelete.articles.map((a: any) => a.nom).join(', ');
      console.log('🗑️ Suppression de l\'achat:', achatToDelete.id);
      await AchatService.deleteAchatArticle(achatToDelete.id);
      toast.success(`Achat d'articles "${articleNames}" supprimé avec succès`);
      refreshAchats();
      console.log('✅ Achat supprimé avec succès');
      
      // Fermer la modale
      setShowConfirmDeleteAchat(false);
      setAchatToDelete(null);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression de l\'achat de Firebase');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Chargement des articles...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <div className="purchases-page">
      <Container className="py-4">
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

        {/* Header */}
        <Row className="mb-4">
          <Col md={8}>
            <h1 className="page-title">
              <i className="bi bi-bag me-2"></i>
              Gestion des Articles
            </h1>
            <p className="page-subtitle">
              Gérez les articles proposés pour la vente par Graph'ink</p>
          </Col>
          <Col md={4} className="d-flex justify-content-end align-items-center">
            <div className="d-flex gap-2">
              <Button
                variant="success"
                onClick={() => setShowAddArticleModal(true)}
              >
                <i className="bi bi-bag-plus me-1"></i>
                Nouvel Article
              </Button>
            </div>
          </Col>
        </Row>

        {/* Statistiques */}
        <Row className="mb-4 purchases-stats-row">
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="stat-card-body d-flex align-items-center">
                <div className="stat-icon">
                  <i className="bi bi-bag"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">{articles.length}</h3>
                  <p className="stat-label">Total Articles</p>
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
                  <h3 className="stat-number">{new Intl.NumberFormat('fr-MA').format(articles.reduce((total, article) => total + article.prixAPayer, 0))}</h3>
                  <p className="stat-label">Montant Total</p>
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
                  <h3 className="stat-number">{getPurchasesByStatus('pending')}</h3>
                  <p className="stat-label">En Cours</p>
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
                  <h3 className="stat-number">{getPurchasesByStatus('received')}</h3>
                  <p className="stat-label">Reçus</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Espace entre les cartes et les filtres */}
        <div className="purchases-spacer" style={{ height: '3rem', width: '100%', display: 'block' }}></div>

        {/* Actions et Filtres */}
        <Row className="mb-4 purchases-filters-row">
          <Col md={4}>
            <InputGroup>
              <InputGroup.Text>
                <i className="bi bi-search"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Rechercher un article..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
          
          <Col md={2}>
            <CustomSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les états</option>
              <option value="En cours">En cours</option>
              <option value="Reçue">Reçue</option>
            </CustomSelect>
          </Col>
          
          <Col md={2}>
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Réinitialiser
            </Button>
          </Col>
        </Row>

        {/* Tableau des articles */}
        <Row>
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-list-ul me-2"></i>
                  Liste des Articles
                </h5>
                <Button 
                  variant="link" 
                  className="text-white text-decoration-none fw-bold purchases-header-add-article"
                  onClick={() => setShowAddArticleModal(true)}
                  style={{ fontSize: '0.95rem', padding: '0.25rem 0.75rem' }}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Ajouter un Article
                </Button>
              </Card.Header>
              
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="mb-0">
                     <thead className="table-header">
                       <tr>
                         <th>Nom de l'Article</th>
                         <th>Image</th>
                         <th>Petite Description</th>
                         <th>Quantité</th>
                         <th>Prix Unitaire</th>
                         <th>Actions</th>
                       </tr>
                     </thead>
                    <tbody>
                      {filteredArticles.map((article) => {
                        return (
                          <tr key={article.id}>
                            <td>
                              <div className="fw-bold">{article.nom}</div>
                              <small className="text-primary">{article.referenceArticle}</small>
                            </td>
                            <td>
                              {article.image ? (
                                <img 
                                  src={article.image} 
                                  alt={article.nom}
                                  style={{ 
                                    width: '60px', 
                                    height: '60px', 
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    border: '1px solid #dee2e6'
                                  }}
                                  title={article.nom}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/mug.webp';
                                  }}
                                />
                              ) : (
                                <div 
                                  style={{ 
                                    width: '60px', 
                                    height: '60px', 
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #dee2e6',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title={`${article.nom} - Aucune image`}
                                >
                                  <i className="bi bi-image text-muted" style={{ fontSize: '16px' }}></i>
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="text-muted">
                                {article.petiteDescription || <span className="text-muted fst-italic">Aucune description</span>}
                              </div>
                            </td>
                            <td>
                              <span className="fw-bold">{article.quantite}</span>
                            </td>
                            <td>
                              <span className="fw-bold text-primary">
                                {formatPrice(article.prixUnitaire)}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <Button 
                                  variant="outline-primary" 
                                  size="sm" 
                                  className="me-1"
                                  title="Aperçu"
                                  onClick={() => {
                                    // TODO: Implémenter l'aperçu de l'article
                                    console.log('Aperçu article:', article);
                                  }}
                                >
                                  <i className="bi bi-eye"></i>
                                </Button>
                                <Button 
                                  variant="outline-warning" 
                                  size="sm" 
                                  className="me-1"
                                  title="Éditer"
                                  onClick={() => {
                                    setSelectedArticle(article);
                                    setIsEditMode(true);
                                    setShowAddArticleModal(true);
                                  }}
                                >
                                  <i className="bi bi-pencil"></i>
                                </Button>
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  title="Supprimer"
                                  onClick={async () => {
                                    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'article "${article.nom}" ?`)) {
                                      try {
                                        await ArticleService.deleteArticle(article.referenceArticle);
                                        await refreshArticles();
                                        handleAlert('success', 'Article supprimé avec succès');
                                      } catch (error) {
                                        handleAlert('danger', 'Erreur lors de la suppression de l\'article');
                                      }
                                    }
                                  }}
                                >
                                  <i className="bi bi-trash"></i>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {filteredArticles.length === 0 && (
          <Row>
            <Col className="text-center py-5">
              <i className="bi bi-search display-1 text-muted"></i>
              <h3 className="mt-3 text-muted">Aucun article trouvé</h3>
              <p className="text-muted">
                {articles.length === 0 
                  ? 'Aucun article n\'a été ajouté pour le moment'
                  : 'Essayez de modifier vos critères de recherche'}
              </p>
            </Col>
          </Row>
        )}
      </Container>

      {/* Modal pour ajouter/éditer des articles */}
      <Suspense fallback={<div>Chargement...</div>}>
        <AddArticleModal
          show={showAddArticleModal}
          onHide={handleCloseArticleModal}
          onArticleAdded={async () => {
            console.log('Article ajouté/modifié avec succès');
            // Rafraîchir la liste des articles
            console.log('🔄 Rafraîchissement des articles après ajout/modification...');
            await refreshArticles();
            handleCloseArticleModal();
          }}
          onAlert={handleAlert}
          initialArticle={selectedArticle}
          isEditMode={isEditMode}
        />
      </Suspense>

      {/* Modal d'aperçu de l'achat d'articles */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-eye me-2"></i>
            Aperçu de l'Achat d'Articles
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAchat && (
            <div>
              <Row className="mb-3">
                <Col md={12}>
                  <div className="alert alert-primary">
                    <h6 className="mb-1"><i className="bi bi-tag-fill me-2"></i>Référence d'Achat</h6>
                    <h4 className="mb-0 font-monospace">{selectedAchat.referenceAchat}</h4>
                  </div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <h6>Informations Fournisseur</h6>
                  <p><strong>Nom:</strong> {selectedAchat.fournisseur.nom}</p>
                  <p><strong>Téléphone:</strong> {selectedAchat.fournisseur.telephone || 'Non renseigné'}</p>
                  <p><strong>Email:</strong> {selectedAchat.fournisseur.email || 'Non renseigné'}</p>
                  <p><strong>Ville:</strong> {selectedAchat.fournisseur.ville || 'Non renseigné'}</p>
                </Col>
                <Col md={6}>
                  <h6>Informations Achat</h6>
                  <p><strong>ID:</strong> {selectedAchat.id}</p>
                  <p><strong>Date d'achat:</strong> {formatDate(selectedAchat.dateAchat)}</p>
                  <p><strong>Total:</strong> {formatPrice(selectedAchat.totalAchat)}</p>
                </Col>
              </Row>
              
              <h6>Articles Achetés</h6>
              <div className="table-responsive">
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Référence</th>
                      <th>Quantité</th>
                      <th>Prix Unitaire</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAchat.articles.map((article, index) => (
                      <tr key={index}>
                        <td>{article.nom}</td>
                        <td>{article.referenceFournisseur || 'N/A'}</td>
                        <td>{article.quantite}</td>
                        <td>{formatPrice(article.prixUnitaire)}</td>
                        <td>{formatPrice(article.prixPaye)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modale de confirmation de suppression d'achat */}
      <ConfirmModal
        show={showConfirmDeleteAchat}
        onHide={() => {
          setShowConfirmDeleteAchat(false);
          setAchatToDelete(null);
        }}
        onConfirm={handleConfirmDeleteAchat}
        title="Confirmer la suppression"
        message={achatToDelete ? `Êtes-vous sûr de vouloir supprimer cet achat d'articles ?\n\n` +
          `Article(s): ${achatToDelete.articles.map((a: any) => a.nom).join(', ')}\n` +
          `Fournisseur: ${achatToDelete.fournisseur.nom}\n` +
          `Total: ${formatPrice(achatToDelete.totalAchat)}\n\n` +
          `Cette action est irréversible et supprimera définitivement l'achat de Firebase.` : ''}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
};

export default Articles;
