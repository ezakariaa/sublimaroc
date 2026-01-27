import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { Order } from '../types';
import './Sales.css';

const Sales: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Données de démonstration
  useEffect(() => {
    const mockOrders: Order[] = [
      {
        id: '1',
        userId: 'user1',
        products: [
          { productId: 'prod1', quantity: 2, price: 150 },
          { productId: 'prod2', quantity: 1, price: 200 }
        ],
        total: 500,
        status: 'delivered',
        dateCreation: new Date('2024-01-15'),
        dateModification: new Date('2024-01-16')
      },
      {
        id: '2',
        userId: 'user2',
        products: [
          { productId: 'prod3', quantity: 3, price: 100 }
        ],
        total: 300,
        status: 'shipped',
        dateCreation: new Date('2024-01-14'),
        dateModification: new Date('2024-01-15')
      },
      {
        id: '3',
        userId: 'user3',
        products: [
          { productId: 'prod1', quantity: 1, price: 150 },
          { productId: 'prod4', quantity: 2, price: 80 }
        ],
        total: 310,
        status: 'pending',
        dateCreation: new Date('2024-01-13'),
        dateModification: new Date('2024-01-13')
      }
    ];

    setTimeout(() => {
      setOrders(mockOrders);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'warning', text: 'En attente' },
      confirmed: { variant: 'info', text: 'Confirmée' },
      shipped: { variant: 'primary', text: 'Expédiée' },
      delivered: { variant: 'success', text: 'Livrée' },
      cancelled: { variant: 'danger', text: 'Annulée' }
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.userId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesDate = !dateFilter || 
                       order.dateCreation.toDateString() === new Date(dateFilter).toDateString();
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getTotalSales = () => {
    return orders.reduce((total, order) => total + order.total, 0);
  };

  const getOrdersByStatus = (status: string) => {
    return orders.filter(order => order.status === status).length;
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

        {/* Statistiques */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="text-center">
                <div className="stat-icon">
                  <i className="bi bi-cart-check"></i>
                </div>
                <h3 className="stat-number">{orders.length}</h3>
                <p className="stat-label">Total Commandes</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="text-center">
                <div className="stat-icon">
                  <i className="bi bi-currency-dollar"></i>
                </div>
                <h3 className="stat-number">{formatPrice(getTotalSales())}</h3>
                <p className="stat-label">Chiffre d'Affaires</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="text-center">
                <div className="stat-icon">
                  <i className="bi bi-clock"></i>
                </div>
                <h3 className="stat-number">{getOrdersByStatus('pending')}</h3>
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
                <h3 className="stat-number">{getOrdersByStatus('delivered')}</h3>
                <p className="stat-label">Livrées</p>
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
                placeholder="Rechercher une commande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
          
          <Col md={3}>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmée</option>
              <option value="shipped">Expédiée</option>
              <option value="delivered">Livrée</option>
              <option value="cancelled">Annulée</option>
            </Form.Select>
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
              {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''} trouvée{filteredOrders.length > 1 ? 's' : ''}
            </p>
          </Col>
        </Row>

        {/* Tableau des commandes */}
        <Row>
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-list-ul me-2"></i>
                  Liste des Commandes
                </h5>
                <Button
                  variant="link"
                  className="text-white text-decoration-none fw-bold sales-header-add-sale"
                  style={{ fontSize: '0.95rem', padding: '0.25rem 0.75rem' }}
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
                      <th>ID Commande</th>
                      <th>Client</th>
                      <th>Produits</th>
                      <th>Total</th>
                      <th>Statut</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>#{order.id}</strong>
                        </td>
                        <td>
                          <div className="customer-info">
                            <div className="customer-name">Client {order.userId}</div>
                            <small className="text-muted">ID: {order.userId}</small>
                          </div>
                        </td>
                        <td>
                          <div className="products-info">
                            {order.products.map((product, index) => (
                              <div key={index} className="product-item">
                                <span className="product-name">Produit {product.productId}</span>
                                <small className="text-muted">
                                  x{product.quantity} - {formatPrice(product.price)}
                                </small>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className="order-total">{formatPrice(order.total)}</span>
                        </td>
                        <td>
                          {getStatusBadge(order.status)}
                        </td>
                        <td>
                          <div className="date-info">
                            <div>{formatDate(order.dateCreation)}</div>
                            {order.dateModification.getTime() !== order.dateCreation.getTime() && (
                              <small className="text-muted">
                                Modifié: {formatDate(order.dateModification)}
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
                  </table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {filteredOrders.length === 0 && (
          <Row>
            <Col className="text-center py-5">
              <i className="bi bi-search display-1 text-muted"></i>
              <h3 className="mt-3 text-muted">Aucune commande trouvée</h3>
              <p className="text-muted">
                Essayez de modifier vos critères de recherche
              </p>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
};

export default Sales;




