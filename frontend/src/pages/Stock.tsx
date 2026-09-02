import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Modal } from 'react-bootstrap';
import { Product, SubProduct } from '../types';
import { ProductService, SubProductService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import ImageCarousel from '../components/ImageCarousel';
import CharacteristicTags from '../components/CharacteristicTags';
import { toast } from 'react-toastify';
import './Stock.css';
import '../styles/PreviewModal.css';

// Lazy loading des modales pour optimiser les performances
const AddProductModal = React.lazy(() => import('../components/modals/AddProductModal'));
const AddSubProductModal = React.lazy(() => import('../components/modals/AddSubProductModal'));


const Stock: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [subProducts, setSubProducts] = useState<SubProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSubProductModal, setShowSubProductModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [showProductPreviewModal, setShowProductPreviewModal] = useState(false);
  const [productToPreview, setProductToPreview] = useState<Product | null>(null);
  const [showEditSubProductModal, setShowEditSubProductModal] = useState(false);
  const [showSubProductPreviewModal, setShowSubProductPreviewModal] = useState(false);
  const [subProductToPreview, setSubProductToPreview] = useState<SubProduct | null>(null);
  const [subProductToEdit, setSubProductToEdit] = useState<SubProduct | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'danger', message: string } | null>(null);
  
  // États pour le carousel d'images
  const [showImageCarousel, setShowImageCarousel] = useState(false);
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [carouselProductName, setCarouselProductName] = useState('');

  // Défilement d'images au hover
  const [hoverImageIndex, setHoverImageIndex] = useState<Record<string, number>>({});
  /** Sous-produits dont les variations sont dépliées. */
  const [expandedSubProducts, setExpandedSubProducts] = useState<Set<string>>(new Set());

  const toggleSubProductExpansion = (subProductId: string) => {
    setExpandedSubProducts((prev) => {
      const next = new Set(prev);
      if (next.has(subProductId)) next.delete(subProductId);
      else next.add(subProductId);
      return next;
    });
  };
  const hoverIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const handleProductImageMouseEnter = (productId: string, images: string[]) => {
    if (images.length <= 1) return;
    let idx = 0;
    hoverIntervals.current[productId] = setInterval(() => {
      idx = (idx + 1) % images.length;
      setHoverImageIndex(prev => ({ ...prev, [productId]: idx }));
    }, 700);
  };

  const handleProductImageMouseLeave = (productId: string) => {
    clearInterval(hoverIntervals.current[productId]);
    delete hoverIntervals.current[productId];
    setHoverImageIndex(prev => ({ ...prev, [productId]: 0 }));
  };
  
  // États pour la modale de confirmation de suppression
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'product' | 'subProduct', item: Product | SubProduct } | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fonction helper pour calculer le stock total d'un produit à partir des variations de ses sous-produits
  const calculateProductStockFromVariations = useCallback((subProducts: SubProduct[]): number => {
    return subProducts.reduce((sum, subProduct) => {
      // Si le sous-produit a des variations, additionner leurs quantités
      if (subProduct.variations && Array.isArray(subProduct.variations) && subProduct.variations.length > 0) {
        const variationsStock = subProduct.variations.reduce((varSum, variation) => {
          return varSum + (variation.quantite ?? 0);
        }, 0);
        return sum + variationsStock;
      }
      // Sinon, utiliser le stock du sous-produit (pour compatibilité)
      return sum + (subProduct.stock || 0);
    }, 0);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Vider la liste des produits pour s'assurer qu'on affiche seulement Firebase
        console.log('🧹 Nettoyage complet de la liste des produits...');
        setProducts([]);
        
        // Attendre un peu pour s'assurer que le state est bien vidé
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('✅ Liste des produits vidée');
        
        // Logs de diagnostic Firebase
        console.log('🚀 Initialisation Firebase...');
        console.log('📊 Configuration: projet sublimaroc');
        
        // Test de connexion simple d'abord (sans authentification)
        console.log('🔍 Test de connexion simple...');
        const isSimpleConnected = await ProductService.testSimpleConnection();
        if (!isSimpleConnected) {
          throw new Error('Impossible de créer les objets Firebase - vérifiez la configuration');
        }

        // Test de connexion complet
        console.log('🔍 Test de connexion complet...');
        const isConnected = await ProductService.testConnection();
        if (!isConnected) {
          throw new Error('Impossible de se connecter à Firebase - vérifiez les règles et l\'authentification');
        }
        
        console.log('Tentative de chargement des produits depuis Firebase...');
        const productsData = await ProductService.getAllProducts();
        console.log('📊 Données brutes reçues de Firebase:', productsData);
        console.log('📊 Type des données:', typeof productsData);
        console.log('📊 Nombre d\'éléments:', productsData.length);
        
        // Vérifier chaque produit
        productsData.forEach((product, index) => {
          console.log(`📦 Produit ${index + 1}:`, {
            id: product.id,
            nom: product.nom,
            source: 'Firebase'
          });
        });
        
        console.log('✅ Produits Firebase chargés avec succès:', productsData.length, 'produits');
        
        // Charger les sous-produits pour chaque produit et calculer le stock total
        console.log('🔄 Chargement des sous-produits...');
        const allSubProducts: SubProduct[] = [];
        
        // Créer une copie des produits avec le stock total calculé
        const productsWithTotalStock = await Promise.all(
          productsData.map(async (product) => {
            try {
              const productSubProducts = await SubProductService.getSubProductsByProductId(product.id);
              allSubProducts.push(...productSubProducts);
              
              // Calculer le stock total en additionnant les quantités de toutes les variations des sous-produits
              const totalStock = calculateProductStockFromVariations(productSubProducts);
              
              console.log(`📊 Produit ${product.nom}: ${productSubProducts.length} sous-produits, stock total: ${totalStock}`);
              
              return {
                ...product,
                stock: totalStock // Remplacer le stock du produit par la somme des sous-produits
              };
            } catch (error) {
              console.error(`Erreur lors du chargement des sous-produits pour ${product.nom}:`, error);
              return product; // Retourner le produit original en cas d'erreur
            }
          })
        );
        
        setProducts(productsWithTotalStock);
        setSubProducts(allSubProducts);
        console.log('✅ Sous-produits chargés:', allSubProducts.length);
        console.log('✅ Stock total calculé pour tous les produits');
        
        // Vérifier l'authentification pour les fonctionnalités avancées
        if (!user) {
          console.log('⚠️ Utilisateur non authentifié - certaines fonctionnalités limitées');
          setAlert({ type: 'danger', message: 'Vous devez être connecté pour ajouter/modifier des produits' });
        } else {
          console.log('✅ Utilisateur authentifié:', user.email);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des données';
        setAlert({ type: 'danger', message: `Erreur Firebase: ${errorMessage}` });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleViewProduct = useCallback((product: Product) => {
    setProductToPreview(product);
    setShowProductPreviewModal(true);
  }, []);

  const handleViewSubProduct = useCallback((subProduct: SubProduct) => {
    setSubProductToPreview(subProduct);
    setShowSubProductPreviewModal(true);
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    setProductToEdit(product);
    setShowEditProductModal(true);
  }, []);

  const handleEditSubProduct = useCallback((subProduct: SubProduct) => {
    setSubProductToEdit(subProduct);
    setShowEditSubProductModal(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditProductModal(false);
    setProductToEdit(null);
  }, []);

  const handleCloseEditSubProductModal = useCallback(() => {
    setShowEditSubProductModal(false);
    setSubProductToEdit(null);
  }, []);

  // Fonction pour ouvrir le carousel d'images
  const handleOpenImageCarousel = useCallback((product: Product) => {
    const images = (product as any).images && Array.isArray((product as any).images) 
      ? (product as any).images 
      : product.image 
        ? [product.image] 
        : [];
    
    if (images.length > 0) {
      setCarouselImages(images);
      setCarouselProductName(product.nom);
      setShowImageCarousel(true);
    }
  }, []);

  // Fonction pour fermer le carousel d'images
  const handleCloseImageCarousel = useCallback(() => {
    setShowImageCarousel(false);
    setCarouselImages([]);
    setCarouselProductName('');
  }, []);

  const handleProductUpdated = useCallback(async () => {
    try {
      // Rafraîchir la liste des produits
      const updatedProducts = await ProductService.getAllProducts();
      setProducts(updatedProducts);
      
      // Afficher un message de succès
      setAlert({ type: 'success', message: 'Produit mis à jour avec succès !' });
      
      // Fermer la modale
      handleCloseEditModal();
      
      // Masquer l'alerte après 3 secondes
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
      setAlert({ type: 'danger', message: 'Erreur lors de la mise à jour du produit' });
      setTimeout(() => setAlert(null), 3000);
    }
  }, [handleCloseEditModal]);

  const handleSubProductUpdated = useCallback(async () => {
    try {
      console.log('🔄 Rafraîchissement après mise à jour de sous-produit...');
      
      // Attendre un peu pour s'assurer que Firebase a terminé la mise à jour
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const productsData = await ProductService.getAllProducts();
      
      // Recharger les sous-produits et recalculer le stock total
      const allSubProducts: SubProduct[] = [];
      const productsWithTotalStock = await Promise.all(
        productsData.map(async (product) => {
          try {
            const productSubProducts = await SubProductService.getSubProductsByProductId(product.id);
            allSubProducts.push(...productSubProducts);
            
            // Calculer le stock total en additionnant les quantités de toutes les variations des sous-produits
            const totalStock = calculateProductStockFromVariations(productSubProducts);
            
            return {
              ...product,
              stock: totalStock // Remplacer le stock du produit par la somme des variations
            };
          } catch (error) {
            console.error(`Erreur lors du chargement des sous-produits pour ${product.nom}:`, error);
            return product; // Retourner le produit original en cas d'erreur
          }
        })
      );
      
      // Forcer le re-rendu en vidant d'abord les états
      setProducts([]);
      setSubProducts([]);
      
      // Puis les remplir avec les nouvelles données
      setTimeout(() => {
        setProducts(productsWithTotalStock);
        setSubProducts(allSubProducts);
        console.log('✅ Liste des produits mise à jour:', productsWithTotalStock.length, 'produits');
        console.log('✅ Sous-produits rafraîchis:', allSubProducts.length);
        console.log('✅ Stock total recalculé après mise à jour de sous-produit');
      }, 100);
      
      // Afficher un message de succès
      setAlert({ type: 'success', message: 'Sous-produit mis à jour avec succès !' });
      
      // Fermer la modale
      handleCloseEditSubProductModal();
      
      // Masquer l'alerte après 3 secondes
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du sous-produit:', error);
      setAlert({ type: 'danger', message: 'Erreur lors de la mise à jour du sous-produit' });
      setTimeout(() => setAlert(null), 3000);
    }
  }, [handleCloseEditSubProductModal]);

  const handleProductAdded = useCallback(async () => {
    try {
      console.log('🔄 Rafraîchissement de la liste des produits...');
      const productsData = await ProductService.getAllProducts();
      
      // Recharger les sous-produits et recalculer le stock total
      const allSubProducts: SubProduct[] = [];
      const productsWithTotalStock = await Promise.all(
        productsData.map(async (product) => {
          try {
            const productSubProducts = await SubProductService.getSubProductsByProductId(product.id);
            allSubProducts.push(...productSubProducts);
            
            // Calculer le stock total en additionnant les quantités de toutes les variations des sous-produits
            const totalStock = calculateProductStockFromVariations(productSubProducts);
            
            return {
              ...product,
              stock: totalStock // Remplacer le stock du produit par la somme des variations
            };
          } catch (error) {
            console.error(`Erreur lors du chargement des sous-produits pour ${product.nom}:`, error);
            return product; // Retourner le produit original en cas d'erreur
          }
        })
      );
      
      setProducts(productsWithTotalStock);
      setSubProducts(allSubProducts);
      console.log('✅ Liste des produits mise à jour:', productsWithTotalStock.length, 'produits');
      console.log('✅ Sous-produits rafraîchis:', allSubProducts.length);
      console.log('✅ Stock total recalculé pour tous les produits');
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement:', error);
    }
  }, []);

  const handleSubProductAdded = useCallback(async () => {
    try {
      console.log('🔄 Rafraîchissement après ajout de sous-produit...');
      const productsData = await ProductService.getAllProducts();
      
      // Recharger les sous-produits et recalculer le stock total
      const allSubProducts: SubProduct[] = [];
      const productsWithTotalStock = await Promise.all(
        productsData.map(async (product) => {
          try {
            const productSubProducts = await SubProductService.getSubProductsByProductId(product.id);
            allSubProducts.push(...productSubProducts);
            
            // Calculer le stock total en additionnant les quantités de toutes les variations des sous-produits
            const totalStock = calculateProductStockFromVariations(productSubProducts);
            
            return {
              ...product,
              stock: totalStock // Remplacer le stock du produit par la somme des variations
            };
          } catch (error) {
            console.error(`Erreur lors du chargement des sous-produits pour ${product.nom}:`, error);
            return product; // Retourner le produit original en cas d'erreur
          }
        })
      );
      
      setProducts(productsWithTotalStock);
      setSubProducts(allSubProducts);
      console.log('✅ Liste des produits mise à jour:', productsWithTotalStock.length, 'produits');
      console.log('✅ Sous-produits rafraîchis:', allSubProducts.length);
      console.log('✅ Stock total recalculé après ajout de sous-produit');
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement:', error);
    }
  }, []);

  const handleAlert = useCallback((type: 'success' | 'danger', message: string) => {
    setAlert({ type, message });
  }, []);

  const handleDeleteProduct = useCallback((product: Product) => {
    // Ouvrir la modale de confirmation
    setItemToDelete({ type: 'product', item: product });
    setShowDeleteConfirmModal(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'product') {
        const product = itemToDelete.item as Product;
        console.log('🗑️ Suppression du produit:', product.nom);

        // Fermer la modale immédiatement
        setShowDeleteConfirmModal(false);
        setItemToDelete(null);

        // Supprimer le produit de Firebase
        await ProductService.deleteProduct(product.id);

        // Mise à jour optimiste : retirer le produit de l'état local immédiatement
        setProducts(prev => prev.filter(p => p.id !== product.id));
        setSubProducts(prev => prev.filter(sp => sp.productId !== product.id));

        // Rafraîchir depuis Firebase pour être sûr
        const productsData = await ProductService.getAllProducts();
        setProducts(productsData);
        
        // Recharger aussi les sous-produits
        const allSubProducts: SubProduct[] = [];
        for (const prod of productsData) {
          try {
            const productSubProducts = await SubProductService.getSubProductsByProductId(prod.id);
            allSubProducts.push(...productSubProducts);
          } catch (error) {
            console.error(`Erreur lors du chargement des sous-produits pour ${prod.nom}:`, error);
          }
        }
        setSubProducts(allSubProducts);
        
        // Notification toastify
        toast.success(`Produit "${product.nom}" supprimé avec succès !`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        const subProduct = itemToDelete.item as SubProduct;
        console.log('🗑️ Suppression du sous-produit:', subProduct.nom);
        
        // Supprimer le sous-produit de Firebase
        await SubProductService.deleteSubProduct(subProduct.id);
        
        // Rafraîchir la liste des sous-produits
        const productsData = await ProductService.getAllProducts();
        const allSubProducts: SubProduct[] = [];
        for (const prod of productsData) {
          try {
            const productSubProducts = await SubProductService.getSubProductsByProductId(prod.id);
            allSubProducts.push(...productSubProducts);
          } catch (error) {
            console.error(`Erreur lors du chargement des sous-produits pour ${prod.nom}:`, error);
          }
        }
        setSubProducts(allSubProducts);
        
        // Notification toastify
        toast.success(`Sous-produit "${subProduct.nom}" supprimé avec succès !`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
      
    } catch (error) {
      // En cas d'erreur, s'assurer que la modale est fermée
      setShowDeleteConfirmModal(false);
      setItemToDelete(null);
      console.error('❌ Erreur lors de la suppression:', error);
      const itemName = itemToDelete.type === 'product' 
        ? (itemToDelete.item as Product).nom 
        : (itemToDelete.item as SubProduct).nom;
      
      toast.error(`Erreur lors de la suppression ${itemToDelete.type === 'product' ? 'du produit' : 'du sous-produit'}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [itemToDelete]);

  const cancelDelete = useCallback(() => {
    setShowDeleteConfirmModal(false);
    setItemToDelete(null);
  }, []);

  const handleDeleteSubProduct = useCallback((subProduct: SubProduct) => {
    // Ouvrir la modale de confirmation
    setItemToDelete({ type: 'subProduct', item: subProduct });
    setShowDeleteConfirmModal(true);
  }, []);

  // Optimisation des calculs avec useMemo
  const totalStock = useMemo(() => {
    return products.reduce((total, product) => total + product.stock, 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(product => product.stock < 10);
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter(product => product.stock === 0);
  }, [products]);

  // Pagination des produits
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return products.slice(startIndex, endIndex);
  }, [products, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(products.length / itemsPerPage);
  }, [products.length, itemsPerPage]);

  if (loading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="mt-3">Chargement du stock...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <div className="stock-page">
      <Container className="py-4">
        {/* Header */}
        <Row className="mb-4 align-items-center">
          <Col md={12}>
            <h1 className="page-title">
              <i className="bi bi-clipboard-data me-2"></i>
              Gestion du Stock
            </h1>
            <p className="page-subtitle">
              Suivez et gérez l'inventaire de vos produits
            </p>
          </Col>
        </Row>

        {/* Alertes */}
        {alert && (
          <Row className="mb-4">
            <Col>
              <Alert 
                variant={alert.type} 
                dismissible 
                onClose={() => setAlert(null)}
              >
                {alert.message}
              </Alert>
            </Col>
          </Row>
        )}

        {/* Statistiques */}
        <Row className="mb-5 gy-3">
          <Col md={4} lg>
            <Card className="stat-card">
              <Card.Body className="stat-card-body d-flex align-items-center">
                <div className="stat-icon">
                  <i className="bi bi-box"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">{products.length}</h3>
                  <p className="stat-label">Produits</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4} lg>
            <Card className="stat-card">
              <Card.Body className="stat-card-body d-flex align-items-center">
                <div className="stat-icon">
                  <i className="bi bi-boxes"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">{subProducts.length}</h3>
                  <p className="stat-label">Sous-Produits</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4} lg>
            <Card className="stat-card">
              <Card.Body className="stat-card-body d-flex align-items-center">
                <div className="stat-icon">
                  <i className="bi bi-stack"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">{totalStock}</h3>
                  <p className="stat-label">Total Stock</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4} lg>
            <Card className="stat-card">
              <Card.Body className="stat-card-body d-flex align-items-center">
                <div className="stat-icon stat-icon-warning">
                  <i className="bi bi-exclamation-triangle"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">{lowStockProducts.length}</h3>
                  <p className="stat-label">Stock Faible</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4} lg>
            <Card className="stat-card">
              <Card.Body className="stat-card-body d-flex align-items-center">
                <div className="stat-icon stat-icon-danger">
                  <i className="bi bi-x-circle"></i>
                </div>
                <div className="stat-card-content">
                  <h3 className="stat-number">
                    {outOfStockProducts.length}
                  </h3>
                  <p className="stat-label">Ruptures</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Section 1: Produits Principaux */}
        <Row className="mb-4 mt-3">
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-box me-2"></i>
                  Produits Principaux
                </h5>
                <Button
                  variant="link"
                  className="stock-header-add-product text-white text-decoration-none p-0"
                  onClick={() => {
                    if (!user) {
                      setAlert({ type: 'danger', message: 'Vous devez être connecté pour ajouter un produit' });
                      return;
                    }
                    setShowAddProductModal(true);
                  }}
                  disabled={!user}
                  style={{ fontSize: '0.9rem' }}
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Ajouter un Produit
                </Button>
              </Card.Header>
              
              <Card.Body className="p-3">
                {paginatedProducts.length > 0 ? (
                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '22%' }}>Produit</th>
                          <th style={{ width: '9%' }}>Image</th>
                          <th style={{ width: '36%' }}>Caractéristiques</th>
                          <th style={{ width: '8%' }}>Quantité</th>
                          <th style={{ width: '12%' }}>État du Stock</th>
                          <th style={{ width: '13%' }}>Actions</th>
                        </tr>
                      </thead>
                    <tbody>
                        {paginatedProducts.map((product) => (
                          <tr key={product.id}>
                            {/* Produit : nom, identifiant, puis catégorie */}
                            <td>
                              <div className="subproduct-cell">
                                <div className="subproduct-name">{product.nom}</div>
                                <small className="subproduct-id" title={product.id}>
                                  ID&nbsp;: {product.id}
                                </small>
                                {product.categorie && (
                                  <span className="badge subproduct-category">
                                    {product.categorie}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Image du Produit */}
                            <td className="text-center">
                              {(() => {
                                const allImages = Array.isArray((product as any).images) && (product as any).images.length > 0
                                  ? (product as any).images as string[]
                                  : product.image ? [product.image] : [];
                                const currentIdx = hoverImageIndex[product.id] ?? 0;
                                const currentSrc = allImages[currentIdx] || null;
                                return (
                                  <div
                                    className="product-image-wrapper"
                                    style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
                                    onClick={() => handleOpenImageCarousel(product)}
                                    title="Cliquez pour voir toutes les images"
                                    onMouseEnter={() => handleProductImageMouseEnter(product.id, allImages)}
                                    onMouseLeave={() => handleProductImageMouseLeave(product.id)}
                                  >
                                    {currentSrc && currentSrc !== '/placeholder-product.jpg' && currentSrc !== '/mug.webp' ? (
                                      <img
                                        src={currentSrc}
                                        alt={product.nom}
                                        className="product-thumb"
                                        style={{
                                          width: '70px',
                                          height: '70px',
                                          objectFit: 'cover',
                                          borderRadius: '8px',
                                          border: '2px solid #dee2e6',
                                          cursor: 'pointer',
                                          transition: 'opacity 0.3s ease'
                                        }}
                                        loading="lazy"
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/mug.webp'; }}
                                      />
                                    ) : (
                                      <div
                                        className="product-thumb-placeholder"
                                        style={{
                                          width: '70px', height: '70px', backgroundColor: '#f8f9fa',
                                          border: '2px dashed #dee2e6', borderRadius: '8px',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontSize: '0.8rem', color: '#6c757d', cursor: 'pointer'
                                        }}
                                        title="Aucune image"
                                      >
                                        <i className="bi bi-image" style={{ fontSize: '1.2rem' }}></i>
                                      </div>
                                    )}

                                    {/* Dots de navigation */}
                                    {allImages.length > 1 && (
                                      <div style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '3px', zIndex: 2 }}>
                                        {allImages.map((_, i) => (
                                          <span key={i} style={{
                                            width: '5px', height: '5px', borderRadius: '50%',
                                            background: i === currentIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                                            display: 'inline-block'
                                          }} />
                                        ))}
                                      </div>
                                    )}

                                    {/* Badge nombre d'images */}
                                    {allImages.length > 1 && (
                                      <span
                                        className="badge bg-primary position-absolute"
                                        style={{ top: '-8px', right: '-8px', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '10px' }}
                                      >
                                        {allImages.length}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>

                            {/* Caractéristiques - Tags */}
                            <td>
                              <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '100%' }}>
                                {product.fournisseur?.nom && (
                                  <span className="badge" style={{ fontSize: '0.7rem', backgroundColor: '#6610f2', color: '#ffffff' }}>
                                    <i className="bi bi-building me-1"></i>
                                    {product.fournisseur.nom}
                                  </span>
                                )}
                                {product.fournisseur?.ville && (
                                  <span className="badge" style={{ fontSize: '0.7rem', backgroundColor: '#20c997', color: '#111111' }}>
                                    <i className="bi bi-geo-alt me-1"></i>
                                    {product.fournisseur.ville}
                                  </span>
                                )}
                                {product.prix > 0 && (
                                  <span className="badge" style={{ fontSize: '0.7rem', backgroundColor: '#fd7e14', color: '#111111' }}>
                                    <i className="bi bi-currency-exchange me-1"></i>
                                    {product.prix} MAD
                                  </span>
                                )}
                                <CharacteristicTags source={product} fontSize="0.7rem" grouped compact />
                              </div>
                            </td>

                            {/* Quantité en Stock */}
                            <td>
                              <div className="fw-bold">{product.stock}</div>
                            </td>

                            {/* État du Stock */}
                            <td>
                              <span className={`badge ${
                                product.stock === 0 ? 'bg-danger' : 
                                product.stock < 10 ? 'bg-warning' : 'bg-success'
                              }`}>
                                {product.stock === 0 ? 'Rupture' : 
                                 product.stock < 10 ? 'Stock faible' : 'Disponible'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td>
                              <div className="d-flex gap-1 justify-content-center">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="rounded-3 action-btn"
                                  onClick={() => handleViewProduct(product)}
                                  title="Voir les détails"
                                >
                                  <i className="bi bi-eye"></i>
                                </Button>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  className="rounded-3 action-btn"
                                  title="Modifier"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  className="rounded-3 action-btn"
                                  title="Supprimer"
                                  onClick={() => handleDeleteProduct(product)}
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
                ) : (
                  <div className="text-center py-5">
                    <div className="text-muted">
                      <i className="bi bi-inbox display-4"></i>
                      <p className="mt-2 mb-0">Aucun produit trouvé</p>
                      <small>Les produits ajoutés apparaîtront ici</small>
                                </div>
                              </div>
                )}
              </Card.Body>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <Card.Footer className="d-flex justify-content-between align-items-center">
                  <div>
                    Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, products.length)} sur {products.length} produits
                              </div>
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </Button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    
                              <Button
                                variant="outline-primary"
                                size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                              >
                      <i className="bi bi-chevron-right"></i>
                              </Button>
                </div>
                </Card.Footer>
              )}
            </Card>
          </Col>
        </Row>

        {/* Section 2: Sous-Produits */}
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-stack me-2"></i>
                  Sous-Produits
                </h5>
                <Button
                  variant="link"
                  className="stock-header-add-subproduct text-white text-decoration-none p-0"
                  onClick={() => {
                    if (!user) {
                      setAlert({ type: 'danger', message: 'Vous devez être connecté pour ajouter un sous-produit' });
                      return;
                    }
                    setShowSubProductModal(true);
                  }}
                  disabled={!user}
                  style={{ fontSize: '0.9rem' }}
                >
                  <i className="bi bi-plus-square me-1"></i>
                  Ajouter un Sous-Produit
                </Button>
              </Card.Header>
              
              <Card.Body className="p-3">
                {subProducts.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle sub-products-table">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '19%' }}>Sous-Produit</th>
                          <th style={{ width: '8%' }}>Image</th>
                          <th style={{ width: '36%' }}>Caractéristiques</th>
                          <th style={{ width: '9%' }} className="text-end">P.U</th>
                          <th style={{ width: '7%' }} className="text-center">Qté</th>
                          <th style={{ width: '11%' }}>État du Stock</th>
                          <th style={{ width: '10%' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subProducts.flatMap((subProduct) => {
                          const variationsArray =
                            subProduct.variations && Array.isArray(subProduct.variations)
                              ? subProduct.variations
                              : [];
                          const hasVariations = variationsArray.length > 0;
                          const isExpanded = expandedSubProducts.has(subProduct.id);

                          const parentProduct = products.find((p) => p.id === subProduct.productId);
                          const images =
                            subProduct.images && subProduct.images.length > 0
                              ? subProduct.images
                              : subProduct.image && subProduct.image !== '/mug.webp'
                              ? [subProduct.image]
                              : [];

                          // Quantité du sous-produit : somme de ses variations
                          const quantiteTotale = hasVariations
                            ? variationsArray.reduce((sum, v) => sum + (Number(v.quantite) || 0), 0)
                            : Number(subProduct.stock) || 0;

                          /**
                           * Prix affiché : celui du sous-produit, ou l'étendue
                           * des prix de ses variations s'il n'en porte pas.
                           */
                          const prixVariations = variationsArray
                            .map((v) => Number(v.prixUnitaire) || 0)
                            .filter((v) => v > 0);
                          const prixAffiche =
                            Number(subProduct.prix) > 0 || prixVariations.length === 0
                              ? `${subProduct.prix} MAD`
                              : Math.min(...prixVariations) === Math.max(...prixVariations)
                              ? `${prixVariations[0]} MAD`
                              : `${Math.min(...prixVariations)} – ${Math.max(...prixVariations)} MAD`;

                          const etatBadge = (quantite: number) => (
                            <span
                              className={`badge ${
                                quantite === 0 ? 'bg-danger' : quantite < 10 ? 'bg-warning' : 'bg-success'
                              }`}
                            >
                              {quantite === 0 ? 'Rupture' : quantite < 10 ? 'Stock faible' : 'Disponible'}
                            </span>
                          );

                          const vignette = (src: string | null, alt: string) =>
                            src ? (
                              <img
                                src={src}
                                alt={alt}
                                title={alt}
                                className="rounded border subproduct-thumb"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/mug.webp';
                                }}
                              />
                            ) : (
                              <div className="rounded border subproduct-thumb subproduct-thumb-empty">
                                <i className="bi bi-image"></i>
                              </div>
                            );

                          const rows: React.ReactNode[] = [
                            <tr
                              key={subProduct.id}
                              className={hasVariations ? 'subproduct-row is-expandable' : 'subproduct-row'}
                              onClick={hasVariations ? () => toggleSubProductExpansion(subProduct.id) : undefined}
                            >
                              {/* Sous-Produit : nom, identifiant, puis catégorie */}
                              <td>
                                <div className="d-flex align-items-start gap-2">
                                  {hasVariations ? (
                                    <button
                                      type="button"
                                      className="subproduct-toggle"
                                      aria-expanded={isExpanded}
                                      title={
                                        isExpanded
                                          ? 'Masquer les variations'
                                          : `Afficher les ${variationsArray.length} variation${
                                              variationsArray.length > 1 ? 's' : ''
                                            }`
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSubProductExpansion(subProduct.id);
                                      }}
                                    >
                                      <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                                    </button>
                                  ) : (
                                    <span className="subproduct-toggle-placeholder" />
                                  )}

                                  <div className="subproduct-cell">
                                    <div className="subproduct-name">
                                      {subProduct.nom}
                                      {hasVariations && (
                                        <span className="badge subproduct-variation-count ms-2">
                                          {variationsArray.length} var.
                                        </span>
                                      )}
                                    </div>
                                    <small className="subproduct-id" title={subProduct.id}>
                                      ID&nbsp;: {subProduct.id}
                                    </small>
                                    <span className="badge subproduct-category">
                                      {parentProduct?.nom || 'Catégorie inconnue'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Image */}
                              <td>
                                <div className="d-flex align-items-center gap-1">
                                  {vignette(images.length > 0 ? images[0] : null, subProduct.nom)}
                                  {images.length > 1 && (
                                    <span className="subproduct-image-count" title={`${images.length} images`}>
                                      +{images.length - 1}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Caractéristiques du sous-produit */}
                              <td>
                                <CharacteristicTags source={subProduct} fontSize="0.7rem" grouped compact />
                              </td>

                              {/* Prix unitaire */}
                              <td className="text-end">
                                <div className="fw-bold text-primary">{prixAffiche}</div>
                              </td>

                              {/* Quantité */}
                              <td className="text-center">
                                <div className="fw-bold">{quantiteTotale}</div>
                                {hasVariations && (
                                  <small className="text-muted d-block subproduct-qty-note">cumul</small>
                                )}
                              </td>

                              {/* État du stock */}
                              <td>{etatBadge(quantiteTotale)}</td>

                              {/* Actions */}
                              <td>
                                <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="rounded-3"
                                    title="Voir les détails"
                                    onClick={() => handleViewSubProduct(subProduct)}
                                  >
                                    <i className="bi bi-eye"></i>
                                  </Button>
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    className="rounded-3"
                                    title="Modifier"
                                    onClick={() => handleEditSubProduct(subProduct)}
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="rounded-3"
                                    title="Supprimer"
                                    onClick={() => handleDeleteSubProduct(subProduct)}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </Button>
                                </div>
                              </td>
                            </tr>,
                          ];

                          // Variations, une ligne chacune, visibles une fois dépliées
                          if (hasVariations && isExpanded) {
                            variationsArray.forEach((variation, varIndex) => {
                              const char = variation.characteristics || {};
                              const quantite = Number(variation.quantite) || 0;
                              const prix = variation.prixUnitaire ?? subProduct.prix;

                              rows.push(
                                <tr key={`${subProduct.id}-var-${varIndex}`} className="variation-row">
                                  <td>
                                    <div className="variation-label">
                                      <i className="bi bi-arrow-return-right me-1"></i>
                                      Variation {varIndex + 1}
                                    </div>
                                  </td>
                                  <td>
                                    {vignette(
                                      variation.image || (images.length > 0 ? images[0] : null),
                                      `Variation ${varIndex + 1}`
                                    )}
                                  </td>
                                  <td>
                                    {Object.values(char).some((v) => v) ? (
                                      <CharacteristicTags source={char} fontSize="0.7rem" grouped compact />
                                    ) : (
                                      <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                        Aucune caractéristique
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-end">
                                    <div className="fw-bold text-primary">{prix} MAD</div>
                                  </td>
                                  <td className="text-center">
                                    <div className="fw-bold">{quantite}</div>
                                  </td>
                                  <td>{etatBadge(quantite)}</td>
                                  <td></td>
                                </tr>
                              );
                            });
                          }

                          return rows;
                        })}
                    </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="text-muted">
                      <i className="bi bi-inbox display-4"></i>
                      <p className="mt-2 mb-0">Aucun sous-produit trouvé</p>
                      <small>Les sous-produits ajoutés apparaîtront ici</small>
                    </div>
                </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Modales avec lazy loading */}
        <Suspense fallback={<div>Chargement...</div>}>
          <AddProductModal
            show={showAddProductModal}
            onHide={() => setShowAddProductModal(false)}
            onProductAdded={handleProductAdded}
            onAlert={handleAlert}
          />
          
          <AddSubProductModal
            show={showSubProductModal}
            onHide={() => setShowSubProductModal(false)}
            onSubProductAdded={handleSubProductAdded}
            onAlert={handleAlert}
          />

          {/* Modale d'édition */}
          {showEditProductModal && productToEdit && (
            <AddProductModal
              show={showEditProductModal}
              onHide={handleCloseEditModal}
              onProductAdded={handleProductUpdated}
              onAlert={handleAlert}
              initialProduct={productToEdit}
              isEditMode={true}
            />
          )}

          {/* Modale d'édition des sous-produits */}
          {showEditSubProductModal && subProductToEdit && (
            <AddSubProductModal
              show={showEditSubProductModal}
              onHide={handleCloseEditSubProductModal}
              onSubProductAdded={handleSubProductUpdated}
              onAlert={handleAlert}
              initialSubProduct={subProductToEdit}
              isEditMode={true}
            />
          )}
        </Suspense>

        {/* Modale d'aperçu du produit */}
        {showProductPreviewModal && productToPreview && (
          <Modal
            show={showProductPreviewModal}
            onHide={() => setShowProductPreviewModal(false)}
            size="lg"
            centered
            className="preview-modal"
          >
            <Modal.Header closeButton>
              <Modal.Title>
                <i className="bi bi-eye me-2"></i>
                Aperçu du Produit
              </Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <div className="preview-ref">
                <div>
                  <span className="preview-ref-label">
                    <i className="bi bi-box me-1"></i>
                    Référence produit
                  </span>
                  <p className="preview-ref-value">{productToPreview.id}</p>
                </div>
                <span
                  className={`badge ${
                    productToPreview.stock === 0
                      ? 'bg-danger'
                      : productToPreview.stock < 10
                      ? 'bg-warning'
                      : 'bg-success'
                  }`}
                >
                  {productToPreview.stock === 0
                    ? 'Rupture'
                    : productToPreview.stock < 10
                    ? 'Stock faible'
                    : 'Disponible'}
                </span>
              </div>

              <Row className="g-3">
                <Col md={5}>
                  <div className="preview-card text-center">
                    <div className="preview-card-title">
                      <i className="bi bi-image"></i>
                      Image
                    </div>
                    {productToPreview.image &&
                    productToPreview.image !== '/placeholder-product.jpg' &&
                    productToPreview.image !== '/mug.webp' ? (
                      <img
                        src={productToPreview.image}
                        alt={productToPreview.nom}
                        className="preview-image"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/mug.webp';
                        }}
                      />
                    ) : (
                      <div className="preview-image preview-image-empty">
                        <div>
                          <i className="bi bi-image d-block mb-1"></i>
                          Aucune image
                        </div>
                      </div>
                    )}
                  </div>
                </Col>

                <Col md={7}>
                  <div className="preview-card">
                    <div className="preview-card-title">
                      <i className="bi bi-info-circle"></i>
                      Informations
                    </div>
                    <dl className="mb-0">
                      <div className="preview-row">
                        <dt>Nom</dt>
                        <dd>{productToPreview.nom}</dd>
                      </div>
                      <div className="preview-row">
                        <dt>Catégorie</dt>
                        <dd className={productToPreview.categorie ? '' : 'is-empty'}>
                          {productToPreview.categorie || 'Non renseignée'}
                        </dd>
                      </div>
                      <div className="preview-row">
                        <dt>Prix</dt>
                        <dd>{productToPreview.prix} MAD</dd>
                      </div>
                      <div className="preview-row">
                        <dt>Stock</dt>
                        <dd>{productToPreview.stock}</dd>
                      </div>
                      {productToPreview.fournisseur?.nom && (
                        <div className="preview-row">
                          <dt>Fournisseur</dt>
                          <dd>{productToPreview.fournisseur.nom}</dd>
                        </div>
                      )}
                      {productToPreview.fournisseur?.ville && (
                        <div className="preview-row">
                          <dt>Ville</dt>
                          <dd>{productToPreview.fournisseur.ville}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </Col>
              </Row>

              {productToPreview.description && (
                <>
                  <div className="preview-section-title">
                    <i className="bi bi-card-text"></i>
                    Description
                  </div>
                  <div className="preview-card">
                    <p className="mb-0 text-muted" style={{ fontSize: '0.82rem' }}>
                      {productToPreview.description}
                    </p>
                  </div>
                </>
              )}

              <div className="preview-section-title">
                <i className="bi bi-tags"></i>
                Caractéristiques
              </div>
              <div className="preview-card">
                <CharacteristicTags source={productToPreview} fontSize="0.75rem" grouped />
              </div>
            </Modal.Body>

            <Modal.Footer>
              <span className="preview-total">
                Prix<strong>{productToPreview.prix} MAD</strong>
              </span>
              <Button variant="secondary" onClick={() => setShowProductPreviewModal(false)}>
                <i className="bi bi-x-circle me-2"></i>
                Fermer
              </Button>
            </Modal.Footer>
          </Modal>
        )}

        {/* Aperçu d'un sous-produit */}
        {showSubProductPreviewModal && subProductToPreview && (() => {
          const sp = subProductToPreview;
          const parent = products.find((p) => p.id === sp.productId);
          const gallery = (Array.isArray(sp.images) ? sp.images : []).filter(
            (img) => img && img !== '/placeholder-product.jpg' && img !== '/mug.webp'
          );
          const mainImage =
            gallery[0] ||
            (sp.image && sp.image !== '/placeholder-product.jpg' && sp.image !== '/mug.webp'
              ? sp.image
              : '');
          const variations = Array.isArray(sp.variations) ? sp.variations : [];

          return (
            <Modal
              show={showSubProductPreviewModal}
              onHide={() => setShowSubProductPreviewModal(false)}
              size="lg"
              centered
              className="preview-modal"
            >
              <Modal.Header closeButton>
                <Modal.Title>
                  <i className="bi bi-eye me-2"></i>
                  Aperçu du Sous-Produit
                </Modal.Title>
              </Modal.Header>

              <Modal.Body>
                <div className="preview-ref">
                  <div>
                    <span className="preview-ref-label">
                      <i className="bi bi-boxes me-1"></i>
                      Référence sous-produit
                    </span>
                    <p className="preview-ref-value">{sp.id}</p>
                  </div>
                  <span
                    className={`badge ${
                      sp.stock === 0 ? 'bg-danger' : sp.stock < 10 ? 'bg-warning' : 'bg-success'
                    }`}
                  >
                    {sp.stock === 0 ? 'Rupture' : sp.stock < 10 ? 'Stock faible' : 'Disponible'}
                  </span>
                </div>

                <Row className="g-3">
                  <Col md={5}>
                    <div className="preview-card text-center">
                      <div className="preview-card-title">
                        <i className="bi bi-image"></i>
                        Images
                      </div>
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={sp.nom}
                          className="preview-image"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/mug.webp';
                          }}
                        />
                      ) : (
                        <div className="preview-image preview-image-empty">
                          <div>
                            <i className="bi bi-image d-block mb-1"></i>
                            Aucune image
                          </div>
                        </div>
                      )}

                      {gallery.length > 1 && (
                        <div className="d-flex flex-wrap gap-2 justify-content-center mt-2">
                          {gallery.slice(1).map((img, index) => (
                            <img
                              key={index}
                              src={img}
                              alt={`${sp.nom} ${index + 2}`}
                              className="preview-thumb"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/mug.webp';
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </Col>

                  <Col md={7}>
                    <div className="preview-card">
                      <div className="preview-card-title">
                        <i className="bi bi-info-circle"></i>
                        Informations
                      </div>
                      <dl className="mb-0">
                        <div className="preview-row">
                          <dt>Nom</dt>
                          <dd>{sp.nom}</dd>
                        </div>
                        <div className="preview-row">
                          <dt>Produit parent</dt>
                          <dd className={parent ? '' : 'is-empty'}>
                            {parent ? parent.nom : sp.productId || 'Inconnu'}
                          </dd>
                        </div>
                        <div className="preview-row">
                          <dt>Prix</dt>
                          <dd>{sp.prix} MAD</dd>
                        </div>
                        <div className="preview-row">
                          <dt>Stock</dt>
                          <dd>{sp.stock}</dd>
                        </div>
                        <div className="preview-row">
                          <dt>Variations</dt>
                          <dd>{variations.length}</dd>
                        </div>
                      </dl>
                    </div>
                  </Col>
                </Row>

                {sp.description && (
                  <>
                    <div className="preview-section-title">
                      <i className="bi bi-card-text"></i>
                      Description
                    </div>
                    <div className="preview-card">
                      <p className="mb-0 text-muted" style={{ fontSize: '0.82rem' }}>
                        {sp.description}
                      </p>
                    </div>
                  </>
                )}

                <div className="preview-section-title">
                  <i className="bi bi-tags"></i>
                  Caractéristiques
                </div>
                <div className="preview-card">
                  <CharacteristicTags source={sp} fontSize="0.75rem" grouped />
                </div>

                {variations.length > 0 && (
                  <>
                    <div className="preview-section-title">
                      <i className="bi bi-diagram-3"></i>
                      Variations ({variations.length})
                    </div>
                    <div className="preview-table-wrapper">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th style={{ width: '70px' }}>Image</th>
                            <th>Caractéristiques</th>
                            <th style={{ width: '18%' }} className="num">Prix unitaire</th>
                            <th style={{ width: '12%' }} className="center">Qté</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variations.map((variation, index) => {
                            const hasChars = Object.values(variation.characteristics || {}).some(
                              (v) => v
                            );
                            return (
                              <tr key={variation.id || index}>
                                <td>
                                  {variation.image ? (
                                    <img
                                      src={variation.image}
                                      alt={`Variation ${index + 1}`}
                                      className="preview-thumb"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/mug.webp';
                                      }}
                                    />
                                  ) : (
                                    <span className="muted">
                                      <i className="bi bi-image"></i>
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {hasChars ? (
                                    <div className="d-flex flex-wrap gap-1">
                                      <CharacteristicTags
                                        source={variation.characteristics}
                                        fontSize="0.7rem"
                                      />
                                    </div>
                                  ) : (
                                    <span className="muted">Aucune</span>
                                  )}
                                </td>
                                <td className="num">{variation.prixUnitaire ?? sp.prix} MAD</td>
                                <td className="center">{variation.quantite ?? 0}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </Modal.Body>

              <Modal.Footer>
                <span className="preview-total">
                  Prix<strong>{sp.prix} MAD</strong>
                </span>
                <Button variant="secondary" onClick={() => setShowSubProductPreviewModal(false)}>
                  <i className="bi bi-x-circle me-2"></i>
                  Fermer
                </Button>
              </Modal.Footer>
            </Modal>
          );
        })()}

        {/* Modale de confirmation de suppression */}
        <Modal 
          show={showDeleteConfirmModal} 
          onHide={cancelDelete}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="bi bi-exclamation-triangle text-warning me-2"></i>
              Confirmation de suppression
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {itemToDelete && (
              <>
                <p>
                  Êtes-vous sûr de vouloir supprimer {itemToDelete.type === 'product' ? 'le produit' : 'le sous-produit'} 
                  <strong className="text-danger"> "{itemToDelete.type === 'product' ? (itemToDelete.item as Product).nom : (itemToDelete.item as SubProduct).nom}"</strong> ?
                </p>
                <p className="text-muted mb-0">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    Cette action est irréversible.
                  </small>
                </p>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={cancelDelete}>
              <i className="bi bi-x-circle me-2"></i>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              <i className="bi bi-trash me-2"></i>
              Supprimer
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Carousel d'images */}
        <ImageCarousel
          images={carouselImages}
          productName={carouselProductName}
          isVisible={showImageCarousel}
          onClose={handleCloseImageCarousel}
        />

      </Container>
    </div>
  );
};

export default Stock;