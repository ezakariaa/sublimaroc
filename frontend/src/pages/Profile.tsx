import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="profile-page">
      <Container className="py-5">
        <Row>
          <Col md={8} className="mx-auto">
            <Card>
              <Card.Body>
                <h1 className="mb-4">
                  <i className="bi bi-person me-2"></i>
                  Mon Profil
                </h1>
                
                {user && (
                  <div>
                    <div className="mb-3">
                      <strong>Email:</strong> {user.email}
                    </div>
                    {user.displayName && (
                      <div className="mb-3">
                        <strong>Nom:</strong> {user.displayName}
                      </div>
                    )}
                    <div className="mb-3">
                      <strong>UID:</strong> {user.uid}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Profile;
