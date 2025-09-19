import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
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

  // Configuration du provider Google
  const googleProvider = new GoogleAuthProvider();
  
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

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      console.log('Tentative de connexion Google...');
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Connexion Google réussie:', result.user);
      
      // Vérifier si l'utilisateur est déjà enregistré dans notre base de données
      const userEmail = result.user.email;
      if (userEmail) {
        const userExists = await checkUserExists(userEmail);
        
        if (!userExists) {
          // L'utilisateur n'est pas encore enregistré, on peut le laisser se connecter
          console.log('Nouvel utilisateur Google, connexion autorisée');
        } else {
          console.log('Utilisateur Google déjà enregistré, connexion autorisée');
        }
      }
      
      // La connexion Google est réussie
      onHide(); // Fermer la modal après connexion réussie
      setEmail('');
      setPassword('');
      setRememberMe(false);
      setError('');
      setSuccessMessage('');
    } catch (error: any) {
      console.error('Erreur de connexion Google:', error);
      console.error('Code d\'erreur:', error.code);
      console.error('Message d\'erreur:', error.message);
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          setError('Connexion annulée par l\'utilisateur.');
          break;
        case 'auth/popup-blocked':
          setError('La popup a été bloquée par le navigateur. Veuillez autoriser les popups pour ce site.');
          break;
        case 'auth/cancelled-popup-request':
          setError('Connexion annulée.');
          break;
        case 'auth/operation-not-allowed':
          setError('L\'authentification Google n\'est pas activée. Veuillez contacter l\'administrateur.');
          break;
        case 'auth/unauthorized-domain':
          setError('Ce domaine n\'est pas autorisé pour l\'authentification Google.');
          break;
        case 'auth/network-request-failed':
          setError('Erreur de réseau. Vérifiez votre connexion internet.');
          break;
        default:
          setError(`Erreur lors de la connexion avec Google: ${error.message || 'Erreur inconnue'}`);
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

          {/* Bouton de connexion Google */}
          <div className="d-grid mb-3">
            <Button
              variant="outline-secondary"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="google-button d-flex align-items-center justify-content-center"
              style={{ height: '45px' }}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" className="me-2">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continuer avec Google
            </Button>
          </div>

          {/* Séparateur */}
          <div className="separator">
            <span>ou</span>
          </div>
          
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
