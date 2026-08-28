import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Carousel } from 'react-bootstrap';
import { Product } from '../types';
import { ProductService } from '../services/apiService';
import { bannerImages } from '../config/banners';
import './Home.css';

const categorySubtitles: Record<string, string> = {
  'Cartes Visites':        'Votre image tient dans une carte.',
  'Casquettes':            'Votre marque, sur votre tête',
  'Catalogues & Brochures':'Supports marketing',
  'Catalogues & brochures':'Supports marketing',
  'Flyers & Depliants':    'Attirez, informez, convainquez',
  'Flyers & Dépliants':    'Passez votre message efficacement',
  'Hoodies':               'Restez au chaud avec votre identité.',
  'Logos':                 'Donnez vie à votre marque',
  'Mug':                   'Cadeaux publicitaires',
  'Mugs':                  'Cadeaux publicitaires',
  'Packaging & Boites':    'Emballage sur mesure',
  'Plans':                 'Reproduction technique',
  'Stickers':              'Adhésifs personnalisés',
  'T-shirts':              'Portez ce qui vous définit',
  'Totebags':              'Transportez votre style partout.',
  'ToteBags':              'Transportez votre style partout.',
};

const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroImages, setHeroImages] = useState<Array<{ src: string; alt: string }>>([]);
  const [stripImages, setStripImages] = useState<string[]>([]);

  const stripRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const autoScrollRef = useRef<number | null>(null);

  // Auto-scroll : tourne en permanence, même pendant le glissement
  useEffect(() => {
    const container = stripRef.current;
    if (!container) return;

    const speed = 1;
    const animate = () => {
      if (container) {
        container.scrollLeft += speed;
        if (container.scrollLeft >= container.scrollWidth / 2) {
          container.scrollLeft = 0;
        }
      }
      autoScrollRef.current = requestAnimationFrame(animate);
    };

    autoScrollRef.current = requestAnimationFrame(animate);
    return () => {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
    };
  }, []);

  // Réinitialiser isDragging si le bouton est relâché n'importe où
  useEffect(() => {
    const onMouseUp = () => { isDragging.current = false; };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const container = stripRef.current;
    if (!container) return;
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startX.current = clientX;
    scrollStart.current = container.scrollLeft;
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging.current || !stripRef.current) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const walk = (startX.current - clientX) * 1.5;
    // On met à jour le point de départ pour que l'auto-scroll reprenne
    // depuis la position courante après le glissement
    startX.current = clientX;
    scrollStart.current = stripRef.current.scrollLeft;
    stripRef.current.scrollLeft = scrollStart.current + walk;
  };

  const handleDragEnd = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        const products = await ProductService.getAllProducts();
        setFeaturedProducts(products.slice(0, 5));
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
      } finally {
        setLoading(false);
      }
    };

    const loadImages = async () => {
      try {
        const res = await fetch('/api/images.php');
        const files: string[] = await res.json();
        setStripImages(files);
      } catch (error) {
        console.error('Erreur chargement images:', error);
      }
    };

    loadFeaturedProducts();
    loadImages();
    setHeroImages(bannerImages);
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
                  <h1 className="hero-title">SubliMaroc</h1>
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

      {/* Image Scroll Strip */}
      <section
        className="image-strip-section"
        ref={stripRef}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        <div className="image-strip-track">
          {[...stripImages, ...stripImages].map((filename, i) => {
            const name = filename.replace(/\.[^/.]+$/, ''); // retire l'extension
            return (
              <div key={i} className="strip-item">
                <img
                  src={`/images/${filename}`}
                  alt={name}
                  className="strip-image"
                  draggable={false}
                />
                <span className="strip-label">{name}</span>
                <span className="strip-sublabel">
                  {categorySubtitles[name] || 'Impression personnalisée'}
                </span>
              </div>
            );
          })}
        </div>
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
