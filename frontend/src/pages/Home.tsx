import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Carousel } from 'react-bootstrap';
import { Product } from '../types';
import { ProductService } from '../services/firebaseService';
import { bannerImages } from '../config/banners';
import './Home.css';

const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroImages, setHeroImages] = useState<Array<{ src: string; alt: string }>>([]);


  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        const products = await ProductService.getAllProducts();
        setFeaturedProducts(products.slice(0, 5)); // Afficher les 5 premiers produits
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedProducts();
    setHeroImages(bannerImages); // Charger les bannières directement
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <Carousel fade className="hero-carousel">
          {heroImages.map((image, index) => (
            <Carousel.Item key={index}>
              <div className="hero-slide">
                <img
                  className="hero-image"
                  src={image.src}
                  alt={image.alt}
                />
                <Carousel.Caption className="hero-caption">
                  <h1 className="hero-title">Graph'Ink</h1>
                  <p className="hero-subtitle">
                    Votre partenaire de confiance pour l'impression au Maroc
                  </p>
                  <Button variant="primary" size="lg" className="hero-btn">
                    <i className="bi bi-arrow-right me-2"></i>
                    Découvrir nos produits
                  </Button>
                </Carousel.Caption>
              </div>
            </Carousel.Item>
          ))}
        </Carousel>
      </section>

      {/* Services Section */}
      <section className="services-section py-5">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">Nos Services</h2>
              <p className="section-subtitle">
                Des solutions complètes pour tous vos besoins d'impression
              </p>
            </Col>
          </Row>
          
          <Row>
            <Col md={4} className="mb-4">
              <Card className="service-card h-100">
                <Card.Body className="text-center">
                  <div className="service-icon">
                    <i className="bi bi-printer"></i>
                  </div>
                  <Card.Title>Impression</Card.Title>
                  <Card.Text>
                    Impression de haute qualité sur tous types de supports
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4} className="mb-4">
              <Card className="service-card h-100">
                <Card.Body className="text-center">
                  <div className="service-icon">
                    <i className="bi bi-palette"></i>
                  </div>
                  <Card.Title>Personnalisation</Card.Title>
                  <Card.Text>
                    Création de designs uniques selon vos besoins
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4} className="mb-4">
              <Card className="service-card h-100">
                <Card.Body className="text-center">
                  <div className="service-icon">
                    <i className="bi bi-truck"></i>
                  </div>
                  <Card.Title>Livraison</Card.Title>
                  <Card.Text>
                    Livraison dans tout Casablanca
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Featured Products Section */}
      <section className="products-section py-5 bg-light">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">Produits Vedettes</h2>
              <p className="section-subtitle">
                Découvrez notre sélection de produits populaires
              </p>
            </Col>
          </Row>
          
          {loading ? (
            <Row>
              <Col className="text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Chargement...</span>
                </div>
              </Col>
            </Row>
          ) : (
            <Row>
              {featuredProducts.map((product) => (
                <Col xs={6} sm={4} md={4} lg={2} xl={2} key={product.id} className="mb-4 product-col-lg">
                  <Card className="product-card h-100">
                    <div className="product-image-container">
                      <Card.Img 
                        variant="top" 
                        src={product.image || '/placeholder-product.jpg'} 
                        alt={product.nom}
                        className="product-image"
                      />
                    </div>
                    <Card.Body className="d-flex flex-column">
                      <Card.Title className="product-title">{product.nom}</Card.Title>
                      <Card.Text className="product-price">
                        {product.prix} MAD
                      </Card.Text>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="mt-auto"
                      >
                        Voir détails
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>
    </div>
  );
};

export default Home;




