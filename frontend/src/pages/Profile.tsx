import React, { useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import './Profile.css';

/** Initiales affichées dans l'avatar (2 lettres max). */
const getInitials = (nom: string, email: string): string => {
  const source = (nom || email.split('@')[0] || '').trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/** Date Firebase (chaîne UTC) formatée en français, ou null si absente. */
const formatDate = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const fbUser = auth.currentUser;
  const dateCreation = formatDate(fbUser?.metadata.creationTime);
  const derniereConnexion = formatDate(fbUser?.metadata.lastSignInTime);

  const handleCopyId = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast.success('Identifiant copié');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier l\'identifiant');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  return (
    <div className="profile-page">
      <Container className="py-5">
        <h1>
          <i className="bi bi-person-circle"></i>
          Mon Profil
        </h1>

        {!user ? (
          <Card className="profile-card">
            <Card.Body className="profile-empty">
              <i className="bi bi-person-x"></i>
              <h5 className="mb-2">Aucune session active</h5>
              <p className="text-muted mb-0">
                Connectez-vous pour consulter les informations de votre compte.
              </p>
            </Card.Body>
          </Card>
        ) : (
          <>
            {/* Bandeau d'identité */}
            <Card className="profile-hero mb-4">
              <Card.Body>
                <div className="d-flex flex-column flex-md-row align-items-md-center gap-3 gap-md-4">
                  <div className="profile-avatar">{getInitials(user.nom, user.email)}</div>
                  <div className="flex-grow-1">
                    <div className="profile-hero-name">{user.nom || 'Utilisateur'}</div>
                    <div className="profile-hero-email">{user.email}</div>
                    <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-md-start">
                      <span className={`profile-chip ${user.role === 'admin' ? 'admin' : ''}`}>
                        <i className={`bi ${user.role === 'admin' ? 'bi-shield-lock' : 'bi-person'}`}></i>
                        {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                      </span>
                      {fbUser?.emailVerified && (
                        <span className="profile-chip verified">
                          <i className="bi bi-patch-check"></i>
                          Email vérifié
                        </span>
                      )}
                      {dateCreation && (
                        <span className="profile-chip">
                          <i className="bi bi-calendar-check"></i>
                          Membre depuis le {dateCreation.split(' à')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Row className="g-4">
              {/* Informations du compte */}
              <Col lg={7}>
                <Card className="profile-card h-100">
                  <Card.Body>
                    <div className="profile-card-title">
                      <i className="bi bi-person-vcard"></i>
                      Informations du compte
                    </div>

                    <div className="profile-field">
                      <div className="profile-field-icon">
                        <i className="bi bi-person"></i>
                      </div>
                      <div className="profile-field-content">
                        <div className="profile-field-label">Nom</div>
                        <div className={`profile-field-value ${user.nom ? '' : 'muted'}`}>
                          {user.nom || 'Non renseigné'}
                        </div>
                      </div>
                    </div>

                    <div className="profile-field">
                      <div className="profile-field-icon">
                        <i className="bi bi-envelope"></i>
                      </div>
                      <div className="profile-field-content">
                        <div className="profile-field-label">Email</div>
                        <div className="profile-field-value">{user.email}</div>
                      </div>
                    </div>

                    <div className="profile-field">
                      <div className="profile-field-icon">
                        <i className="bi bi-shield-check"></i>
                      </div>
                      <div className="profile-field-content">
                        <div className="profile-field-label">Rôle</div>
                        <div className="profile-field-value">
                          {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                        </div>
                      </div>
                    </div>

                    <div className="profile-field">
                      <div className="profile-field-icon">
                        <i className="bi bi-key"></i>
                      </div>
                      <div className="profile-field-content">
                        <div className="profile-field-label">Identifiant</div>
                        <div className="profile-field-value mono">{user.id}</div>
                      </div>
                      <button
                        type="button"
                        className={`profile-copy-btn ${copied ? 'copied' : ''}`}
                        onClick={handleCopyId}
                        title="Copier l'identifiant"
                        aria-label="Copier l'identifiant"
                      >
                        <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'}`}></i>
                      </button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Activité + actions */}
              <Col lg={5}>
                <Card className="profile-card mb-4">
                  <Card.Body>
                    <div className="profile-card-title">
                      <i className="bi bi-clock-history"></i>
                      Activité
                    </div>

                    <div className="profile-field">
                      <div className="profile-field-icon">
                        <i className="bi bi-calendar-plus"></i>
                      </div>
                      <div className="profile-field-content">
                        <div className="profile-field-label">Compte créé le</div>
                        <div className={`profile-field-value ${dateCreation ? '' : 'muted'}`}>
                          {dateCreation || 'Non disponible'}
                        </div>
                      </div>
                    </div>

                    <div className="profile-field">
                      <div className="profile-field-icon">
                        <i className="bi bi-box-arrow-in-right"></i>
                      </div>
                      <div className="profile-field-content">
                        <div className="profile-field-label">Dernière connexion</div>
                        <div className={`profile-field-value ${derniereConnexion ? '' : 'muted'}`}>
                          {derniereConnexion || 'Non disponible'}
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>

                <Card className="profile-card">
                  <Card.Body>
                    <div className="profile-card-title">
                      <i className="bi bi-lightning-charge"></i>
                      Actions rapides
                    </div>

                    <Link to="/settings" className="profile-action">
                      <i className="bi bi-gear"></i>
                      Paramètres
                      <i className="bi bi-chevron-right profile-action-arrow"></i>
                    </Link>

                    <Link to="/stats" className="profile-action">
                      <i className="bi bi-graph-up"></i>
                      Statistiques
                      <i className="bi bi-chevron-right profile-action-arrow"></i>
                    </Link>

                    <button type="button" className="profile-action danger" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right"></i>
                      Se déconnecter
                      <i className="bi bi-chevron-right profile-action-arrow"></i>
                    </button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Container>
    </div>
  );
};

export default Profile;
