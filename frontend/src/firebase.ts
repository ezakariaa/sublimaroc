/**
 * SUBLIMAROC - Initialisation Firebase
 *
 * Les valeurs sont lues depuis les variables d'environnement (frontend/.env),
 * avec repli sur la configuration du projet sublimaroc-580d3.
 * Ces clés sont publiques par nature : la sécurité repose sur les règles
 * Firestore/Storage, pas sur le secret de la clé API.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || 'AIzaSyDrW7B89NWD8UuTLmmnIfm90UFwh1hTN70',
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN        || 'sublimaroc-580d3.firebaseapp.com',
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || 'sublimaroc-580d3',
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || 'sublimaroc-580d3.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '1012770836582',
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || '1:1012770836582:web:07fdd39bf924b91fd51da7',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
