import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner, Container, Row, Col } from 'react-bootstrap';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Chargement...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  if (!user) {
    // Rediriger vers la page d'accueil si non connecté
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
