import React, { useState } from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';
import './Header.css';

const Header: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  return (
    <>
      <Navbar bg="white" expand="lg" className="header">
        <Container>
          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
            <div className="logo-container">
              <div className="logo-circles">
                <div className="circle cyan"></div>
                <div className="circle magenta"></div>
                <div className="circle yellow"></div>
              </div>
              <div className="brand-text">
                <div className="brand-main">SUBLIMATION</div>
                <div className="brand-sub">MAROC</div>
              </div>
            </div>
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link 
                as={Link} 
                to="/services" 
                className={`nav-link-custom ${location.pathname === '/services' ? 'active' : ''}`}
              >
                Services
              </Nav.Link>
              
              <Nav.Link 
                as={Link} 
                to="/products" 
                className={`nav-link-custom ${location.pathname === '/products' ? 'active' : ''}`}
              >
                Produits
              </Nav.Link>
              
              <Nav.Link 
                as={Link} 
                to="/contact" 
                className={`nav-link-custom ${location.pathname === '/contact' ? 'active' : ''}`}
              >
                Contact
              </Nav.Link>
            </Nav>
            
            <Nav className="ms-3">
              {user ? (
                <NavDropdown 
                  title={
                    <div className="user-button">
                      <i className="bi bi-person-circle me-2"></i>
                      {user.displayName || user.email?.split('@')[0] || 'Utilisateur'}
                      <i className="bi bi-chevron-down ms-2"></i>
                    </div>
                  } 
                  id="user-dropdown"
                  className="user-dropdown"
                >
                  <NavDropdown.Item as={Link} to="/profile">
                    <i className="bi bi-person me-2"></i>
                    Mon Profil
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/stock">
                    <i className="bi bi-boxes me-2"></i>
                    État du Stock
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/achats">
                    <i className="bi bi-cart-plus me-2"></i>
                    Achats (Matériels)
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/achats-articles">
                    <i className="bi bi-bag me-2"></i>
                    Achats (Articles)
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/sales">
                    <i className="bi bi-cart-check me-2"></i>
                    Ventes
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/stats">
                    <i className="bi bi-graph-up me-2"></i>
                    Stats
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/settings">
                    <i className="bi bi-gear me-2"></i>
                    Paramètres
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Se déconnecter
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <div 
                  className="user-button" 
                  onClick={handleLoginClick}
                  style={{ cursor: 'pointer' }}
                >
                  <i className="bi bi-person-circle me-2"></i>
                  Se connecter
                </div>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <div className="header-bar"></div>
      
      <LoginModal 
        show={showLoginModal} 
        onHide={() => setShowLoginModal(false)} 
      />
    </>
  );
};

export default Header;




