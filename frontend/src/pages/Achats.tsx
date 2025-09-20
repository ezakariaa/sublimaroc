import React, { useState, useEffect, Suspense } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, InputGroup, Spinner, Alert, Modal } from 'react-bootstrap';
import { Product } from '../types';
import { ProductService, AchatService } from '../services/firebaseService';
import './Purchases.css';

// Lazy loading de la modal pour optimiser les performances
const AddMaterialModal = React.lazy(() => import('../components/modals/AddMaterialModal'));

interface MaterialAchat {
  nom: string;
  description: string;
  image: string;
  referenceSublimaroc: string;
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
  fournisseur: Fournisseur;
  materials: MaterialAchat[];
  dateAchat: Date;
  totalAchat: number;
  createdAt: any;
  updatedAt?: any;
}

interface Purchase {
  id: string;
  supplier: string;
  products: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  total: number;
  status: 'pending' | 'ordered' | 'received' | 'cancelled';
  orderDate: Date;
  expectedDate: Date;
  receivedDate?: Date;
}

const Achats: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [achats, setAchats] = useState<Achat[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedAchat, setSelectedAchat] = useState<Achat | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    supplier: '',
    products: [] as any[],
    expectedDate: ''
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'danger', message: string } | null>(null);

  // Chargement des données
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Chargement des données...');
        
        // Charger les produits
        const productsData = await ProductService.getAllProducts();
        setProducts(productsData);
        console.log('✅ Produits chargés:', productsData.length);
        
        // Charger les achats de matériel depuis Firebase
        const achatsData = await AchatService.getAllAchats();
        console.log('✅ Achats chargés depuis Firebase:', achatsData.length);
        
        // Convertir les données Firebase en format compatible
        const formattedAchats: Achat[] = achatsData.map(achat => ({
          id: achat.id,
          fournisseur: achat.fournisseur,
          materials: achat.materials,
          dateAchat: achat.dateAchat?.toDate ? achat.dateAchat.toDate() : new Date(achat.dateAchat),
          totalAchat: achat.totalAchat,
          createdAt: achat.createdAt,
          updatedAt: achat.updatedAt
        }));
        
        setAchats(formattedAchats);
        console.log('✅ Achats formatés:', formattedAchats.length);
        
        // Données de démonstration pour les anciens achats (à supprimer plus tard)
        const mockPurchases: Purchase[] = [
          {
            id: 'PUR-001',
            supplier: 'Fournisseur A',
            products: [
              { productId: 'prod1', productName: 'T-shirt Blanc', quantity: 100, unitPrice: 25, totalPrice: 2500 },
              { productId: 'prod2', productName: 'Mug Céramique', quantity: 50, unitPrice: 15, totalPrice: 750 }
            ],
            total: 3250,
            status: 'received',
            orderDate: new Date('2024-01-10'),
            expectedDate: new Date('2024-01-15'),
            receivedDate: new Date('2024-01-14')
          }
        ];
        setPurchases(mockPurchases);
        
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'warning', text: 'En attente' },
      ordered: { variant: 'info', text: 'Commandé' },
      received: { variant: 'success', text: 'Reçu' },
      cancelled: { variant: 'danger', text: 'Annulé' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Combiner les achats de matériel et les achats de produits
  const allPurchases = [
    ...purchases.map(p => ({ ...p, type: 'product' as const })),
    ...achats.map(a => ({ ...a, type: 'material' as const }))
  ];

  const filteredPurchases = allPurchases.filter(purchase => {
    if (purchase.type === 'product') {
      const matchesSearch = purchase.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || purchase.status === statusFilter;
      return matchesSearch && matchesStatus;
    } else {
      // Pour les achats de matériel
      const matchesSearch = purchase.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           purchase.fournisseur.nom.toLowerCase().includes(searchTerm.toLowerCase());
      // Les achats de matériel sont toujours "received" (reçus)
      const matchesStatus = !statusFilter || statusFilter === 'received';
      return matchesSearch && matchesStatus;
    }
  });

  const getTotalPurchases = () => {
    const productTotal = purchases.reduce((total, purchase) => total + purchase.total, 0);
    const materialTotal = achats.reduce((total, achat) => total + achat.totalAchat, 0);
    return productTotal + materialTotal;
  };

  const getPurchasesByStatus = (status: string) => {
    if (status === 'received') {
      // Inclure les achats de matériel qui sont toujours "received"
      return purchases.filter(purchase => purchase.status === status).length + achats.length;
    }
    return purchases.filter(purchase => purchase.status === status).length;
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
  };

  const handleCloseMaterialModal = () => {
    setShowAddMaterialModal(false);
    setIsEditMode(false);
    setSelectedAchat(null);
  };

  const refreshAchats = async () => {
    try {
      console.log('🔄 Rafraîchissement des achats...');
      const achatsData = await AchatService.getAllAchats();
      
      const formattedAchats: Achat[] = achatsData.map(achat => ({
        id: achat.id,
        fournisseur: achat.fournisseur,
        materials: achat.materials,
        dateAchat: achat.dateAchat?.toDate ? achat.dateAchat.toDate() : new Date(achat.dateAchat),
        totalAchat: achat.totalAchat,
        createdAt: achat.createdAt,
        updatedAt: achat.updatedAt
      }));
      
      setAchats(formattedAchats);
      console.log('✅ Achats rafraîchis:', formattedAchats.length);
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement:', error);
    }
  };

  const handlePreviewAchat = (purchase: any) => {
    if (purchase.type === 'material') {
      setSelectedAchat(purchase);
      setShowPreviewModal(true);
    } else {
      // Logique pour l'aperçu des achats de produits
      console.log('Aperçu achat produit:', purchase);
    }
  };

  const handleEditAchat = (purchase: any) => {
    if (purchase.type === 'material') {
      setSelectedAchat(purchase);
      setIsEditMode(true);
      setShowAddMaterialModal(true);
    } else {
      // Logique pour l'édition des achats de produits
      console.log('Édition achat produit:', purchase);
    }
  };

  const handleDeleteAchat = async (purchase: any) => {
    if (purchase.type === 'material') {
      const materialNames = purchase.materials.map((m: any) => m.nom).join(', ');
      const confirmed = window.confirm(
        `Êtes-vous sûr de vouloir supprimer cet achat de matériel ?\n\n` +
        `Matériel(s): ${materialNames}\n` +
        `Fournisseur: ${purchase.fournisseur.nom}\n` +
        `Total: ${formatPrice(purchase.totalAchat)}\n\n` +
        `Cette action est irréversible et supprimera définitivement l'achat de Firebase.`
      );
      
      if (!confirmed) {
        return;
      }

      try {
        console.log('🗑️ Suppression de l\'achat:', purchase.id);
        await AchatService.deleteAchat(purchase.id);
        setAlert({ type: 'success', message: `Achat de matériel "${materialNames}" supprimé avec succès` });
        refreshAchats();
        console.log('✅ Achat supprimé avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        setAlert({ type: 'danger', message: 'Erreur lors de la suppression de l\'achat de Firebase' });
      }
    } else {
      // Logique pour la suppression des achats de produits
      const productNames = purchase.products.map((p: any) => p.productName).join(', ');
      const confirmed = window.confirm(
        `Êtes-vous sûr de vouloir supprimer cet achat de produit ?\n\n` +
        `Produit(s): ${productNames}\n` +
        `Fournisseur: ${purchase.supplier}\n` +
        `Total: ${formatPrice(purchase.total)}\n\n` +
        `Cette action est irréversible.`
      );
      
      if (!confirmed) {
        return;
      }

      try {
        console.log('🗑️ Suppression de l\'achat de produit:', purchase.id);
        
        // Supprimer de la liste locale (puisque c'est des données de démonstration)
        setPurchases(prevPurchases => 
          prevPurchases.filter(p => p.id !== purchase.id)
        );
        
        setAlert({ type: 'success', message: `Achat de produit "${productNames}" supprimé avec succès` });
        console.log('✅ Achat de produit supprimé avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        setAlert({ type: 'danger', message: 'Erreur lors de la suppression de l\'achat' });
      }
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Chargement des achats...</p>
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
          <Col>
            <h1 className="page-title">
              <i className="bi bi-cart-dash me-2"></i>
              Gestion des Achats
            </h1>
            <p className="page-subtitle">
              Gérez vos commandes et achats auprès des fournisseurs
            </p>
          </Col>
        </Row>

        {/* Statistiques */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="text-center">
                <div className="stat-icon">
                  <i className="bi bi-cart-dash"></i>
                </div>
                <h3 className="stat-number">{purchases.length}</h3>
                <p className="stat-label">Total Achats</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="text-center">
                <div className="stat-icon">
                  <i className="bi bi-currency-dollar"></i>
                </div>
                <h3 className="stat-number">{formatPrice(getTotalPurchases())}</h3>
                <p className="stat-label">Montant Total</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="text-center">
                <div className="stat-icon">
                  <i className="bi bi-clock"></i>
                </div>
                <h3 className="stat-number">{getPurchasesByStatus('pending')}</h3>
                <p className="stat-label">En Attente</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="text-center">
                <div className="stat-icon">
                  <i className="bi bi-check-circle"></i>
                </div>
                <h3 className="stat-number">{getPurchasesByStatus('received')}</h3>
                <p className="stat-label">Reçus</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Actions et Filtres */}
        <Row className="mb-4">
          <Col md={3}>
            <InputGroup>
              <InputGroup.Text>
                <i className="bi bi-search"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Rechercher un achat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
          
          <Col md={2}>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="ordered">Commandé</option>
              <option value="received">Reçu</option>
              <option value="cancelled">Annulé</option>
            </Form.Select>
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
          
          <Col md={2}>
            <Button
              variant="primary"
              onClick={() => setShowAddModal(true)}
            >
              <i className="bi bi-plus me-1"></i>
              Nouvel Achat
            </Button>
          </Col>

          <Col md={3}>
            <Button
              variant="success"
              onClick={() => setShowAddMaterialModal(true)}
            >
              <i className="bi bi-box-seam me-1"></i>
              Nouveau Matériel
            </Button>
          </Col>
        </Row>

        {/* Résultats */}
        <Row className="mb-3">
          <Col>
            <p className="results-count">
              {filteredPurchases.length} achat{filteredPurchases.length > 1 ? 's' : ''} trouvé{filteredPurchases.length > 1 ? 's' : ''}
            </p>
          </Col>
        </Row>

        {/* Tableau des achats */}
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">
                  <i className="bi bi-list-ul me-2"></i>
                  Liste des Achats
                </h5>
              </Card.Header>
              
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="table-header">
                      <tr>
                        <th>ID Achat / Matériel</th>
                        <th>Fournisseur</th>
                        <th>Produits / Matériels</th>
                        <th>Total</th>
                        <th>Statut</th>
                        <th>Date Commande</th>
                        <th>Date Livraison</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map((purchase) => (
                        <tr key={purchase.id}>
                          <td>
                            {purchase.type === 'product' ? (
                              <strong>{purchase.id}</strong>
                            ) : (
                              <div>
                                <strong>{purchase.materials[0]?.nom || 'Matériel'}</strong>
                                <Badge bg="info" className="ms-2">Matériel</Badge>
                                <br />
                                <small className="text-muted">ID: {purchase.id}</small>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="supplier-info">
                              <div className="supplier-name">
                                {purchase.type === 'product' ? purchase.supplier : purchase.fournisseur.nom}
                              </div>
                              {purchase.type === 'material' && purchase.fournisseur.ville && (
                                <small className="text-muted">{purchase.fournisseur.ville}</small>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="products-info">
                              {purchase.type === 'product' ? (
                                purchase.products.map((product, index) => (
                                  <div key={index} className="product-item">
                                    <span className="product-name">{product.productName}</span>
                                    <small className="text-muted">
                                      x{product.quantity} - {formatPrice(product.unitPrice)}
                                    </small>
                                  </div>
                                ))
                              ) : (
                                purchase.materials.map((material, index) => (
                                  <div key={index} className="product-item">
                                    <span className="product-name">{material.nom}</span>
                                    <small className="text-muted">
                                      x{material.quantite} - {formatPrice(material.prixUnitaire)}
                                    </small>
                                    {material.referenceSublimaroc && (
                                      <small className="text-info d-block">
                                        Ref: {material.referenceSublimaroc}
                                      </small>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="purchase-total">
                              {formatPrice(purchase.type === 'product' ? purchase.total : purchase.totalAchat)}
                            </span>
                          </td>
                          <td>
                            {purchase.type === 'product' ? (
                              getStatusBadge(purchase.status)
                            ) : (
                              <Badge bg="success">Reçu</Badge>
                            )}
                          </td>
                          <td>
                            <div className="date-info">
                              {purchase.type === 'product' ? 
                                formatDate(purchase.orderDate) : 
                                formatDate(purchase.dateAchat)
                              }
                            </div>
                          </td>
                          <td>
                            <div className="date-info">
                              {purchase.type === 'product' ? (
                                <>
                                  <div>{formatDate(purchase.expectedDate)}</div>
                                  {purchase.receivedDate && (
                                    <small className="text-success">
                                      Reçu: {formatDate(purchase.receivedDate)}
                                    </small>
                                  )}
                                </>
                              ) : (
                                <div className="text-success">
                                  <i className="bi bi-check-circle me-1"></i>
                                  Livré
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="me-1"
                                title="Aperçu"
                                onClick={() => handlePreviewAchat(purchase)}
                              >
                                <i className="bi bi-eye"></i>
                              </Button>
                              <Button 
                                variant="outline-warning" 
                                size="sm" 
                                className="me-1"
                                title="Éditer"
                                onClick={() => handleEditAchat(purchase)}
                              >
                                <i className="bi bi-pencil"></i>
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                title="Supprimer"
                                onClick={() => handleDeleteAchat(purchase)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {filteredPurchases.length === 0 && (
          <Row>
            <Col className="text-center py-5">
              <i className="bi bi-search display-1 text-muted"></i>
              <h3 className="mt-3 text-muted">Aucun achat trouvé</h3>
              <p className="text-muted">
                Essayez de modifier vos critères de recherche
              </p>
            </Col>
          </Row>
        )}
      </Container>

      {/* Modal d'ajout d'achat */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nouvel Achat</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fournisseur</Form.Label>
                  <Form.Control
                    type="text"
                    value={newPurchase.supplier}
                    onChange={(e) => setNewPurchase({...newPurchase, supplier: e.target.value})}
                    placeholder="Nom du fournisseur"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date de livraison prévue</Form.Label>
                  <Form.Control
                    type="date"
                    value={newPurchase.expectedDate}
                    onChange={(e) => setNewPurchase({...newPurchase, expectedDate: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Produits à commander</Form.Label>
              <Form.Select>
                <option>Sélectionner un produit</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.nom} - {product.prix} MAD
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleAddPurchase}>
            Créer l'achat
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal pour ajouter/éditer du matériel */}
      <Suspense fallback={<div>Chargement...</div>}>
        <AddMaterialModal
          show={showAddMaterialModal}
          onHide={handleCloseMaterialModal}
          onMaterialAdded={() => {
            console.log(isEditMode ? 'Matériel modifié avec succès' : 'Matériel ajouté avec succès');
            // Rafraîchir la liste des achats
            refreshAchats();
            handleCloseMaterialModal();
          }}
          onAlert={handleAlert}
          initialAchat={selectedAchat}
          isEditMode={isEditMode}
        />
      </Suspense>

      {/* Modal d'aperçu de l'achat de matériel */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-eye me-2"></i>
            Aperçu de l'Achat de Matériel
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAchat && (
            <div>
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
              
              <h6>Matériels Achetés</h6>
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
                    {selectedAchat.materials.map((material, index) => (
                      <tr key={index}>
                        <td>{material.nom}</td>
                        <td>{material.referenceSublimaroc || material.referenceFournisseur || 'N/A'}</td>
                        <td>{material.quantite}</td>
                        <td>{formatPrice(material.prixUnitaire)}</td>
                        <td>{formatPrice(material.prixPaye)}</td>
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

    </div>
  );
};

export default Achats;