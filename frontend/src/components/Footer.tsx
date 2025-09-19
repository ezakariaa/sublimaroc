import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer mt-5">
      <Container>
        <Row className="py-4">
          <Col md={4}>
            <h5 className="footer-title">
              <i className="bi bi-printer me-2"></i>
              SubliMaroc
            </h5>
            <p className="footer-text">
              Votre partenaire de confiance pour la sublimation au Maroc. 
              Des produits de qualité supérieure pour tous vos besoins d'impression.
            </p>
          </Col>
          
          <Col md={4}>
            <h6 className="footer-subtitle">Liens Rapides</h6>
            <ul className="footer-links">
              <li><a href="/products"><i className="bi bi-arrow-right me-1"></i>Nos Produits</a></li>
              <li><a href="/stock"><i className="bi bi-arrow-right me-1"></i>Stock</a></li>
              <li><a href="/contact"><i className="bi bi-arrow-right me-1"></i>Contact</a></li>
              <li><a href="/about"><i className="bi bi-arrow-right me-1"></i>À Propos</a></li>
            </ul>
          </Col>
          
          <Col md={4}>
            <h6 className="footer-subtitle">Contact</h6>
            <div className="footer-contact">
              <p><i className="bi bi-geo-alt me-2"></i>Casablanca, Maroc</p>
              <p><i className="bi bi-telephone me-2"></i>+212 5XX XXX XXX</p>
              <p><i className="bi bi-envelope me-2"></i>contact@sublimaroc.ma</p>
            </div>
          </Col>
        </Row>
        
        <hr className="footer-divider" />
        
        <Row className="py-3">
          <Col md={6}>
            <p className="footer-copyright">
              © 2024 SubliMaroc. Tous droits réservés.
            </p>
          </Col>
          <Col md={6} className="text-md-end">
            <div className="footer-social">
              <a href="#" className="social-link me-3">
                <i className="bi bi-facebook"></i>
              </a>
              <a href="#" className="social-link me-3">
                <i className="bi bi-instagram"></i>
              </a>
              <a href="#" className="social-link">
                <i className="bi bi-linkedin"></i>
              </a>
            </div>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;




