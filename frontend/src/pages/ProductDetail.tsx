import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Carousel, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { Product, SubProduct } from '../types';
import { ProductService, SubProductService } from '../services/apiService';
import './ProductDetail.css';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [subProducts, setSubProducts] = useState<SubProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const loadProductData = async () => {
      if (!id) {
        setError('ID du produit manquant');
        setLoading(false);
        return;
      }

      try {
        const [productData, subProductsData] = await Promise.all([
          ProductService.getProductById(id),
          SubProductService.getSubProductsByProductId(id)
        ]);

        if (!productData) {
          setError('Produit non trouvé');
          setLoading(false);
          return;
        }

        setProduct(productData);
        setSubProducts(subProductsData);
      } catch (err) {
        console.error('Erreur lors du chargement du produit:', err);
        setError('Erreur lors du chargement du produit');
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(price);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { variant: 'danger', text: 'Stock Épuisé' };
    if (stock < 10) return { variant: 'warning', text: 'Stock faible' };
    return { variant: 'success', text: 'Disponible' };
  };

  if (loading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Chargement du produit...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <Alert variant="danger">
              <Alert.Heading>Erreur</Alert.Heading>
              <p>{error || 'Produit non trouvé'}</p>
              <hr />
              <Button variant="outline-danger" onClick={() => navigate('/products')}>
                Retour aux produits
              </Button>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  const productImages = [product.image, '/placeholder-product.jpg'].filter(Boolean);

  return (
    <div className="product-detail-page">
      <Container className="py-4">
        {/* Breadcrumb */}
        <Row className="mb-4">
          <Col>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Button variant="link" onClick={() => navigate('/')} className="p-0">
                    Accueil
                  </Button>
                </li>
                <li className="breadcrumb-item">
                  <Button variant="link" onClick={() => navigate('/products')} className="p-0">
                    Produits
                  </Button>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  {product.nom}
                </li>
              </ol>
            </nav>
          </Col>
        </Row>

        <Row>
          {/* Images du produit */}
          <Col lg={6} className="mb-4">
            <Card className="product-images-card">
              <Card.Body className="p-0">
                <Carousel
                  activeIndex={selectedImageIndex}
                  onSelect={setSelectedImageIndex}
                  interval={null}
                  className="product-carousel"
                >
                  {productImages.map((image, index) => (
                    <Carousel.Item key={index}>
                      <div className="product-image-container">
                        <img
                          className="product-main-image"
                          src={image}
                          alt={`${product.nom} - Image ${index + 1}`}
                        />
                      </div>
                    </Carousel.Item>
                  ))}
                </Carousel>
                
                {/* Miniatures */}
                <div className="product-thumbnails">
                  {productImages.map((image, index) => (
                    <div
                      key={index}
                      className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img src={image} alt={`Miniature ${index + 1}`} />
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Informations du produit */}
          <Col lg={6} className="mb-4">
            <Card className="product-info-card">
              <Card.Body>
                <div className="product-header">
                  <h1 className="product-title">{product.nom}</h1>
                  <div className="product-price">
                    {formatPrice(product.prix)}
                  </div>
                </div>

                <div className="product-description">
                  <p>{product.description}</p>
                </div>

                {/* Statut du stock */}
                <div className="product-stock mb-3">
                  <Badge bg={getStockStatus(product.stock).variant} className="stock-badge">
                    <i className="bi bi-box me-1"></i>
                    {getStockStatus(product.stock).text} ({product.stock} unités)
                  </Badge>
                </div>

                {/* Caractéristiques */}
                <div className="product-features">
                  <h5>Caractéristiques</h5>
                  
                  <div className="feature-group">
                    <div className="feature-header">
                      <strong>Types :</strong>
                      <Button variant="outline-success" size="sm" className="ms-2 add-feature-btn" title="Ajouter">
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                    {(product.type?.length ?? 0) > 0 && (
                      <div className="feature-tags">
                        {product.type?.map((type, index) => (
                          <Badge key={index} bg="primary" className="me-1 mb-1">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="feature-group">
                    <div className="feature-header">
                      <strong>Couleurs :</strong>
                      <Button variant="outline-success" size="sm" className="ms-2 add-feature-btn" title="Ajouter">
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                    {(product.couleurs?.length ?? 0) > 0 && (
                      <div className="feature-tags">
                        {product.couleurs?.map((couleur, index) => (
                          <Badge key={index} bg="info" className="me-1 mb-1">
                            {couleur}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="feature-group">
                    <div className="feature-header">
                      <strong>Matériaux :</strong>
                      <Button variant="outline-success" size="sm" className="ms-2 add-feature-btn" title="Ajouter">
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                    {(product.materiau?.length ?? 0) > 0 && (
                      <div className="feature-tags">
                        {product.materiau?.map((materiau, index) => (
                          <Badge key={index} bg="secondary" className="me-1 mb-1">
                            {materiau}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="feature-group">
                    <div className="feature-header">
                      <strong>Dimensions :</strong>
                      <Button variant="outline-success" size="sm" className="ms-2 add-feature-btn" title="Ajouter">
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                    {(product.dimensions?.length ?? 0) > 0 && (
                      <div className="feature-tags">
                        {product.dimensions?.map((dimension, index) => (
                          <Badge key={index} bg="success" className="me-1 mb-1">
                            {dimension}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="product-actions">
                  <Button variant="primary" size="lg" className="me-3">
                    <i className="bi bi-cart-plus me-2"></i>
                    Ajouter au panier
                  </Button>
                  <Button variant="outline-primary" size="lg">
                    <i className="bi bi-heart me-2"></i>
                    Favoris
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Sous-produits */}
        {subProducts.length > 0 && (
          <Row className="mt-5">
            <Col>
              <h3 className="section-title">Variantes disponibles</h3>
              <Row>
                {subProducts.map((subProduct) => (
                  <Col md={6} lg={4} key={subProduct.id} className="mb-3">
                    <Card className="sub-product-card">
                      <Card.Img
                        variant="top"
                        src={subProduct.image || '/placeholder-product.jpg'}
                        alt={subProduct.nom}
                        className="sub-product-image"
                      />
                      <Card.Body>
                        <Card.Title className="sub-product-title">
                          {subProduct.nom}
                        </Card.Title>
                        <Card.Text className="sub-product-description">
                          {subProduct.description}
                        </Card.Text>
                        <div className="sub-product-footer">
                          <div className="sub-product-price">
                            {formatPrice(subProduct.prix)}
                          </div>
                          <Badge bg={getStockStatus(subProduct.stock).variant}>
                            {subProduct.stock} en stock
                          </Badge>
                        </div>
                        <Button variant="outline-primary" size="sm" className="w-100 mt-2">
                          Voir détails
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
};

export default ProductDetail;




