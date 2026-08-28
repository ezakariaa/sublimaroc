import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Badge, Form, InputGroup, Spinner } from 'react-bootstrap';
import { Product } from '../types';
import { ProductService, SubProductService } from '../services/apiService';
import './Products.css';
import CustomSelect from '../components/CustomSelect';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedPriceRange, setSelectedPriceRange] = useState('');
  const [hoverImageIndex, setHoverImageIndex] = useState<Record<string, number>>({});
  const hoverIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const handleMouseEnter = (product: Product) => {
    const allImages = [product.image, ...(product.images || [])].filter(Boolean) as string[];
    if (allImages.length <= 1) return;
    let idx = 0;
    hoverIntervals.current[product.id] = setInterval(() => {
      idx = (idx + 1) % allImages.length;
      setHoverImageIndex(prev => ({ ...prev, [product.id]: idx }));
    }, 700);
  };

  const handleMouseLeave = (product: Product) => {
    clearInterval(hoverIntervals.current[product.id]);
    delete hoverIntervals.current[product.id];
    setHoverImageIndex(prev => ({ ...prev, [product.id]: 0 }));
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await ProductService.getAllProducts();
        
        // Calculer le stock total en additionnant les stocks des sous-produits (comme dans Stock.tsx)
        const productsWithTotalStock = await Promise.all(
          productsData.map(async (product) => {
            try {
              const productSubProducts = await SubProductService.getSubProductsByProductId(product.id);
              
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
        setFilteredProducts(productsWithTotalStock);
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    // Filtrage par terme de recherche
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrage par type
    if (selectedType) {
      filtered = filtered.filter(product =>
        product.type?.includes(selectedType)
      );
    }

    // Filtrage par prix
    if (selectedPriceRange) {
      const [min, max] = selectedPriceRange.split('-').map(Number);
      filtered = filtered.filter(product => {
        if (max) {
          return product.prix >= min && product.prix <= max;
        } else {
          return product.prix >= min;
        }
      });
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedType, selectedPriceRange]);

  const getUniqueTypes = () => {
    const types = new Set<string>();
    products.forEach(product => {
      product.type?.forEach(type => types.add(type));
    });
    return Array.from(types);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(price);
  };

  if (loading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Chargement des produits...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <div className="products-page">
      <Container className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <h1 className="page-title">
              <i className="bi bi-box me-2"></i>
              Nos Produits
            </h1>
            <p className="page-subtitle">
              Découvrez notre gamme complète de produits de sublimation
            </p>
          </Col>
        </Row>

        {/* Filtres */}
        <Row className="mb-4">
          <Col md={4}>
            <InputGroup>
              <InputGroup.Text>
                <i className="bi bi-search"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
          
          <Col md={3}>
            <CustomSelect
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">Tous les types</option>
              {getUniqueTypes().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </CustomSelect>
          </Col>
          
          <Col md={3}>
            <CustomSelect
              value={selectedPriceRange}
              onChange={(e) => setSelectedPriceRange(e.target.value)}
            >
              <option value="">Tous les prix</option>
              <option value="0-50">0 - 50 MAD</option>
              <option value="50-100">50 - 100 MAD</option>
              <option value="100-200">100 - 200 MAD</option>
              <option value="200">200+ MAD</option>
            </CustomSelect>
          </Col>
          
          <Col md={2}>
            <Button
              variant="outline-secondary"
              onClick={() => {
                setSearchTerm('');
                setSelectedType('');
                setSelectedPriceRange('');
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
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
            </p>
          </Col>
        </Row>

        {/* Grille des produits */}
        <Row>
          {filteredProducts.map((product) => (
            <Col md={6} lg={4} xl={3} key={product.id} className="mb-4">
              <Card
                className="product-card h-100"
                onMouseEnter={() => handleMouseEnter(product)}
                onMouseLeave={() => handleMouseLeave(product)}
              >
                <div className="product-image-container">
                  {(() => {
                    const allImages = [product.image, ...(product.images || [])].filter(Boolean) as string[];
                    const currentIdx = hoverImageIndex[product.id] ?? 0;
                    return (
                      <>
                        <Card.Img
                          variant="top"
                          src={allImages[currentIdx] || '/placeholder-product.jpg'}
                          alt={product.nom}
                          className="product-image"
                        />
                        {allImages.length > 1 && (
                          <div className="image-dots">
                            {allImages.map((_, i) => (
                              <span key={i} className={`image-dot${i === currentIdx ? ' active' : ''}`} />
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className="product-badges">
                    {product.stock === 0 ? (
                      <Badge bg="danger">Stock Épuisé</Badge>
                    ) : product.stock < 10 ? (
                      <Badge bg="warning">Stock faible</Badge>
                    ) : (
                      <Badge bg="success">Disponible</Badge>
                    )}
                  </div>
                </div>
                
                <Card.Body className="d-flex flex-column">
                  <Card.Title className="product-title">{product.nom}</Card.Title>
                  
                  <Card.Text className="product-description">
                    {product.description}
                  </Card.Text>
                  
                  <div className="product-details mb-3">
                    <div className="product-types">
                      {product.type?.slice(0, 2).map((type, index) => (
                        <Badge key={index} bg="primary" className="me-1 mb-1">
                          {type}
                        </Badge>
                      ))}
                      {(product.type?.length ?? 0) > 2 && (
                        <Badge bg="secondary">+{(product.type?.length ?? 0) - 2}</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="product-footer mt-auto">
                    <div className="product-price">
                      {formatPrice(product.prix)}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="product-btn"
                    >
                      <i className="bi bi-eye me-1"></i>
                      Voir détails
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {filteredProducts.length === 0 && (
          <Row>
            <Col className="text-center py-5">
              <i className="bi bi-search display-1 text-muted"></i>
              <h3 className="mt-3 text-muted">Aucun produit trouvé</h3>
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

export default Products;




