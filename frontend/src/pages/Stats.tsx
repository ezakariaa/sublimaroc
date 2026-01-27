import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const Stats: React.FC = () => {
  return (
    <div className="stats-page">
      <Container className="py-5">
        <Row>
          <Col>
            <h1 className="mb-4">
              <i className="bi bi-graph-up me-2"></i>
              Statistiques
            </h1>
            <Card>
              <Card.Body>
                <p>Page des statistiques (À implémenter)</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Stats;
