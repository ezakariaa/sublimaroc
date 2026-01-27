import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './LoginModal.css';

interface LoginModalProps {
  show: boolean;
  onHide: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ show, onHide }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fonction pour vérifier si un utilisateur est déjà enregistré
  const checkUserExists = async (email: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
      return false;
    }
  };
  
  // Vérifier la configuration Firebase
  useEffect(() => {
    if (show) {
      console.log('Configuration Firebase:', {
        projectId: auth.app.options.projectId,
        authDomain: auth.app.options.authDomain,
        apiKey: auth.app.options.apiKey ? 'Configuré' : 'Manquant'
      });
    }
  }, [show]);

  // Charger l'email mémorisé quand la modal s'ouvre
  useEffect(() => {
    if (show) {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    }
  }, [show]);

  // Fermer automatiquement la modal quand l'utilisateur se connecte
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && show) {
        // L'utilisateur s'est connecté et la modal est ouverte, on la ferme
        onHide();
      }
    });

    return unsubscribe;
  }, [show, onHide]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      // Essayer d'abord la connexion Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Connexion Firebase réussie:', userCredential.user);
      
      // Vérifier si l'utilisateur existe dans notre base de données Firestore
      const userExists = await checkUserExists(email);
      
      if (!userExists) {
        console.log('Utilisateur connecté mais pas encore enregistré dans Firestore');
        // Optionnel : créer automatiquement l'utilisateur dans Firestore
        // await createUserInFirestore(userCredential.user);
      }
      
      // Si "Se rappeler de moi" est coché, on peut stocker l'email dans localStorage
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Fermer immédiatement la modal après connexion réussie
      onHide();
      setEmail('');
      setPassword('');
      setRememberMe(false);
      setError('');
      setSuccessMessage('');
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      switch (error.code) {
        case 'auth/user-not-found':
          setError('Aucun compte trouvé avec cet email.');
          break;
        case 'auth/wrong-password':
          setError('Mot de passe incorrect.');
          break;
        case 'auth/invalid-email':
          setError('Adresse email invalide.');
          break;
        case 'auth/too-many-requests':
          setError('Trop de tentatives. Veuillez réessayer plus tard.');
          break;
        case 'auth/network-request-failed':
          setError('Erreur de réseau. Vérifiez votre connexion internet.');
          break;
        default:
          setError('Erreur de connexion. Veuillez vérifier vos identifiants.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Veuillez saisir votre adresse email pour réinitialiser votre mot de passe.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Un email de réinitialisation a été envoyé à votre adresse email.');
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      switch (error.code) {
        case 'auth/user-not-found':
          setError('Aucun compte trouvé avec cet email.');
          break;
        case 'auth/invalid-email':
          setError('Adresse email invalide.');
          break;
        case 'auth/too-many-requests':
          setError('Trop de tentatives. Veuillez réessayer plus tard.');
          break;
        case 'auth/network-request-failed':
          setError('Erreur de réseau. Vérifiez votre connexion internet.');
          break;
        default:
          setError('Erreur lors de l\'envoi de l\'email de réinitialisation.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccessMessage('');
    setEmail('');
    setPassword('');
    setRememberMe(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered className="login-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-person-circle me-2"></i>
          Connexion
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          )}
          
          {successMessage && (
            <Alert variant="success" className="mb-3">
              <i className="bi bi-check-circle me-2"></i>
              {successMessage}
            </Alert>
          )}
          
          <Form.Group className="mb-3">
            <Form.Label>Adresse email</Form.Label>
            <Form.Control
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Mot de passe</Form.Label>
            <Form.Control
              type="password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </Form.Group>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <Form.Check
              type="checkbox"
              id="rememberMe"
              label="Se rappeler de moi"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            
            <Button
              variant="link"
              className="p-0 text-decoration-none"
              onClick={handleForgotPassword}
              disabled={loading}
              style={{ fontSize: '0.9rem' }}
            >
              Mot de passe oublié ?
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="w-100">
            <div className="text-center mb-3">
              <small className="text-muted">
                Pas encore de compte ?{' '}
                <a href="/register" className="text-decoration-none">
                  Créer un compte
                </a>
              </small>
            </div>
            <div className="d-flex gap-2">
              <Button variant="secondary" onClick={handleClose} disabled={loading} className="flex-fill">
                Annuler
              </Button>
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading || !email || !password}
                className="flex-fill"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Connexion...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    Se connecter
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default LoginModal;
