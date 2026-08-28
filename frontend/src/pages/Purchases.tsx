import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, InputGroup, Spinner, Alert, Modal } from 'react-bootstrap';
import { Product } from '../types';
import { ProductService } from '../services/apiService';
import './Purchases.css';
import CustomSelect from '../components/CustomSelect';

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

const Purchases: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    supplier: '',
    products: [] as any[],
    expectedDate: ''
  });

  // Données de démonstration
  useEffect(() => {
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
      },
      {
        id: 'PUR-002',
        supplier: 'Fournisseur B',
        products: [
          { productId: 'prod3', productName: 'Sac Tote', quantity: 75, unitPrice: 30, totalPrice: 2250 }
        ],
        total: 2250,
        status: 'ordered',
        orderDate: new Date('2024-01-12'),
        expectedDate: new Date('2024-01-20')
      },
      {
        id: 'PUR-003',
        supplier: 'Fournisseur C',
        products: [
          { productId: 'prod4', productName: 'Casquette', quantity: 200, unitPrice: 20, totalPrice: 4000 }
        ],
        total: 4000,
        status: 'pending',
        orderDate: new Date('2024-01-13'),
        expectedDate: new Date('2024-01-18')
      }
    ];

    const loadData = async () => {
      try {
        const productsData = await ProductService.getAllProducts();
        setProducts(productsData);
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
      }
      
      setTimeout(() => {
        setPurchases(mockPurchases);
        setLoading(false);
      }, 1000);
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

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || purchase.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getTotalPurchases = () => {
    return purchases.reduce((total, purchase) => total + purchase.total, 0);
  };

  const getPurchasesByStatus = (status: string) => {
    return purchases.filter(purchase => purchase.status === status).length;
  };

  const handleAddPurchase = () => {
    // Logique pour ajouter un nouvel achat
    console.log('Ajouter achat:', newPurchase);
    setShowAddModal(false);
    setNewPurchase({ supplier: '', products: [], expectedDate: '' });
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
              <Card.Body className="stat-card-body d-flex align-items-center">
                <div className="stat-icon">
                  <i className="bi bi-cart-dash"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">{purchases.length}</h3>
                  <p className="stat-label">Total Achats</p>
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
                  <h3 className="stat-number">{formatPrice(getTotalPurchases())}</h3>
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
                  <h3 className="stat-number">{getPurchasesByStatus('received')}</h3>
                  <p className="stat-label">Reçus</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Actions et Filtres */}
        <Row className="mb-4">
          <Col md={4}>
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
          
          <Col md={3}>
            <CustomSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="ordered">Commandé</option>
              <option value="received">Reçu</option>
              <option value="cancelled">Annulé</option>
            </CustomSelect>
          </Col>
          
          <Col md={3}>
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
                        <th>ID Achat</th>
                        <th>Fournisseur</th>
                        <th>Produits</th>
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
                            <strong>{purchase.id}</strong>
                          </td>
                          <td>
                            <div className="supplier-info">
                              <div className="supplier-name">{purchase.supplier}</div>
                            </div>
                          </td>
                          <td>
                            <div className="products-info">
                              {purchase.products.map((product, index) => (
                                <div key={index} className="product-item">
                                  <span className="product-name">{product.productName}</span>
                                  <small className="text-muted">
                                    x{product.quantity} - {formatPrice(product.unitPrice)}
                                  </small>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className="purchase-total">{formatPrice(purchase.total)}</span>
                          </td>
                          <td>
                            {getStatusBadge(purchase.status)}
                          </td>
                          <td>
                            <div className="date-info">
                              {formatDate(purchase.orderDate)}
                            </div>
                          </td>
                          <td>
                            <div className="date-info">
                              <div>{formatDate(purchase.expectedDate)}</div>
                              {purchase.receivedDate && (
                                <small className="text-success">
                                  Reçu: {formatDate(purchase.receivedDate)}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <Button variant="outline-primary" size="sm" className="me-1">
                                <i className="bi bi-eye"></i>
                              </Button>
                              <Button variant="outline-success" size="sm" className="me-1">
                                <i className="bi bi-check"></i>
                              </Button>
                              <Button variant="outline-danger" size="sm">
                                <i className="bi bi-x"></i>
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
              <CustomSelect>
                <option>Sélectionner un produit</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.nom} - {product.prix} MAD
                  </option>
                ))}
              </CustomSelect>
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
    </div>
  );
};

export default Purchases;




