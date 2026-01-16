import React, { useState, useEffect, Suspense } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, InputGroup, Spinner, Alert, Modal } from 'react-bootstrap';
import { Product } from '../types';
import { ProductService, AchatService } from '../services/firebaseService';
import './Purchases.css';
import './AchatsTable.css';

// Lazy loading de la modal pour optimiser les performances
const AddMaterialModal = React.lazy(() => import('../components/modals/AddMaterialModal'));

interface MaterialAchat {
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
  materials: MaterialAchat[];
  dateAchat: Date;
  dateCommande: Date;
  dateLivraison: Date;
  etat: 'Reçue' | 'En cours';
  totalAchat: number;
  createdAt: any;
  updatedAt?: any;
}


const Achats: React.FC = () => {
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
          referenceAchat: achat.referenceAchat || `SUB-ACH-${new Date().toLocaleDateString('fr-FR').replace(/\//g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          fournisseur: achat.fournisseur,
          materials: achat.materials,
          dateAchat: achat.dateAchat?.toDate ? achat.dateAchat.toDate() : new Date(achat.dateAchat),
          dateCommande: achat.dateCommande?.toDate ? achat.dateCommande.toDate() : new Date(achat.dateCommande || new Date()),
          dateLivraison: achat.dateLivraison?.toDate ? achat.dateLivraison.toDate() : new Date(achat.dateLivraison || new Date()),
          etat: achat.etat || 'En cours',
          totalAchat: achat.totalAchat,
          createdAt: achat.createdAt,
          updatedAt: achat.updatedAt
        }));
        
        setAchats(formattedAchats);
        console.log('✅ Achats formatés:', formattedAchats.length);
        
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
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Filtrer seulement les achats de matériel
  const filteredPurchases = achats.filter(achat => {
    const matchesSearch = achat.referenceAchat.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         achat.fournisseur.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         achat.materials.some(m => m.nom.toLowerCase().includes(searchTerm.toLowerCase()));
    
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
      console.log('📥 Données brutes reçues de Firebase:', achatsData);
      
      const formattedAchats: Achat[] = achatsData.map(achat => ({
        id: achat.id,
        referenceAchat: achat.referenceAchat || `SUB-ACH-${new Date().toLocaleDateString('fr-FR').replace(/\//g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        fournisseur: achat.fournisseur,
        materials: achat.materials,
        dateAchat: achat.dateAchat?.toDate ? achat.dateAchat.toDate() : new Date(achat.dateAchat),
        dateCommande: achat.dateCommande?.toDate ? achat.dateCommande.toDate() : new Date(achat.dateCommande || new Date()),
        dateLivraison: achat.dateLivraison?.toDate ? achat.dateLivraison.toDate() : new Date(achat.dateLivraison || new Date()),
        etat: achat.etat || 'En cours',
        totalAchat: achat.totalAchat,
        createdAt: achat.createdAt,
        updatedAt: achat.updatedAt
      }));
      
      console.log('🔍 Achats formatés avec leurs états:', formattedAchats.map(a => ({ 
        id: a.id, 
        etat: a.etat,
        materials: a.materials.map((m: any) => ({ 
          nom: m.nom, 
          image: m.image,
          imageType: typeof m.image,
          hasImage: !!m.image
        }))
      })));
      // Forcer le re-render en créant un nouvel array
      setAchats([...formattedAchats]);
      console.log('✅ Achats rafraîchis:', formattedAchats.length);
      
      // Log détaillé pour déboguer les images
      formattedAchats.forEach((achat, idx) => {
        if (idx < 3) { // Log seulement les 3 premiers pour ne pas surcharger
          console.log(`📦 Achat ${idx + 1} (${achat.referenceAchat}):`, {
            materials: achat.materials.map((m: any) => ({
              nom: m.nom,
              image: m.image ? m.image.substring(0, 100) : '', // Log seulement le début pour éviter les logs trop longs avec base64
              isBase64: m.image && m.image.startsWith('data:image'),
              isFirebaseUrl: m.image && (m.image.startsWith('https://firebasestorage.googleapis.com') || m.image.startsWith('https://storage.googleapis.com')),
              isBlobUrl: m.image && m.image.startsWith('blob:'),
              isEmpty: !m.image || m.image === '',
              imageLength: m.image ? m.image.length : 0
            }))
          });
        }
      });
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
    setShowAddMaterialModal(true);
  };

  const handleDeleteAchat = async (purchase: any) => {
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
          <Col md={8}>
            <h1 className="page-title">
              <i className="bi bi-cart-dash me-2"></i>
              Gestion des Achats (Matériels)
            </h1>
            <p className="page-subtitle">
              Gérez vos commandes et achats auprès des fournisseurs
            </p>
          </Col>
          <Col md={4} className="d-flex justify-content-end align-items-center">
            <div className="d-flex gap-2">
              <Button
                variant="success"
                onClick={() => setShowAddMaterialModal(true)}
              >
                <i className="bi bi-box-seam me-1"></i>
                Nouveau Matériel
              </Button>
            </div>
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
                <h3 className="stat-number">{achats.length}</h3>
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
                <p className="stat-label">En Cours</p>
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
        <Row className="mb-4 mt-5">
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
          
          <Col md={2}>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les états</option>
              <option value="En cours">En cours</option>
              <option value="Reçue">Reçue</option>
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
              
              <Card.Body className="p-3">
                <div className="table-responsive achats-table-container">
                  <Table hover className="mb-0 align-middle">
                     <thead className="table-header">
                       <tr>
                         <th>Référence Achat / Matériel</th>
                         <th>Produits / Matériels</th>
                         <th>Total</th>
                         <th>Date Commande</th>
                         <th>Date Livraison</th>
                         <th>État</th>
                         <th>Actions</th>
                       </tr>
                     </thead>
                    <tbody>
                      {filteredPurchases.map((purchase) => (
                        <tr key={purchase.id}>
                          <td>
                            <div>
                              <strong className="text-primary">{purchase.referenceAchat}</strong>
                              <br />
                              <Badge bg="info" className="mt-1">Matériel</Badge>
                            </div>
                          </td>
                           <td>
                             <div className="products-info">
                              {purchase.materials.map((material, index) => (
                                <div key={index} className="product-item">
                                  {/* Image du matériel */}
                                  {material.image && material.image !== '/placeholder-product.jpg' && material.image !== '/mug.webp' && !material.image.startsWith('blob:') ? (
                                    <img 
                                      src={
                                        // Si l'image est en base64, l'utiliser directement
                                        // Sinon, ajouter le paramètre de cache-busting pour les URLs Firebase
                                        material.image.startsWith('data:image') 
                                          ? material.image 
                                          : `${material.image}${material.image.includes('?') ? '&' : '?'}_t=${purchase.updatedAt ? (purchase.updatedAt.toDate ? purchase.updatedAt.toDate().getTime() : new Date(purchase.updatedAt).getTime()) : purchase.createdAt?.toDate ? purchase.createdAt.toDate().getTime() : Date.now()}`
                                      }
                                      alt={material.nom}
                                      title={material.nom}
                                      loading="lazy"
                                      key={`img-${purchase.id}-${index}-${material.image.substring(0, 50)}`}
                                      onError={(e) => {
                                        console.error(`❌ Erreur chargement image pour ${material.nom}:`, {
                                          imageUrl: material.image?.substring(0, 100), // Log seulement le début pour éviter les logs trop longs avec base64
                                          purchaseId: purchase.id,
                                          materialIndex: index,
                                          isBase64: material.image?.startsWith('data:image')
                                        });
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/mug.webp';
                                      }}
                                    />
                                  ) : (
                                    <div 
                                      className="product-thumb-placeholder"
                                      style={{ 
                                        width: '60px', 
                                        height: '60px'
                                      }}
                                      title={`${material.nom} - Aucune image`}
                                    >
                                      <i className="bi bi-image"></i>
                                    </div>
                                  )}
                                  
                                  {/* Informations du matériel */}
                                  <div>
                                    <span className="product-name">{material.nom}</span>
                                    {material.description && (
                                      <small className="text-muted d-block" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                                        {material.description}
                                      </small>
                                    )}
                                    <small className="text-muted d-block">
                                      x{material.quantite} - {formatPrice(material.prixUnitaire)}
                                    </small>
                                    {material.referenceFournisseur && (
                                      <small className="text-info d-block">
                                        Ref: {material.referenceFournisseur}
                                      </small>
                                    )}
                                  </div>
                                </div>
                              ))}
                             </div>
                           </td>
                          <td>
                            <span className="purchase-total">
                              {formatPrice(purchase.totalAchat)}
                            </span>
                          </td>
                          <td>
                            <div className="date-info">
                              {formatDate(purchase.dateCommande)}
                            </div>
                          </td>
                          <td>
                            <div className="date-info">
                              {formatDate(purchase.dateLivraison)}
                            </div>
                          </td>
                          <td>
                            <Badge bg={purchase.etat === 'Reçue' ? 'success' : 'warning'}>
                              {purchase.etat}
                            </Badge>
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
          onMaterialAdded={async () => {
            console.log(isEditMode ? 'Matériel modifié avec succès' : 'Matériel ajouté avec succès');
            // Attendre un peu pour s'assurer que Firebase a bien mis à jour les données
            await new Promise(resolve => setTimeout(resolve, 500));
            // Rafraîchir la liste des achats
            console.log('🔄 Rafraîchissement des achats après modification...');
            await refreshAchats();
            // Forcer un re-render supplémentaire après un court délai pour s'assurer que les images sont à jour
            setTimeout(() => {
              console.log('🔄 Second rafraîchissement pour forcer la mise à jour des images...');
              refreshAchats();
            }, 1000);
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
                <Col md={12}>
                  <div className="alert alert-primary">
                    <h6 className="mb-1"><i className="bi bi-tag-fill me-2"></i>Référence d'Achat</h6>
                    <h4 className="mb-0 font-monospace">{selectedAchat.referenceAchat}</h4>
                  </div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <h6 className="modal-section-title">Informations Fournisseur</h6>
                  <p><strong>Nom:</strong> {selectedAchat.fournisseur.nom}</p>
                  <p><strong>Téléphone:</strong> {selectedAchat.fournisseur.telephone || 'Non renseigné'}</p>
                  <p><strong>Email:</strong> {selectedAchat.fournisseur.email || 'Non renseigné'}</p>
                  <p><strong>Ville:</strong> {selectedAchat.fournisseur.ville || 'Non renseigné'}</p>
                </Col>
                <Col md={6}>
                  <h6 className="modal-section-title">Informations Achat</h6>
                  <p><strong>ID:</strong> {selectedAchat.id}</p>
                  <p><strong>Date d'achat:</strong> {formatDate(selectedAchat.dateAchat)}</p>
                  <p><strong>Total:</strong> {formatPrice(selectedAchat.totalAchat)}</p>
                </Col>
              </Row>
              
              <h6 className="modal-section-title">Matériels Achetés</h6>
              <div className="table-responsive">
                <Table striped bordered hover size="sm" className="materials-preview-table">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>Nom</th>
                      <th style={{ width: '25%' }}>Référence</th>
                      <th style={{ width: '8%' }}>Quantité</th>
                      <th style={{ width: '16%' }}>Prix Unitaire</th>
                      <th style={{ width: '16%' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAchat.materials.map((material, index) => (
                      <tr key={index}>
                        <td>{material.nom}</td>
                        <td>{material.referenceFournisseur || 'N/A'}</td>
                        <td className="text-center">{material.quantite}</td>
                        <td className="text-end">{formatPrice(material.prixUnitaire)}</td>
                        <td className="text-end">{formatPrice(material.prixPaye)}</td>
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