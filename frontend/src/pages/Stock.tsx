import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Alert, Modal } from 'react-bootstrap';
import { Product, SubProduct } from '../types';
import { ProductService, SubProductService } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import ImageCarousel from '../components/ImageCarousel';
import './Stock.css';

// Lazy loading des modales pour optimiser les performances
const AddProductModal = React.lazy(() => import('../components/modals/AddProductModal'));
const AddSubProductModal = React.lazy(() => import('../components/modals/AddSubProductModal'));


const Stock: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
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
  const [subProductToEdit, setSubProductToEdit] = useState<SubProduct | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'danger', message: string } | null>(null);
  
  // États pour le carousel d'images
  const [showImageCarousel, setShowImageCarousel] = useState(false);
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [carouselProductName, setCarouselProductName] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadData = async () => {
      // Ne pas charger les données si l'authentification est encore en cours
      if (authLoading) {
        console.log('⏳ Attente de l\'authentification...');
        return;
      }

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
        console.log('👤 État authentification:', user ? `Connecté: ${user.email}` : 'Non connecté');
        
        // Test de connexion simple d'abord (sans authentification)
        console.log('🔍 Test de connexion simple...');
        try {
          const isSimpleConnected = await ProductService.testSimpleConnection();
          if (!isSimpleConnected) {
            console.warn('⚠️ Test de connexion simple échoué, mais continuation...');
          }
        } catch (testError) {
          console.warn('⚠️ Erreur lors du test de connexion simple:', testError);
          // Continuer quand même car les règles permettent l'accès
        }

        // Test de connexion complet (optionnel, ne bloque pas le chargement)
        console.log('🔍 Test de connexion complet...');
        try {
          const isConnected = await ProductService.testConnection();
          if (!isConnected) {
            console.warn('⚠️ Test de connexion complet échoué, mais continuation...');
          }
        } catch (testError) {
          console.warn('⚠️ Erreur lors du test de connexion complet:', testError);
          // Continuer quand même car les règles permettent l'accès
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
              
              // Calculer le stock total en additionnant les quantités des sous-produits
              const totalStock = productSubProducts.reduce((sum, subProduct) => sum + (subProduct.stock || 0), 0);
              
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
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des données';
        setAlert({ type: 'danger', message: `Erreur Firebase: ${errorMessage}` });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, authLoading]); // Recharger quand l'authentification change

  // Surveiller les changements d'authentification et mettre à jour l'alerte
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        console.log('⚠️ Utilisateur non authentifié');
        setAlert(prevAlert => {
          // Ne pas écraser les alertes d'erreur Firebase
          if (prevAlert && prevAlert.message.includes('Erreur Firebase')) {
            return prevAlert;
          }
          return { type: 'danger', message: 'Vous devez être connecté pour ajouter/modifier des produits' };
        });
      } else {
        console.log('✅ Utilisateur authentifié:', user.email);
        // Effacer l'alerte d'authentification si l'utilisateur est connecté
        setAlert(prevAlert => {
          // Ne pas effacer les alertes d'erreur Firebase
          if (prevAlert && prevAlert.message.includes('Erreur Firebase')) {
            return prevAlert;
          }
          // Effacer l'alerte d'authentification
          if (prevAlert && prevAlert.message.includes('Vous devez être connecté')) {
            return null;
          }
          return prevAlert;
        });
      }
    }
  }, [user, authLoading]);

  const handleViewProduct = useCallback((product: Product) => {
    setProductToPreview(product);
    setShowProductPreviewModal(true);
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
            
            // Calculer le stock total en additionnant les quantités des sous-produits
            const totalStock = productSubProducts.reduce((sum, subProduct) => sum + (subProduct.stock || 0), 0);
            
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
            
            // Calculer le stock total en additionnant les quantités des sous-produits
            const totalStock = productSubProducts.reduce((sum, subProduct) => sum + (subProduct.stock || 0), 0);
            
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
            
            // Calculer le stock total en additionnant les quantités des sous-produits
            const totalStock = productSubProducts.reduce((sum, subProduct) => sum + (subProduct.stock || 0), 0);
            
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

  const handleDeleteProduct = useCallback(async (product: Product) => {
    // Confirmation avant suppression
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le produit "${product.nom}" ?\n\nCette action est irréversible.`
    );
    
    if (!confirmed) {
      return; // Annuler la suppression
    }

    try {
      console.log('🗑️ Suppression du produit:', product.nom);
      
      // Supprimer le produit de Firebase
      await ProductService.deleteProduct(product.id);
      
      // Rafraîchir la liste des produits
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
      
      // Afficher un message de succès
      setAlert({ type: 'success', message: `Produit "${product.nom}" supprimé avec succès !` });
      
      // Masquer l'alerte après 3 secondes
      setTimeout(() => setAlert(null), 3000);
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      setAlert({ type: 'danger', message: 'Erreur lors de la suppression du produit' });
      setTimeout(() => setAlert(null), 3000);
    }
  }, []);

  const handleDeleteSubProduct = useCallback(async (subProduct: SubProduct) => {
    // Confirmation avant suppression
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer le sous-produit "${subProduct.nom}" ?\n\nCette action est irréversible.`
    );
    
    if (!confirmed) {
      return; // Annuler la suppression
    }

    try {
      console.log('🗑️ Suppression du sous-produit:', subProduct.nom);
      
      // Supprimer le sous-produit de Firebase
      await SubProductService.deleteSubProduct(subProduct.productId, subProduct.id);
      
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
      
      // Afficher un message de succès
      setAlert({ type: 'success', message: `Sous-produit "${subProduct.nom}" supprimé avec succès !` });
      
      // Masquer l'alerte après 3 secondes
      setTimeout(() => setAlert(null), 3000);
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      setAlert({ type: 'danger', message: 'Erreur lors de la suppression du sous-produit' });
      setTimeout(() => setAlert(null), 3000);
    }
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
          <Col md={8}>
            <h1 className="page-title">
              <i className="bi bi-clipboard-data me-2"></i>
              Gestion du Stock
            </h1>
            <p className="page-subtitle">
              Suivez et gérez l'inventaire de vos produits
            </p>
          </Col>
          <Col md={4} className="text-end">
            <div className="d-flex gap-2 justify-content-end">
              <Button 
                variant="primary" 
                size="sm"
                className="d-flex align-items-center"
                onClick={() => {
                  if (!user) {
                    setAlert({ type: 'danger', message: 'Vous devez être connecté pour ajouter un produit' });
                    return;
                  }
                  setShowAddProductModal(true);
                }}
                disabled={!user}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Ajouter un Produit
              </Button>
              <Button 
                variant="outline-primary" 
                size="sm"
                className="d-flex align-items-center"
                onClick={() => {
                  if (!user) {
                    setAlert({ type: 'danger', message: 'Vous devez être connecté pour ajouter un sous-produit' });
                    return;
                  }
                  setShowSubProductModal(true);
                }}
                disabled={!user}
              >
                <i className="bi bi-plus-square me-2"></i>
                Ajouter un Sous-Produit
              </Button>
            </div>
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
        <Row className="mb-4">
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="text-center">
                <div className="stat-icon">
                  <i className="bi bi-box"></i>
                </div>
                <h3 className="stat-number">{products.length}</h3>
                <p className="stat-label">Produits</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="text-center">
                <div className="stat-icon">
                  <i className="bi bi-stack"></i>
                </div>
                <h3 className="stat-number">{totalStock}</h3>
                <p className="stat-label">Total Stock</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="text-center">
                <div className="stat-icon">
                  <i className="bi bi-exclamation-triangle"></i>
                </div>
                <h3 className="stat-number">{lowStockProducts.length}</h3>
                <p className="stat-label">Stock Faible</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="stat-card">
              <Card.Body className="text-center">
                <div className="stat-icon">
                  <i className="bi bi-x-circle"></i>
                </div>
                <h3 className="stat-number">
                  {outOfStockProducts.length}
                </h3>
                <p className="stat-label">Ruptures</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Section 1: Produits Principaux */}
        <Row className="mb-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">
                  <i className="bi bi-box me-2"></i>
                  Produits Principaux
                </h5>
              </Card.Header>
              
              <Card.Body className="p-3">
                {paginatedProducts.length > 0 ? (
                <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '15%' }}>Nom du Produit</th>
                          <th style={{ width: '10%' }}>Image du Produit</th>
                          <th style={{ width: '35%' }}>Caractéristiques</th>
                          <th style={{ width: '10%' }}>Quantité en Stock</th>
                          <th style={{ width: '10%' }}>État du Stock</th>
                          <th style={{ width: '20%' }}>Actions</th>
                        </tr>
                      </thead>
                    <tbody>
                        {paginatedProducts.map((product) => (
                          <tr key={product.id}>
                            {/* Nom du Produit */}
                            <td>
                              <div className="fw-bold text-dark">{product.nom}</div>
                              <small className="text-muted">ID: {product.id}</small>
                            </td>

                            {/* Image du Produit */}
                            <td className="text-center">
                              <div 
                                className="product-image-wrapper"
                                style={{ 
                                  position: 'relative',
                                  display: 'inline-block',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleOpenImageCarousel(product)}
                                title="Cliquez pour voir toutes les images"
                              >
                                {product.image && product.image !== '/placeholder-product.jpg' && product.image !== '/mug.webp' ? (
                                  <img
                                    src={product.image}
                                    alt={product.nom}
                                    className="product-thumb"
                                    style={{ 
                                      width: '70px', 
                                      height: '70px', 
                                      objectFit: 'cover',
                                      borderRadius: '8px',
                                      border: '2px solid #dee2e6',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/mug.webp';
                                    }}
                                  />
                                ) : (
                                  <div 
                                    className="product-thumb-placeholder"
                                    style={{ 
                                      width: '70px', 
                                      height: '70px', 
                                      backgroundColor: '#f8f9fa',
                                      border: '2px dashed #dee2e6',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.8rem',
                                      color: '#6c757d',
                                      cursor: 'pointer'
                                    }}
                                    title="Aucune image"
                                  >
                                    <i className="bi bi-image" style={{ fontSize: '1.2rem' }}></i>
                                  </div>
                                )}
                                
                                {/* Badge pour images multiples */}
                                {(product as any).images && Array.isArray((product as any).images) && (product as any).images.length > 1 && (
                                  <span 
                                    className="badge bg-primary position-absolute"
                                    style={{
                                      top: '-8px',
                                      right: '-8px',
                                      fontSize: '0.6rem',
                                      padding: '2px 6px',
                                      borderRadius: '10px'
                                    }}
                                  >
                                    {(product as any).images.length}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Caractéristiques - Tags */}
                            <td>
                              <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '100%' }}>
                                {(() => {
                                  const tags = [];
                                  
                                  // Tag Catégorie
                                  if (product.categorie) {
                                    tags.push(
                                      <span key="categorie" className="badge bg-purple" style={{ fontSize: '0.7rem', backgroundColor: '#6f42c1' }}>
                                        <i className="bi bi-tag me-1"></i>
                                        {product.categorie}
                                      </span>
                                    );
                                  }

                                  // Tags Type
                                  if (Array.isArray(product.type)) {
                                    product.type.forEach((type, index) => {
                                      if (type) {
                                        tags.push(
                                    <span key={`type-${index}`} className="badge bg-primary" style={{ fontSize: '0.7rem' }}>
                                            <i className="bi bi-box me-1"></i>
                                      {type}
                                    </span>
                                        );
                                      }
                                    });
                                  }

                                  // Tags Anse
                                  if (Array.isArray(product.anse)) {
                                    product.anse.forEach((anse, index) => {
                                      if (anse) {
                                        tags.push(
                                    <span key={`anse-${index}`} className="badge bg-info" style={{ fontSize: '0.7rem' }}>
                                            <i className="bi bi-handle me-1"></i>
                                      {anse}
                                    </span>
                                        );
                                      }
                                    });
                                  }

                                  // Tags Dimensions
                                  if (Array.isArray(product.dimensions)) {
                                    product.dimensions.forEach((dim, index) => {
                                      if (dim) {
                                        tags.push(
                                    <span key={`dim-${index}`} className="badge bg-success" style={{ fontSize: '0.7rem' }}>
                                            <i className="bi bi-rulers me-1"></i>
                                      {dim}
                                    </span>
                                        );
                                      }
                                    });
                                  }

                                  // Tags Couleurs
                                  if (Array.isArray(product.couleurs)) {
                                    product.couleurs.forEach((couleur, index) => {
                                      if (couleur) {
                                        tags.push(
                                    <span key={`couleur-${index}`} className="badge bg-warning" style={{ fontSize: '0.7rem' }}>
                                            <i className="bi bi-palette me-1"></i>
                                      {couleur}
                                    </span>
                                        );
                                      }
                                    });
                                  }

                                  // Tags Matériaux
                                  if (Array.isArray(product.materiau)) {
                                    product.materiau.forEach((materiau, index) => {
                                      if (materiau) {
                                        tags.push(
                                    <span key={`materiau-${index}`} className="badge bg-dark" style={{ fontSize: '0.7rem' }}>
                                            <i className="bi bi-gear me-1"></i>
                                      {materiau}
                                    </span>
                                        );
                                      }
                                    });
                                  }

                                  // Tags Capacité
                                  if (Array.isArray(product.capacite)) {
                                    product.capacite.forEach((cap, index) => {
                                      if (cap) {
                                        tags.push(
                                    <span key={`cap-${index}`} className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>
                                            <i className="bi bi-cup me-1"></i>
                                      {cap}
                                    </span>
                                        );
                                      }
                                    });
                                  }

                                  // Tags Poids
                                  if (Array.isArray(product.poids)) {
                                    product.poids.forEach((poids, index) => {
                                      if (poids) {
                                        tags.push(
                                    <span key={`poids-${index}`} className="badge bg-light text-dark" style={{ fontSize: '0.7rem' }}>
                                            <i className="bi bi-speedometer2 me-1"></i>
                                      {poids}
                                    </span>
                                        );
                                      }
                                    });
                                  }

                                  // Tag Fournisseur
                                  if (product.fournisseur && product.fournisseur.nom) {
                                    tags.push(
                                      <span key="fournisseur" className="badge bg-indigo" style={{ fontSize: '0.7rem', backgroundColor: '#6610f2' }}>
                                        <i className="bi bi-building me-1"></i>
                                        {product.fournisseur.nom}
                                      </span>
                                    );
                                  }

                                  // Tag Ville du Fournisseur
                                  if (product.fournisseur && product.fournisseur.ville) {
                                    tags.push(
                                      <span key="ville" className="badge bg-teal" style={{ fontSize: '0.7rem', backgroundColor: '#20c997' }}>
                                        <i className="bi bi-geo-alt me-1"></i>
                                        {product.fournisseur.ville}
                                      </span>
                                    );
                                  }

                                  // Tag Prix
                                  if (product.prix && product.prix > 0) {
                                    tags.push(
                                      <span key="prix" className="badge bg-orange" style={{ fontSize: '0.7rem', backgroundColor: '#fd7e14' }}>
                                        <i className="bi bi-currency-exchange me-1"></i>
                                        {product.prix} MAD
                                      </span>
                                    );
                                  }

                                  return tags;
                                })()}
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
              <Card.Header>
                <h5 className="mb-0">
                  <i className="bi bi-stack me-2"></i>
                  Sous-Produits
                </h5>
              </Card.Header>
              
              <Card.Body className="p-3">
                {subProducts.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle sub-products-table">
                      <thead className="table-light">
                        <tr>
                          <th>Nom du Sous-Produit</th>
                          <th>Catégorie Parent</th>
                          <th>Image</th>
                          <th>Caractéristiques</th>
                          <th>Prix Unitaire</th>
                          <th>Quantité</th>
                          <th>État du Stock</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subProducts.map((subProduct) => (
                          <tr key={subProduct.id}>
                            {/* Nom du Sous-Produit */}
                            <td>
                              <div className="fw-bold text-dark">{subProduct.nom}</div>
                              <small className="text-muted">ID: {subProduct.id}</small>
                            </td>

                            {/* Catégorie Parent */}
                            <td>
                              <span className="badge bg-secondary">
                                {products.find(p => p.id === subProduct.productId)?.nom || 'Catégorie inconnue'}
                              </span>
                            </td>

                            {/* Images */}
                            <td>
                              {(() => {
                                const images = subProduct.images && subProduct.images.length > 0 
                                  ? subProduct.images 
                                  : (subProduct.image && subProduct.image !== '/mug.webp' ? [subProduct.image] : []);
                                
                                if (images.length > 0) {
                                  return (
                                    <div className="d-flex align-items-center gap-1">
                                      {/* Image principale */}
                                      <img
                                        src={images[0]}
                                        alt={subProduct.nom}
                                        className="rounded border"
                                        style={{ 
                                          width: '70px', 
                                          height: '70px', 
                                          objectFit: 'cover',
                                          backgroundColor: '#f8f9fa',
                                          border: '2px solid #dee2e6',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease'
                                        }}
                                        loading="lazy"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = '/mug.webp';
                                        }}
                                      />
                                      {/* Indicateur d'images supplémentaires */}
                                      {images.length > 1 && (
                                        <div 
                                          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                                          style={{ 
                                            width: '20px', 
                                            height: '20px', 
                                            fontSize: '0.6rem',
                                            fontWeight: 'bold'
                                          }}
                                          title={`${images.length} images`}
                                        >
                                          +{images.length - 1}
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div 
                                      className="rounded border d-flex align-items-center justify-content-center text-muted"
                                      style={{ 
                                        width: '70px', 
                                        height: '70px', 
                                        backgroundColor: '#f8f9fa',
                                        fontSize: '0.7rem',
                                        textAlign: 'center',
                                        border: '2px dashed #dee2e6',
                                        cursor: 'pointer'
                                      }}
                                      title="Aucune image"
                                    >
                                      <div>
                                        <i className="bi bi-image d-block mb-1" style={{ fontSize: '1.2rem' }}></i>
                                        {subProduct.nom.substring(0, 6)}
                                      </div>
                                    </div>
                                  );
                                }
                              })()}
                            </td>

                            {/* Caractéristiques */}
                            <td>
                              <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '100%' }}>
                                {subProduct.type && Array.isArray(subProduct.type) && subProduct.type.length > 0 ? 
                                  subProduct.type.map((type, index) => (
                                    <span key={`type-${index}`} className="badge bg-primary" style={{ fontSize: '0.7rem' }}>
                                      <i className="bi bi-box me-1"></i>
                                      {type}
                                    </span>
                                  )) : null
                                }
                                {subProduct.couleurs && Array.isArray(subProduct.couleurs) && subProduct.couleurs.length > 0 ? 
                                  subProduct.couleurs.map((couleur, index) => (
                                    <span key={`couleur-${index}`} className="badge bg-warning" style={{ fontSize: '0.7rem' }}>
                                      <i className="bi bi-palette me-1"></i>
                                      {couleur}
                                    </span>
                                  )) : null
                                }
                                {subProduct.materiau && Array.isArray(subProduct.materiau) && subProduct.materiau.length > 0 ? 
                                  subProduct.materiau.map((materiau, index) => (
                                    <span key={`materiau-${index}`} className="badge bg-dark" style={{ fontSize: '0.7rem' }}>
                                      <i className="bi bi-gear me-1"></i>
                                      {materiau}
                                    </span>
                                  )) : null
                                }
                                {subProduct.dimensions && Array.isArray(subProduct.dimensions) && subProduct.dimensions.length > 0 ? 
                                  subProduct.dimensions.map((dim, index) => (
                                    <span key={`dim-${index}`} className="badge bg-success" style={{ fontSize: '0.7rem' }}>
                                      <i className="bi bi-rulers me-1"></i>
                                      {dim}
                                    </span>
                                  )) : null
                                }
                                {subProduct.capacite && Array.isArray(subProduct.capacite) && subProduct.capacite.length > 0 ? 
                                  subProduct.capacite.map((cap, index) => (
                                    <span key={`cap-${index}`} className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>
                                      <i className="bi bi-cup me-1"></i>
                                      {cap}
                                    </span>
                                  )) : null
                                }
                                {subProduct.poids && Array.isArray(subProduct.poids) && subProduct.poids.length > 0 ? 
                                  subProduct.poids.map((poids, index) => (
                                    <span key={`poids-${index}`} className="badge bg-light text-dark" style={{ fontSize: '0.7rem' }}>
                                      <i className="bi bi-speedometer2 me-1"></i>
                                      {poids}
                                    </span>
                                  )) : null
                                }
                                {subProduct.anse && Array.isArray(subProduct.anse) && subProduct.anse.length > 0 ? 
                                  subProduct.anse.map((anse, index) => (
                                    <span key={`anse-${index}`} className="badge bg-info" style={{ fontSize: '0.7rem' }}>
                                      <i className="bi bi-handle me-1"></i>
                                      {anse}
                                    </span>
                                  )) : null
                                }
                              </div>
                            </td>

                            {/* Prix Unitaire */}
                            <td>
                              <div className="fw-bold text-primary">{subProduct.prix} MAD</div>
                            </td>

                            {/* Quantité */}
                            <td>
                              <div className="fw-bold">{subProduct.stock}</div>
                            </td>

                            {/* État du Stock */}
                            <td>
                              <span className={`badge ${
                                subProduct.stock === 0 ? 'bg-danger' : 
                                subProduct.stock < 10 ? 'bg-warning' : 'bg-success'
                              }`}>
                                {subProduct.stock === 0 ? 'Rupture' : 
                                 subProduct.stock < 10 ? 'Stock faible' : 'Disponible'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td>
                              <div className="d-flex gap-2">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="rounded-3"
                                  title="Voir les détails"
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
                          </tr>
                        ))}
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
          >
            <Modal.Header closeButton>
              <Modal.Title>
                <i className="bi bi-eye me-2"></i>
                Aperçu du Produit
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Row>
                {/* Colonne 1: Image du produit */}
                <Col md={6}>
                  <div className="text-center">
                    <h6 className="mb-3 text-primary">
                      <i className="bi bi-image me-2"></i>
                      Image du Produit
                    </h6>
                    {productToPreview.image && productToPreview.image !== '/placeholder-product.jpg' && productToPreview.image !== '/mug.webp' ? (
                      <img
                        src={productToPreview.image}
                        alt={productToPreview.nom}
                        className="img-fluid rounded border shadow-sm"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '300px', 
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/mug.webp';
                        }}
                      />
                    ) : (
                      <div 
                        className="rounded border d-flex align-items-center justify-content-center text-muted"
                        style={{ 
                          width: '100%', 
                          height: '200px', 
                          backgroundColor: '#f8f9fa',
                          border: '2px dashed #dee2e6'
                        }}
                      >
                        <div className="text-center">
                          <i className="bi bi-image display-4 mb-2"></i>
                          <p className="mb-0">Aucune image disponible</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Col>

                {/* Colonne 2: Détails du produit */}
                <Col md={6}>
                  <div>
                    <h6 className="mb-3 text-primary">
                      <i className="bi bi-info-circle me-2"></i>
                      Détails du Produit
                    </h6>
                    
                    {/* Nom du produit */}
                    <div className="mb-3">
                      <h5 className="fw-bold text-dark mb-1">{productToPreview.nom}</h5>
                      <small className="text-muted">ID: {productToPreview.id}</small>
                    </div>

                    {/* Description */}
                    {productToPreview.description && (
                      <div className="mb-3">
                        <h6 className="text-secondary mb-2">Description</h6>
                        <p className="text-muted">{productToPreview.description}</p>
                      </div>
                    )}

                    {/* Caractéristiques */}
                    <div className="mb-3">
                      <h6 className="text-secondary mb-2">Caractéristiques</h6>
                      <div className="d-flex flex-wrap gap-1">
                        {/* Tag Catégorie */}
                        {productToPreview.categorie && (
                          <span className="badge" style={{ backgroundColor: '#6f42c1', color: 'white' }}>
                            <i className="bi bi-tag me-1"></i>
                            {productToPreview.categorie}
                          </span>
                        )}

                        {/* Tags Type */}
                        {productToPreview.type && Array.isArray(productToPreview.type) && productToPreview.type.length > 0 && (
                          <>
                            {productToPreview.type.map((type, index) => (
                              <span key={`type-${index}`} className="badge bg-primary">
                                <i className="bi bi-box me-1"></i>
                                {type}
                              </span>
                            ))}
                          </>
                        )}

                        {/* Tags Anse */}
                        {productToPreview.anse && Array.isArray(productToPreview.anse) && productToPreview.anse.length > 0 && (
                          <>
                            {productToPreview.anse.map((anse, index) => (
                              <span key={`anse-${index}`} className="badge bg-info">
                                <i className="bi bi-handle me-1"></i>
                                {anse}
                              </span>
                            ))}
                          </>
                        )}

                        {/* Tags Dimensions */}
                        {productToPreview.dimensions && Array.isArray(productToPreview.dimensions) && productToPreview.dimensions.length > 0 && (
                          <>
                            {productToPreview.dimensions.map((dim, index) => (
                              <span key={`dim-${index}`} className="badge bg-success">
                                <i className="bi bi-rulers me-1"></i>
                                {dim}
                              </span>
                            ))}
                          </>
                        )}

                        {/* Tags Couleurs */}
                        {productToPreview.couleurs && Array.isArray(productToPreview.couleurs) && productToPreview.couleurs.length > 0 && (
                          <>
                            {productToPreview.couleurs.map((couleur, index) => (
                              <span key={`couleur-${index}`} className="badge bg-warning">
                                <i className="bi bi-palette me-1"></i>
                                {couleur}
                              </span>
                            ))}
                          </>
                        )}

                        {/* Tags Matériaux */}
                        {productToPreview.materiau && Array.isArray(productToPreview.materiau) && productToPreview.materiau.length > 0 && (
                          <>
                            {productToPreview.materiau.map((materiau, index) => (
                              <span key={`materiau-${index}`} className="badge bg-dark">
                                <i className="bi bi-gear me-1"></i>
                                {materiau}
                              </span>
                            ))}
                          </>
                        )}

                        {/* Tags Capacité */}
                        {productToPreview.capacite && Array.isArray(productToPreview.capacite) && productToPreview.capacite.length > 0 && (
                          <>
                            {productToPreview.capacite.map((cap, index) => (
                              <span key={`cap-${index}`} className="badge bg-secondary">
                                <i className="bi bi-cup me-1"></i>
                                {cap}
                              </span>
                            ))}
                          </>
                        )}

                        {/* Tags Poids */}
                        {productToPreview.poids && Array.isArray(productToPreview.poids) && productToPreview.poids.length > 0 && (
                          <>
                            {productToPreview.poids.map((poids, index) => (
                              <span key={`poids-${index}`} className="badge bg-light text-dark">
                                <i className="bi bi-speedometer2 me-1"></i>
                                {poids}
                              </span>
                            ))}
                          </>
                        )}

                        {/* Tag Fournisseur */}
                        {productToPreview.fournisseur && productToPreview.fournisseur.nom && (
                          <span className="badge" style={{ backgroundColor: '#6610f2', color: 'white' }}>
                            <i className="bi bi-building me-1"></i>
                            {productToPreview.fournisseur.nom}
                          </span>
                        )}

                        {/* Tag Ville du Fournisseur */}
                        {productToPreview.fournisseur && productToPreview.fournisseur.ville && (
                          <span className="badge" style={{ backgroundColor: '#20c997', color: 'white' }}>
                            <i className="bi bi-geo-alt me-1"></i>
                            {productToPreview.fournisseur.ville}
                          </span>
                        )}

                        {/* Tag Prix */}
                        {productToPreview.prix && productToPreview.prix > 0 && (
                          <span className="badge" style={{ backgroundColor: '#fd7e14', color: 'white' }}>
                            <i className="bi bi-currency-exchange me-1"></i>
                            {productToPreview.prix} MAD
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantité et État du stock */}
                    <div className="row">
                      <div className="col-6">
                        <h6 className="text-secondary mb-2">Quantité en Stock</h6>
                        <div className="fw-bold fs-4 text-primary">{productToPreview.stock}</div>
                      </div>
                      <div className="col-6">
                        <h6 className="text-secondary mb-2">État du Stock</h6>
                        <span className={`badge fs-6 ${
                          productToPreview.stock === 0 ? 'bg-danger' : 
                          productToPreview.stock < 10 ? 'bg-warning' : 'bg-success'
                        }`}>
                          {productToPreview.stock === 0 ? 'Rupture' : 
                           productToPreview.stock < 10 ? 'Stock faible' : 'Disponible'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowProductPreviewModal(false)}>
                <i className="bi bi-x-circle me-2"></i>
                Fermer
              </Button>
            </Modal.Footer>
          </Modal>
        )}

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