import admin from 'firebase-admin';
import { Product, SubProduct } from '../types';

// Initialiser Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

export class ProductService {
  private static collection = 'products';

  static async getAllProducts(): Promise<Product[]> {
    try {
      const snapshot = await db.collection(this.collection)
        .orderBy('dateCreation', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateCreation: doc.data().dateCreation?.toDate() || new Date(),
        dateModification: doc.data().dateModification?.toDate() || new Date(),
      })) as Product[];
    } catch (error) {
      console.error('Erreur lors de la récupération des produits:', error);
      throw new Error('Impossible de récupérer les produits');
    }
  }

  static async getProductById(id: string): Promise<Product | null> {
    try {
      const doc = await db.collection(this.collection).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dateCreation: data?.dateCreation?.toDate() || new Date(),
        dateModification: data?.dateModification?.toDate() || new Date(),
      } as Product;
    } catch (error) {
      console.error('Erreur lors de la récupération du produit:', error);
      throw new Error('Impossible de récupérer le produit');
    }
  }

  static async createProduct(product: Omit<Product, 'id' | 'dateCreation' | 'dateModification'>): Promise<string> {
    try {
      const now = admin.firestore.Timestamp.now();
      const docRef = await db.collection(this.collection).add({
        ...product,
        dateCreation: now,
        dateModification: now,
      });
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la création du produit:', error);
      throw new Error('Impossible de créer le produit');
    }
  }

  static async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    try {
      await db.collection(this.collection).doc(id).update({
        ...product,
        dateModification: admin.firestore.Timestamp.now(),
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
      throw new Error('Impossible de mettre à jour le produit');
    }
  }

  static async deleteProduct(id: string): Promise<void> {
    try {
      await db.collection(this.collection).doc(id).delete();
    } catch (error) {
      console.error('Erreur lors de la suppression du produit:', error);
      throw new Error('Impossible de supprimer le produit');
    }
  }
}

export class SubProductService {
  private static collection = 'subProducts';

  static async getSubProductsByProductId(productId: string): Promise<SubProduct[]> {
    try {
      const snapshot = await db.collection(this.collection)
        .where('productId', '==', productId)
        .orderBy('dateCreation', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateCreation: doc.data().dateCreation?.toDate() || new Date(),
        dateModification: doc.data().dateModification?.toDate() || new Date(),
      })) as SubProduct[];
    } catch (error) {
      console.error('Erreur lors de la récupération des sous-produits:', error);
      throw new Error('Impossible de récupérer les sous-produits');
    }
  }

  static async createSubProduct(subProduct: Omit<SubProduct, 'id' | 'dateCreation' | 'dateModification'>): Promise<string> {
    try {
      const now = admin.firestore.Timestamp.now();
      const docRef = await db.collection(this.collection).add({
        ...subProduct,
        dateCreation: now,
        dateModification: now,
      });
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la création du sous-produit:', error);
      throw new Error('Impossible de créer le sous-produit');
    }
  }

  static async updateSubProduct(id: string, subProduct: Partial<SubProduct>): Promise<void> {
    try {
      await db.collection(this.collection).doc(id).update({
        ...subProduct,
        dateModification: admin.firestore.Timestamp.now(),
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du sous-produit:', error);
      throw new Error('Impossible de mettre à jour le sous-produit');
    }
  }

  static async deleteSubProduct(id: string): Promise<void> {
    try {
      await db.collection(this.collection).doc(id).delete();
    } catch (error) {
      console.error('Erreur lors de la suppression du sous-produit:', error);
      throw new Error('Impossible de supprimer le sous-produit');
    }
  }
}




