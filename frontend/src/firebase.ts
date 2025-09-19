import { initializeApp } from 'firebase/app';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Configuration Firebase - Projet sublimaroc-580d3
const firebaseConfig = {
  apiKey: "AIzaSyDrW7B89NWD8UuTLmmnIfm90UFwh1hTN70",
  authDomain: "sublimaroc-580d3.firebaseapp.com",
  projectId: "sublimaroc-580d3",
  storageBucket: "sublimaroc-580d3.firebasestorage.app",
  messagingSenderId: "1012770836582",
  appId: "1:1012770836582:web:07fdd39bf924b91fd51da7",
  measurementId: "G-PVXFTHK673"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser les services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Forcer le mode en ligne pour résoudre les problèmes de connexion
try {
  enableNetwork(db);
} catch (networkError) {
  console.error('❌ Erreur lors de l\'activation du mode en ligne:', networkError);
}

export default app;




