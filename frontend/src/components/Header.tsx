import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';
import './Header.css';

const ANNOUNCEMENT_HEIGHT = 36;

const Header: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 5);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <>
      {/* Barre d'annonce — fixed en haut, se décale vers le haut au scroll */}
      <div
        style={{
          position: 'fixed',
          top: scrolled ? -ANNOUNCEMENT_HEIGHT : 0,
          left: 0,
          right: 0,
          height: ANNOUNCEMENT_HEIGHT,
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          background: 'linear-gradient(90deg, #e8f0fe 0%, #f0f4ff 100%)',
          borderBottom: '1px solid #d0d9f0',
          fontSize: '0.82rem',
          fontWeight: 500,
          color: '#333',
          transition: 'top 0.35s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a href="#" style={{ color: '#555', textDecoration: 'none' }}>
            <i className="bi bi-facebook" style={{ fontFamily: 'bootstrap-icons', fontSize: '1rem' }}></i>
          </a>
          <a href="#" style={{ color: '#555', textDecoration: 'none' }}>
            <i className="bi bi-instagram" style={{ fontFamily: 'bootstrap-icons', fontSize: '1rem' }}></i>
          </a>
          <a href="#" style={{ color: '#555', textDecoration: 'none' }}>
            <i className="bi bi-youtube" style={{ fontFamily: 'bootstrap-icons', fontSize: '1rem' }}></i>
          </a>
        </div>
        <div style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap' }}>
          🔥 Très bientôt&nbsp;: Offres Exceptionnelles de lancement. 🔥
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a href="https://wa.me/" style={{ color: '#555', textDecoration: 'none' }}>
            <i className="bi bi-whatsapp" style={{ fontFamily: 'bootstrap-icons', fontSize: '1rem' }}></i>
          </a>
        </div>
      </div>

      {/* Header nav — fixed, descend sous la barre d'annonce, remonte au scroll */}
      <Navbar
        bg="white"
        expand="lg"
        className="header"
        style={{
          position: 'fixed',
          top: scrolled ? 0 : ANNOUNCEMENT_HEIGHT,
          left: 0,
          right: 0,
          zIndex: 1000,
          transition: 'top 0.35s ease',
        }}
      >
        <Container className="header-container">
          <Navbar.Brand as={Link} to="/" className="header-brand-center d-flex align-items-center">
            <div className="logo-container">
              <div className="logo-circles">
                <div className="circle cyan"></div>
                <div className="circle magenta"></div>
                <div className="circle yellow"></div>
              </div>
              <div className="brand-text">
                <div className="brand-main">SUBLIMAROC</div>
                <div className="brand-sub">Services d'impression</div>
              </div>
            </div>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/" className={`nav-link-custom ${location.pathname === '/' ? 'active' : ''}`}>
                Accueil
              </Nav.Link>
              <Nav.Link as={Link} to="/services" className={`nav-link-custom ${location.pathname === '/services' ? 'active' : ''}`}>
                Services
              </Nav.Link>
              <Nav.Link as={Link} to="/products" className={`nav-link-custom ${location.pathname === '/products' ? 'active' : ''}`}>
                Produits
              </Nav.Link>
              <Nav.Link as={Link} to="/contact" className={`nav-link-custom ${location.pathname === '/contact' ? 'active' : ''}`}>
                Contact
              </Nav.Link>
            </Nav>

            <Nav>
              {user ? (
                <NavDropdown
                  title={
                    <div className="user-button">
                      <i className="bi bi-person-circle me-2" style={{ fontFamily: 'bootstrap-icons' }}></i>
                      {(user as any).displayName || user.email?.split('@')[0] || 'Utilisateur'}
                      <i className="bi bi-chevron-down ms-2" style={{ fontFamily: 'bootstrap-icons' }}></i>
                    </div>
                  }
                  id="user-dropdown"
                  className="user-dropdown"
                >
                  <NavDropdown.Item as={Link} to="/profile">Mon Profil</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/stock">Produits en Stock</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/achats">Achat Matériels</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/consommables">Consommables</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/autres-depenses">Autres Dépenses</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/articles">Articles en Vente</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/sales">Ventes & Factures</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/stats">Statistiques</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/settings">Paramètres</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>Se déconnecter</NavDropdown.Item>
                </NavDropdown>
              ) : (
                <div className="user-button" onClick={() => setShowLoginModal(true)} style={{ cursor: 'pointer' }}>
                  <i className="bi bi-person-circle me-2" style={{ fontFamily: 'bootstrap-icons' }}></i>
                  Se connecter
                </div>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Espace réservé pour compenser le header fixed */}
      <div style={{ height: scrolled ? 72 : ANNOUNCEMENT_HEIGHT + 72, transition: 'height 0.35s ease' }}></div>

      <LoginModal show={showLoginModal} onHide={() => setShowLoginModal(false)} />
    </>
  );
};

export default Header;
