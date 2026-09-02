import React, { useState, useEffect, Suspense } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, InputGroup, Spinner, Alert, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Product } from '../types';
import { ProductService, getUserPhotos } from '../services/apiService';
import {
  ACHAT_VARIANTS,
  AchatVariant,
  ACHETEURS,
  ACHETEUR_COMPTES,
} from '../config/achats';
import ConfirmModal from '../components/modals/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import './Purchases.css';
import './AchatsTable.css';
import '../styles/PreviewModal.css';

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
  achetePar?: string;
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


interface AchatsProps {
  /**
   * Variante affichée : « materiel » (collection Achats) par défaut,
   * ou « consommable » (collection Consommables). Voir `config/achats.ts`.
   */
  variant?: AchatVariant;
}

const Achats: React.FC<AchatsProps> = ({ variant = 'materiel' }) => {
  const config = ACHAT_VARIANTS[variant];
  const [achats, setAchats] = useState<Achat[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
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
  const [showConfirmDeleteAchat, setShowConfirmDeleteAchat] = useState(false);
  const [achatToDelete, setAchatToDelete] = useState<Achat | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /** Photos de profil des acheteurs, indexées par identifiant de compte. */
  const [acheteurPhotos, setAcheteurPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    getUserPhotos(Object.values(ACHETEUR_COMPTES))
      .then(setAcheteurPhotos)
      .catch(() => setAcheteurPhotos({}));
  }, []);

  /** Colonne de tri active et son sens. */
  const [sortField, setSortField] = useState<'dateCommande' | 'dateLivraison' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  /**
   * Un clic trie la colonne du plus récent au plus ancien ; un second
   * inverse le sens ; un troisième revient à l'ordre d'origine.
   */
  const handleSort = (field: 'dateCommande' | 'dateLivraison') => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('desc');
    } else if (sortDirection === 'desc') {
      setSortDirection('asc');
    } else {
      setSortField(null);
    }
  };

  const sortIcon = (field: 'dateCommande' | 'dateLivraison') => {
    if (sortField !== field) return 'bi-arrow-down-up';
    return sortDirection === 'desc' ? 'bi-sort-down' : 'bi-sort-up';
  };

  // Chargement des données
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Chargement des données...');
        
        // Charger les produits
        const productsData = await ProductService.getAllProducts();
        setProducts(productsData);
        console.log('✅ Produits chargés:', productsData.length);
        
        // Charger les achats depuis Firebase (Achats ou Consommables)
        const achatsData = await config.getAll();
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
          achetePar: achat.achetePar || '',
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
  }, [config]);


  /** Libellé d'un état selon la variante ; la valeur stockée ne change pas. */
  const etatLabel = (etat: string) =>
    etat === 'Reçue' ? config.etatRecueLabel : config.etatEnCoursLabel;

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
                         (achat.fournisseur?.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         achat.materials.some(m => m.nom.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !statusFilter || achat.etat === statusFilter;

    const rawDate = achat.dateCommande || achat.dateAchat;
    const date = rawDate ? new Date(rawDate) : null;
    const isValidDate = date && !isNaN(date.getTime());
    const matchesYear = !yearFilter || (isValidDate && date!.getFullYear().toString() === yearFilter);
    const matchesMonth = !monthFilter || (isValidDate && (date!.getMonth() + 1).toString() === monthFilter);

    return matchesSearch && matchesStatus && matchesYear && matchesMonth;
  });

  /**
   * Montant dépensé par chaque acheteur, sur l'ensemble des achats affichés.
   *
   * Les achats sans acheteur renseigné sont regroupés à part, pour que la
   * somme des tuiles corresponde toujours au montant total.
   */
  const depensesParAcheteur = ACHETEURS.map((personne) => ({
    personne,
    total: achats
      .filter((achat) => achat.achetePar === personne)
      .reduce((sum, achat) => sum + (achat.totalAchat || 0), 0),
  }));

  /** Chaque tuile d'acheteur couvre une part égale des 12 colonnes. */
  const largeurTuileAcheteur = Math.max(
    3,
    Math.floor(12 / Math.max(depensesParAcheteur.length, 1))
  );

  /** Achats affichés : filtrés, puis triés si une colonne est active. */
  const sortedPurchases = React.useMemo(() => {
    if (!sortField) return filteredPurchases;

    const time = (value: any) => {
      const date = value instanceof Date ? value : new Date(value);
      return isNaN(date.getTime()) ? 0 : date.getTime();
    };

    return [...filteredPurchases].sort((a, b) => {
      const diff = time(a[sortField]) - time(b[sortField]);
      return sortDirection === 'asc' ? diff : -diff;
    });
  }, [filteredPurchases, sortField, sortDirection]);

  /** Somme des achats affichés, pour la ligne de total du tableau. */
  const totalAffiche = sortedPurchases.reduce(
    (sum, purchase) => sum + (purchase.totalAchat || 0),
    0
  );

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

  const handleCloseMaterialModal = () => {
    setShowAddMaterialModal(false);
    setIsEditMode(false);
    setSelectedAchat(null);
  };

  const refreshAchats = async () => {
    try {
      console.log('🔄 Rafraîchissement des achats...');
      const achatsData = await config.getAll();
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
        achetePar: achat.achetePar || '',
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

  const handleDeleteAchatClick = (purchase: Achat) => {
    setAchatToDelete(purchase);
    setShowConfirmDeleteAchat(true);
  };

  const handleConfirmDeleteAchat = async () => {
    if (!achatToDelete) return;
    
    setIsDeleting(true);
    try {
      const materialNames = achatToDelete.materials.map((m: any) => m.nom).join(', ');
      console.log('🗑️ Suppression de l\'achat:', achatToDelete.id);
      await config.remove(achatToDelete.id);
      toast.success(`Achat de ${config.singularLower} "${materialNames}" supprimé avec succès`);
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
            <p className="mt-3">{config.loadingLabel}</p>
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
              {config.pageTitle}
            </h1>
            <p className="page-subtitle">
              {config.pageSubtitle}
            </p>
          </Col>
          <Col md={4} className="d-flex justify-content-end align-items-center">
            <div className="d-flex gap-2">
              <Button
                variant="success"
                onClick={() => setShowAddMaterialModal(true)}
              >
                <i className="bi bi-box-seam me-1"></i>
                Nouvel Achat
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
                  <i className="bi bi-cart-dash"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">{achats.length}</h3>
                  <p className="stat-label">{config.statTotalLabel}</p>
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
                  <p className="stat-label">{config.etatEnCoursLabel}</p>
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
                  <p className="stat-label">{config.etatRecueLabel}</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Dépenses par acheteur */}
        <Row className="mb-4 purchases-stats-row">
          {depensesParAcheteur.map(({ personne, total }) => (
            <Col md={largeurTuileAcheteur} key={personne}>
              <Card className="stat-card">
                <Card.Body className="stat-card-body d-flex align-items-center">
                  {acheteurPhotos[ACHETEUR_COMPTES[personne]] ? (
                    <img
                      src={acheteurPhotos[ACHETEUR_COMPTES[personne]]}
                      alt={personne}
                      title={personne}
                      className="acheteur-avatar"
                    />
                  ) : (
                    <div className="stat-icon">
                      <i className="bi bi-person-check"></i>
                    </div>
                  )}
                  <div className="stat-card-content">
                    <h3 className="stat-number">{formatPrice(total)}</h3>
                    <p className="stat-label">Dépensé par {personne}</p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
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
                placeholder="Rechercher un achat..."
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
              <option value="En cours">{config.etatEnCoursLabel}</option>
              <option value="Reçue">{config.etatRecueLabel}</option>
            </CustomSelect>
          </Col>

          <Col md={2}>
            <CustomSelect
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="">Toutes les années</option>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </CustomSelect>
          </Col>

          <Col md={2}>
            <CustomSelect
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="">Tous les mois</option>
              <option value="1">Janvier</option>
              <option value="2">Février</option>
              <option value="3">Mars</option>
              <option value="4">Avril</option>
              <option value="5">Mai</option>
              <option value="6">Juin</option>
              <option value="7">Juillet</option>
              <option value="8">Août</option>
              <option value="9">Septembre</option>
              <option value="10">Octobre</option>
              <option value="11">Novembre</option>
              <option value="12">Décembre</option>
            </CustomSelect>
          </Col>

          <Col md={2}>
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setYearFilter('');
                setMonthFilter('');
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
                  {config.listTitle}
                </h5>
              </Card.Header>
              
              <Card.Body className="p-3">
                <div className="table-responsive achats-table-container">
                  <Table hover className="mb-0 align-middle">
                     <thead className="table-header">
                       <tr>
                         <th>Référence Achat / {config.singular}</th>
                         <th>Produits / {config.plural}</th>
                         <th>Total</th>
                         <th
                           className="achats-sortable"
                           onClick={() => handleSort('dateCommande')}
                           title="Trier par date de commande"
                         >
                           Date Commande
                           <i className={`bi ${sortIcon('dateCommande')} ms-1`}></i>
                         </th>
                         <th
                           className="achats-sortable"
                           onClick={() => handleSort('dateLivraison')}
                           title="Trier par date de livraison"
                         >
                           Date Livraison
                           <i className={`bi ${sortIcon('dateLivraison')} ms-1`}></i>
                         </th>
                         <th>État</th>
                         <th>Actions</th>
                       </tr>
                     </thead>
                    <tbody>
                      {sortedPurchases.map((purchase) => (
                        <tr key={purchase.id}>
                          <td>
                            <div>
                              <strong className="text-primary">{purchase.referenceAchat}</strong>
                              <Badge bg="info" className="ms-2">{config.badgeLabel}</Badge>
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
                                      title={`${material.nom} - Aucune image`}
                                    >
                                      <i className="bi bi-image"></i>
                                    </div>
                                  )}
                                  
                                  {/* Informations du matériel */}
                                  <div>
                                    <span className="product-name">{material.nom}</span>
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
                              {etatLabel(purchase.etat)}
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
                                onClick={() => handleDeleteAchatClick(purchase)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {sortedPurchases.length > 0 && (
                      <tfoot>
                        <tr className="achats-total-row">
                          <td colSpan={2}>
                            Total ({sortedPurchases.length} achat
                            {sortedPurchases.length > 1 ? 's' : ''})
                          </td>
                          <td>{formatPrice(totalAffiche)}</td>
                          <td colSpan={4}></td>
                        </tr>
                      </tfoot>
                    )}
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
              <h3 className="mt-3 text-muted">{config.emptyTitle}</h3>
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
          variant={variant}
        />
      </Suspense>

      {/* Modal d'aperçu de l'achat */}
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
            Aperçu de l'Achat de {config.singular}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedAchat && (
            <>
              {/* Référence et état */}
              <div className="preview-ref">
                <div>
                  <span className="preview-ref-label">
                    <i className="bi bi-tag-fill me-1"></i>
                    Référence d'achat
                  </span>
                  <p className="preview-ref-value">{selectedAchat.referenceAchat}</p>
                </div>
                <Badge bg={selectedAchat.etat === 'Reçue' ? 'success' : 'warning'}>
                  {etatLabel(selectedAchat.etat)}
                </Badge>
              </div>

              <Row className="g-3">
                {config.showFournisseur && (
                <Col md={6}>
                  <div className="preview-card">
                    <div className="preview-card-title">
                      <i className="bi bi-building"></i>
                      Fournisseur
                    </div>
                    <dl className="mb-0">
                      <div className="preview-row">
                        <dt>Nom</dt>
                        <dd className={selectedAchat.fournisseur.nom ? '' : 'is-empty'}>
                          {selectedAchat.fournisseur.nom || 'Non renseigné'}
                        </dd>
                      </div>
                      <div className="preview-row">
                        <dt>Téléphone</dt>
                        <dd className={selectedAchat.fournisseur.telephone ? '' : 'is-empty'}>
                          {selectedAchat.fournisseur.telephone || 'Non renseigné'}
                        </dd>
                      </div>
                      <div className="preview-row">
                        <dt>Email</dt>
                        <dd className={selectedAchat.fournisseur.email ? '' : 'is-empty'}>
                          {selectedAchat.fournisseur.email || 'Non renseigné'}
                        </dd>
                      </div>
                      <div className="preview-row">
                        <dt>Ville</dt>
                        <dd className={selectedAchat.fournisseur.ville ? '' : 'is-empty'}>
                          {selectedAchat.fournisseur.ville || 'Non renseignée'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </Col>
                )}

                <Col md={config.showFournisseur ? 6 : 12}>
                  <div className="preview-card">
                    <div className="preview-card-title">
                      <i className="bi bi-calendar-event"></i>
                      {config.showFournisseur ? 'Achat' : 'Dépense'}
                    </div>
                    <dl className="mb-0">
                      <div className="preview-row">
                        <dt>Date d'achat</dt>
                        <dd>{formatDate(selectedAchat.dateAchat)}</dd>
                      </div>
                      <div className="preview-row">
                        <dt>Date de commande</dt>
                        <dd>{formatDate(selectedAchat.dateCommande)}</dd>
                      </div>
                      <div className="preview-row">
                        <dt>Date de livraison</dt>
                        <dd>{formatDate(selectedAchat.dateLivraison)}</dd>
                      </div>
                      <div className="preview-row">
                        <dt>Lignes</dt>
                        <dd>{selectedAchat.materials.length}</dd>
                      </div>
                      <div className="preview-row">
                        <dt>{config.payeurLabel}</dt>
                        <dd className={selectedAchat.achetePar ? '' : 'is-empty'}>
                          {selectedAchat.achetePar || 'Non renseigné'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </Col>
              </Row>

              <div className="preview-section-title">
                <i className="bi bi-box-seam"></i>
                {config.plural} achetés
              </div>

              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th style={{ width: '58px' }}>Image</th>
                      <th style={{ width: '32%' }}>Nom</th>
                      <th style={{ width: '22%' }}>Référence</th>
                      <th style={{ width: '9%' }} className="center">Qté</th>
                      <th style={{ width: '14%' }} className="num">Prix unitaire</th>
                      <th style={{ width: '14%' }} className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAchat.materials.map((material, index) => (
                      <tr key={index}>
                        <td>
                          {material.image &&
                          material.image !== '/mug.webp' &&
                          material.image !== '/placeholder-product.jpg' &&
                          !material.image.startsWith('blob:') ? (
                            <img
                              src={material.image}
                              alt={material.nom}
                              title={material.nom}
                              className="preview-thumb"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/mug.webp';
                              }}
                            />
                          ) : (
                            <span className="muted" title="Aucune image">
                              <i className="bi bi-image"></i>
                            </span>
                          )}
                        </td>
                        <td className="line-name">{material.nom}</td>
                        <td className={material.referenceFournisseur ? '' : 'muted'}>
                          {material.referenceFournisseur || 'Aucune'}
                        </td>
                        <td className="center">{material.quantite}</td>
                        <td className="num">{formatPrice(material.prixUnitaire)}</td>
                        <td className="num">{formatPrice(material.prixPaye)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5}>Total de l'achat</td>
                      <td className="num">{formatPrice(selectedAchat.totalAchat)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          {selectedAchat && (
            <span className="preview-total">
              Total<strong>{formatPrice(selectedAchat.totalAchat)}</strong>
            </span>
          )}
          <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
            <i className="bi bi-x-circle me-2"></i>
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
        message={achatToDelete ? `Êtes-vous sûr de vouloir supprimer cet achat de ${config.singularLower} ?\n\n` +
          `${config.singular}(s): ${achatToDelete.materials.map((m: any) => m.nom).join(', ')}\n` +
          (config.showFournisseur ? `Fournisseur: ${achatToDelete.fournisseur?.nom || 'Non renseigné'}\n` : '') +
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

export default Achats;