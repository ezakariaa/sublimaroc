import { Container, Row, Col } from 'react-bootstrap';

export default function Footer() {
  return (
    <footer className="footer text-white py-5">
      <Container>
        <Row className="justify-content-center text-center">
          <Col lg={8}>
            <h3 className="h2 fw-bold mb-3">SubliMaroc</h3>
            <p className="text-light mb-4">
              Votre partenaire de confiance pour la sublimation au Maroc
            </p>
            <hr className="border-light" />
            <p className="text-light mb-0">
              © 2024 SubliMaroc. Tous droits réservés.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
}

