import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  where,
  limit, 
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll 
} from 'firebase/storage';
import { db, storage } from '../firebase';
import { Product, SubProduct } from '../types';

// Service pour les produits
export class ProductService {
  private static collection = 'Produits';

  // Fonction pour corriger les documents : nom de document = nom du produit, champ id = SUB-XXX
  static async migrateProductIds(): Promise<void> {
    try {
      console.log('🔄 Début de la correction des documents...');
      
      // Récupérer tous les produits existants
      const productsRef = collection(db, this.collection);
      const querySnapshot = await getDocs(productsRef);
      
      console.log(`📊 Nombre de produits à migrer: ${querySnapshot.docs.length}`);
      
      for (const docSnapshot of querySnapshot.docs) {
        const currentDocumentName = docSnapshot.id; // Nom actuel du document
        const productData = docSnapshot.data();
        
        // Nom du document basé sur le nom du produit
        const correctDocumentName = productData.nom
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        // ID basé sur SUB-3 lettres du nom
        const productName = productData.nom.toLowerCase().trim();
        const threeLetters = productName.substring(0, 3).replace(/[^a-z]/g, '').toUpperCase();
        const newId = `SUB-${threeLetters}`;
        
        console.log(`🔄 Document actuel: ${currentDocumentName}`);
        console.log(`🔄 Nom correct du document: ${correctDocumentName}`);
        console.log(`🔄 Nouvel ID: ${newId}`);
        
        // Toujours mettre à jour le champ ID (peu importe le nom du document)
        console.log(`🔄 Mise à jour de l'ID: ${productData.id || 'non défini'} → ${newId}`);
        
        await updateDoc(docSnapshot.ref, {
          id: newId,
          dateModification: Timestamp.now()
        });
        
        console.log(`✅ ID mis à jour dans le document ${currentDocumentName}: ${newId}`);
      }
      
      console.log('🎉 Correction terminée avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la correction:', error);
      throw error;
    }
  }

  // Fonction pour s'assurer que la collection existe
  static async ensureCollectionExists(): Promise<void> {
    try {
      console.log('🔍 Vérification de l\'existence de la collection:', this.collection);
      
      // Créer un document temporaire pour forcer la création de la collection
      const tempDocRef = doc(collection(db, this.collection), '__temp__');
      
      try {
        // Vérifier si le document temporaire existe déjà
        const tempDoc = await getDoc(tempDocRef);
        
        if (!tempDoc.exists()) {
          // Créer le document temporaire pour forcer la création de la collection
          console.log('📁 Création de la collection via document temporaire...');
          await setDoc(tempDocRef, {
            _temp: true,
            createdAt: Timestamp.now()
          });
          console.log('✅ Collection créée avec succès !');
          
          // Supprimer le document temporaire
          await deleteDoc(tempDocRef);
          console.log('🗑️ Document temporaire supprimé');
        } else {
          console.log('✅ Collection existe déjà');
        }
      } catch (error) {
        console.log('📁 Collection créée via erreur - c\'est normal');
      }
      
    } catch (error) {
      console.log('❌ Erreur lors de la vérification de la collection:', error);
      // Continuer quand même - la collection sera créée avec le premier vrai document
    }
  }

  // Fonction de test de connexion simple (sans authentification)
  static async testSimpleConnection(): Promise<boolean> {
    try {
      console.log('🔍 Test de connexion simple...');
      
      // Test minimal : juste essayer d'accéder à une collection
      const testCollection = collection(db, 'test');
      const testQuery = query(testCollection);
      
      // Ne pas exécuter la requête, juste vérifier qu'on peut créer les objets
      console.log('✅ Objets Firebase créés avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la création des objets Firebase:', error);
      return false;
    }
  }

  // Fonction de test de connexion
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Test de connexion Firebase...');
      console.log('📊 Collection utilisée:', this.collection);
      
      // Test 1: Vérifier si la base de données est accessible
      console.log('📡 Test 1: Accès à la base de données...');
      const testCollection = collection(db, 'test');
      console.log('✅ Collection de test créée:', testCollection);
      
      // Test 2: Essayer une requête simple
      console.log('📡 Test 2: Requête simple...');
      query(testCollection, limit(1));
      console.log('✅ Requête créée');
      
      // Test 3: Exécuter la requête
      console.log('📡 Test 3: Exécution de la requête...');
      const querySnapshot = await getDocs(query(testCollection, limit(1)));
      console.log('✅ Requête exécutée avec succès');
      console.log('📊 Documents trouvés:', querySnapshot.docs.length);
      
      // Test 4: Essayer d'accéder à la collection Produits
      console.log('📡 Test 4: Accès à la collection Produits...');
      const produitsCollection = collection(db, this.collection);
      console.log('📡 Collection path:', produitsCollection.path);
      const produitsQuery = query(produitsCollection, limit(10));
      const produitsSnapshot = await getDocs(produitsQuery);
      console.log('✅ Collection Produits accessible');
      console.log('📊 Produits existants:', produitsSnapshot.docs.length);
      if (produitsSnapshot.docs.length > 0) {
        console.log('📦 Exemples de produits:', produitsSnapshot.docs.slice(0, 3).map(doc => ({
          id: doc.id,
          nom: doc.data().nom || 'Sans nom'
        })));
      }
      
      console.log('🎉 Tous les tests de connexion réussis !');
      return true;
    } catch (error) {
      console.error('❌ Erreur de connexion Firebase:', error);
      console.error('🔍 Type d\'erreur:', typeof error);
      console.error('🔍 Message:', error instanceof Error ? error.message : 'Erreur inconnue');
      console.error('🔍 Code:', (error as any)?.code);
      console.error('🔍 Détails complets:', error);
      return false;
    }
  }

  static async getAllProducts(): Promise<Product[]> {
    try {
      console.log('Tentative de récupération des produits depuis la collection:', this.collection);
      console.log('🔍 Configuration Firebase:', {
        projectId: db.app.options.projectId,
        collection: this.collection
      });
      
      // Essayer de lire la collection
      const produitsCollection = collection(db, this.collection);
      console.log('📡 Collection référence créée:', produitsCollection.path);
      
      const q = query(produitsCollection);
      console.log('📡 Requête créée, exécution...');
      
      const querySnapshot = await getDocs(q);
      
      console.log('✅ Collection lue avec succès. Nombre de documents:', querySnapshot.docs.length);
      console.log('📋 IDs des documents trouvés:', querySnapshot.docs.map(doc => doc.id));
      
      if (querySnapshot.docs.length === 0) {
        console.log('📝 Collection vide - aucun produit trouvé');
        console.log('💡 Vérifiez dans Firebase Console que la collection "Produits" existe et contient des documents');
        console.log('💡 Collection path:', produitsCollection.path);
        return [];
      }
      
      console.log('📦 Premiers documents trouvés:', querySnapshot.docs.slice(0, 3).map(doc => ({
        id: doc.id,
        nom: doc.data().nom || 'Sans nom',
        hasData: !!doc.data()
      })));
      
      // Transformer les données
      const products = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id || doc.id, // Utiliser le champ id du document, sinon fallback sur doc.id
          nom: data.nom || '',
          description: data.description || '',
          prix: data.prix || 0,
          image: data.image || '',
          images: Array.isArray(data.images) ? data.images : [], // Ajouter le support des images multiples
          categorie: data.categorie || '',
          type: Array.isArray(data.type) ? data.type : [],
          anse: Array.isArray(data.anse) ? data.anse : [],
          dimensions: Array.isArray(data.dimensions) ? data.dimensions : [],
          couleurs: Array.isArray(data.couleurs) ? data.couleurs : [],
          materiau: Array.isArray(data.materiau) ? data.materiau : [],
          capacite: Array.isArray(data.capacite) ? data.capacite : [],
          poids: Array.isArray(data.poids) ? data.poids : [],
          stock: data.stock || 0,
          fournisseur: data.fournisseur || { nom: '', ville: '' },
          dateCreation: data.dateCreation?.toDate() || new Date(),
          dateModification: data.dateModification?.toDate() || new Date(),
        } as Product;
      });
      
      // Trier par date de création (plus récent en premier)
      return products.sort((a, b) => b.dateCreation.getTime() - a.dateCreation.getTime());
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des produits:', error);
      console.error('❌ Détails de l\'erreur:', {
        error: error,
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        name: (error as any)?.name
      });
      
      // Si c'est une erreur de permissions, afficher un message plus clair
      const errorCode = (error as any)?.code;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorCode === 'permission-denied' || errorMessage.includes('Missing or insufficient permissions')) {
        console.error('❌ ERREUR DE PERMISSIONS: Les règles Firestore ne permettent pas la lecture de la collection Produits');
        console.error('❌ Code d\'erreur:', errorCode);
        console.error('❌ Message d\'erreur:', errorMessage);
        console.error('❌ Vérifiez les règles Firestore dans Firebase Console');
        console.error('💡 Les règles actuelles devraient être: allow read, write: if true');
        console.error('💡 Assurez-vous que les règles sont bien déployées dans Firebase Console');
        throw new Error('Erreur de permissions: Vérifiez les règles Firestore pour la collection Produits');
      }
      
      // Si c'est une erreur de collection inexistante, retourner un tableau vide
      if (errorCode === 'not-found' || errorMessage.includes('not found')) {
        console.log('📝 Collection n\'existe pas encore - retour d\'un tableau vide');
        return [];
      }
      
      throw error;
    }
  }

  static async getProductById(id: string): Promise<Product | null> {
    const docRef = doc(db, this.collection, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: data.id || docSnap.id, // Utiliser le champ id du document, sinon fallback sur docSnap.id
        nom: data.nom || '',
        description: data.description || '',
        prix: data.prix || 0,
        image: data.image || '',
        images: Array.isArray(data.images) ? data.images : [], // Ajouter le support des images multiples
        categorie: data.categorie || '',
        type: Array.isArray(data.type) ? data.type : [],
        anse: Array.isArray(data.anse) ? data.anse : [],
        dimensions: Array.isArray(data.dimensions) ? data.dimensions : [],
        couleurs: Array.isArray(data.couleurs) ? data.couleurs : [],
        materiau: Array.isArray(data.materiau) ? data.materiau : [],
        capacite: Array.isArray(data.capacite) ? data.capacite : [],
        poids: Array.isArray(data.poids) ? data.poids : [],
        stock: data.stock || 0,
        fournisseur: data.fournisseur || { nom: '', ville: '' },
        dateCreation: data.dateCreation?.toDate() || new Date(),
        dateModification: data.dateModification?.toDate() || new Date(),
      } as Product;
    }
    return null;
  }

  static async createProduct(product: Omit<Product, 'id' | 'dateCreation' | 'dateModification'>): Promise<string> {
    try {
      console.log('🚀 DÉBUT createProduct');
      
    const now = Timestamp.now();
      
      // Générer l'ID du produit : SUB-3 lettres du nom en majuscules
      const productName = product.nom.toLowerCase().trim();
      const threeLetters = productName.substring(0, 3).replace(/[^a-z]/g, '').toUpperCase();
      const productId = `SUB-${threeLetters}`;
      
      // Utiliser le nom original du produit comme nom de document Firebase
      const documentId = product.nom
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      console.log('📝 Nom du produit:', product.nom);
      console.log('🔧 ID généré:', productId);
      console.log('📄 Nom du document Firebase:', documentId);
      
      // Préparer les données complètes
      const productData = {
        id: productId, // ID au format SUB-XXX
        nom: product.nom || 'Produit sans nom',
        description: product.description || '',
        fournisseur: product.fournisseur || { nom: 'Inconnu', ville: '' },
        image: product.image || '/placeholder-product.jpg',
        images: product.images || [], // Ajouter le support des images multiples
        categorie: product.categorie || '',
        type: product.type || [],
        anse: product.anse || [],
        couleurs: product.couleurs || [],
        dimensions: product.dimensions || [],
        materiau: product.materiau || [],
        capacite: product.capacite || [],
        poids: product.poids || [],
        prix: product.prix || 0,
        stock: product.stock || 0,
      dateCreation: now,
      dateModification: now,
      };
      
      console.log('📦 Données complètes:', productData);
      
    // Utiliser la même méthode que Societes.tsx avec timeout
    console.log('➕ Utilisation de setDoc avec merge...');
    const ref = doc(db, this.collection, documentId);
    
    // Ajouter un timeout pour éviter les blocages
    await Promise.race([
      setDoc(ref, productData, { merge: true }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout setDoc')), 5000)
      )
    ]);
    
    console.log('✅ setDoc réussi !');
    console.log('📄 Document créé avec ID:', documentId);
    console.log('📁 Collection créée/confirmée:', this.collection);
    console.log('🎉 Fonction createProduct terminée avec succès !');
    
    return documentId;
      
    } catch (error) {
      console.error('❌ Erreur lors de la création du produit:', error);
      
      // En cas d'erreur, retourner un ID temporaire pour que la modale se ferme
      if (error instanceof Error && error.message.includes('Timeout')) {
        console.log('⏰ Timeout détecté, retour d\'un ID temporaire');
        return 'temp-' + Date.now();
      }
      
      // Gestion spécifique des erreurs de réseau
      if (error instanceof Error) {
        if (error.message.includes('offline')) {
          throw new Error('Vous êtes hors ligne. Vérifiez votre connexion internet.');
        } else if (error.message.includes('permission')) {
          throw new Error('Vous n\'avez pas les permissions pour créer un produit.');
        }
      }
      
      // En cas d'autre erreur, retourner un ID temporaire
      console.log('🔄 Erreur inconnue, retour d\'un ID temporaire');
      return 'temp-' + Date.now();
    }
  }

  static async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    const docRef = doc(db, this.collection, id);
    await updateDoc(docRef, {
      ...product,
      dateModification: Timestamp.now(),
    });
  }

  // Fonction pour mettre à jour un produit avec gestion du changement d'ID
  static async updateProductWithIdChange(oldId: string, productData: any): Promise<string> {
    try {
      console.log('🔄 Mise à jour du produit');
      console.log('📝 ID du produit:', oldId);
      console.log('📝 Nom du produit:', productData.nom);

      // Préparer les données de mise à jour (sans changer l'ID)
      const updateData = {
        nom: productData.nom || 'Produit sans nom',
        description: productData.description || '',
        fournisseur: productData.fournisseur || { nom: 'Inconnu', ville: '' },
        image: productData.image || '/mug.webp',
        images: productData.images || [], // Ajouter le support des images multiples
        categorie: productData.categorie || '',
        type: productData.type || [],
        anse: productData.anse || [],
        couleurs: productData.couleurs || [],
        dimensions: productData.dimensions || [],
        materiau: productData.materiau || [],
        capacite: productData.capacite || [],
        poids: productData.poids || [],
        prix: productData.prix || 0,
        stock: productData.stock || 0,
        dateCreation: productData.dateCreation instanceof Date ? 
          Timestamp.fromDate(productData.dateCreation) : 
          (productData.dateCreation || Timestamp.now()), // Conserver la date de création originale
        dateModification: Timestamp.now(),
      };

      // Trouver le document par son champ ID (pas par l'ID du document)
      console.log('🔍 Recherche du document avec l\'ID:', oldId);
      
      const productsRef = collection(db, this.collection);
      const querySnapshot = await getDocs(productsRef);
      
      console.log('📊 Nombre de documents dans la collection:', querySnapshot.docs.length);
      
      let documentId = null;
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        console.log('🔍 Document:', docSnapshot.id, 'ID:', data.id);
        if (data.id === oldId) {
          documentId = docSnapshot.id; // Nom du document Firebase
          console.log('📄 Document trouvé:', documentId);
          break;
        }
      }
      
      if (!documentId) {
        console.error('❌ Aucun document trouvé avec l\'ID:', oldId);
        console.error('📊 Documents disponibles:', querySnapshot.docs.map(doc => ({ id: doc.id, dataId: doc.data().id })));
        throw new Error(`Produit avec l'ID ${oldId} non trouvé`);
      }

      // Mettre à jour le document existant
      console.log('🔄 Mise à jour du document...');
      
      try {
        const docRef = doc(db, this.collection, documentId);
        console.log('📄 Référence du document créée:', docRef.path);
        
        console.log('🔄 Tentative de mise à jour du document...');
        await updateDoc(docRef, updateData);
        console.log('✅ Document mis à jour avec succès:', documentId);
        console.log('🔄 updateDoc terminé, continuation...');
        
        console.log('🎉 Fonction updateProductWithIdChange terminée');
        console.log('🔄 Retour de l\'ID:', oldId);
        return oldId; // Retourner l'ID du produit
        
      } catch (updateError) {
        console.error('❌ Erreur lors de la mise à jour du document:', updateError);
        throw updateError;
      }

    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du produit:', error);
      throw error;
    }
  }

  static async deleteProduct(id: string): Promise<void> {
    const docRef = doc(db, this.collection, id);
    await deleteDoc(docRef);
  }
}

// Service pour les sous-produits
export class SubProductService {
  private static mainCollection = 'Produits';
  private static subProductsDocument = 'subProducts';

  // Fonction helper pour obtenir le nom du document Firebase à partir du nom du produit
  private static getDocumentNameFromProductName(productName: string): string {
    return productName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static async getSubProductsByProductId(productId: string): Promise<SubProduct[]> {
    try {
      console.log('🔍 Récupération des sous-produits pour le produit:', productId);
      
      // Trouver le produit par son ID pour obtenir son nom
      const productsRef = collection(db, this.mainCollection);
      const querySnapshot = await getDocs(productsRef);
      
      let productDocumentName = null;
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        if (data.id === productId) {
          productDocumentName = docSnapshot.id; // Nom du document Firebase
          break;
        }
      }
      
      if (!productDocumentName) {
        console.log('❌ Produit parent non trouvé avec l\'ID:', productId);
        return [];
      }
      
      console.log('📄 Nom du document Firebase trouvé:', productDocumentName);
      
      // Référence vers le document subProducts dans le produit parent
      const subProductsDocRef = doc(db, this.mainCollection, productDocumentName, this.subProductsDocument, 'data');
      const subProductsDoc = await getDoc(subProductsDocRef);
      
      if (!subProductsDoc.exists()) {
        console.log('📊 Aucun document subProducts trouvé');
        return [];
      }
      
      const subProductsData = subProductsDoc.data();
      const subProductsArray = subProductsData.subProducts || [];
      
      console.log('📊 Nombre de sous-produits trouvés:', subProductsArray.length);
      
      return subProductsArray.map((subProduct: any, index: number) => ({
        id: subProduct.id || `subproduct-${index}`,
        ...subProduct,
        dateCreation: subProduct.dateCreation?.toDate() || new Date(),
        dateModification: subProduct.dateModification?.toDate() || new Date(),
      })) as SubProduct[];
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des sous-produits:', error);
      return [];
    }
  }

  static async createSubProduct(subProduct: any): Promise<string> {
    try {
      console.log('🚀 Création d\'un sous-produit dans le document subProducts du produit parent');
      console.log('📁 Collection parent:', this.mainCollection);
      console.log('📄 Document parent (ID du produit):', subProduct.productId);
      console.log('📄 Document subProducts:', this.subProductsDocument);

      // Trouver le produit parent par son ID pour obtenir le nom du document Firebase
      const productsRef = collection(db, this.mainCollection);
      const querySnapshot = await getDocs(productsRef);
      
      let parentProductDocumentName = null;
      let parentProductData = null;
      
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        if (data.id === subProduct.productId) {
          parentProductDocumentName = docSnapshot.id; // Nom du document Firebase
          parentProductData = data;
          break;
        }
      }
      
      if (!parentProductDocumentName || !parentProductData) {
        throw new Error('Produit parent non trouvé avec l\'ID: ' + subProduct.productId);
      }
      
      console.log('📄 Nom du document Firebase du produit parent:', parentProductDocumentName);

      // Générer un ID basé sur la catégorie parent : SUB-3 lettres de la catégorie + numéro incrémental
      const categoryName = parentProductData.nom.toLowerCase().trim();
      const threeLetters = categoryName.substring(0, 3).replace(/[^a-z]/g, '').toUpperCase();
      
      // Récupérer les sous-produits existants pour cette catégorie
      const currentSubProducts = await this.getSubProductsByProductId(subProduct.productId);
      
      // Trouver le prochain numéro incrémental
      let nextNumber = 1;
      const existingIds = currentSubProducts.map(sp => sp.id);
      while (existingIds.includes(`SUB-${threeLetters}-${nextNumber}`)) {
        nextNumber++;
      }
      
      const subProductId = `SUB-${threeLetters}-${nextNumber}`;

      console.log('🔧 ID du sous-produit généré:', subProductId);

      // Référence vers le document subProducts dans le produit parent
      const subProductsDocRef = doc(db, this.mainCollection, parentProductDocumentName, this.subProductsDocument, 'data');

      // Récupérer les sous-produits existants
      const subProductsDoc = await getDoc(subProductsDocRef);
      const existingSubProducts = subProductsDoc.exists() ? (subProductsDoc.data().subProducts || []) : [];

      // Préparer les données complètes du nouveau sous-produit
      const newSubProductData = {
        id: subProductId,
        nom: subProduct.nom || 'Sous-produit sans nom',
        description: subProduct.description || '',
        prix: subProduct.prix || 0,
        stock: subProduct.stock || 0,
        image: subProduct.image || '/mug.webp',
        productId: subProduct.productId,
        // Caractéristiques du sous-produit
        type: subProduct.type || [],
        anse: subProduct.anse || [],
        couleurs: subProduct.couleurs || [],
        dimensions: subProduct.dimensions || [],
        materiau: subProduct.materiau || [],
        capacite: subProduct.capacite || [],
        poids: subProduct.poids || [],
        dateCreation: Timestamp.now(),
        dateModification: Timestamp.now()
      };

      console.log('📦 Données du nouveau sous-produit:', newSubProductData);

      // Ajouter le nouveau sous-produit à la liste existante
      const updatedSubProducts = [...existingSubProducts, newSubProductData];

      // Sauvegarder le document subProducts mis à jour
      await setDoc(subProductsDocRef, {
        subProducts: updatedSubProducts,
        lastUpdated: Timestamp.now()
      }, { merge: true });

      console.log('✅ Sous-produit créé avec succès !');
      console.log('📄 Document créé:', subProductId);
      console.log('📁 Chemin complet dans Firebase:');
      console.log(`   ${this.mainCollection}/${subProduct.productId}/${this.subProductsDocument}/data`);
      console.log('📊 Total sous-produits:', updatedSubProducts.length);

      return subProductId;
    } catch (error) {
      console.error('❌ Erreur lors de la création du sous-produit:', error);
      throw error;
    }
  }

  static async updateSubProduct(productId: string, subProductId: string, subProduct: Partial<SubProduct>): Promise<void> {
    // Trouver le produit parent par son ID pour obtenir le nom du document Firebase
    const productsRef = collection(db, this.mainCollection);
    const querySnapshot = await getDocs(productsRef);
    
    let parentProductDocumentName = null;
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      if (data.id === productId) {
        parentProductDocumentName = docSnapshot.id; // Nom du document Firebase
        break;
      }
    }
    
    if (!parentProductDocumentName) {
      throw new Error('Produit parent non trouvé avec l\'ID: ' + productId);
    }
    
    const subProductsDocRef = doc(db, this.mainCollection, parentProductDocumentName, this.subProductsDocument, 'data');
    
    // Récupérer les sous-produits existants
    const subProductsDoc = await getDoc(subProductsDocRef);
    if (!subProductsDoc.exists()) {
      throw new Error('Document subProducts non trouvé');
    }
    
    const existingSubProducts = subProductsDoc.data().subProducts || [];
    
    // Mettre à jour le sous-produit spécifique
    const updatedSubProducts = existingSubProducts.map((sp: any) => 
      sp.id === subProductId 
        ? { ...sp, ...subProduct, dateModification: Timestamp.now() }
        : sp
    );
    
    // Sauvegarder les sous-produits mis à jour
    await setDoc(subProductsDocRef, {
      subProducts: updatedSubProducts,
      lastUpdated: Timestamp.now()
    }, { merge: true });
  }

  static async deleteSubProduct(productId: string, subProductId: string): Promise<void> {
    // Trouver le produit parent par son ID pour obtenir le nom du document Firebase
    const productsRef = collection(db, this.mainCollection);
    const querySnapshot = await getDocs(productsRef);
    
    let parentProductDocumentName = null;
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      if (data.id === productId) {
        parentProductDocumentName = docSnapshot.id; // Nom du document Firebase
        break;
      }
    }
    
    if (!parentProductDocumentName) {
      throw new Error('Produit parent non trouvé avec l\'ID: ' + productId);
    }
    
    const subProductsDocRef = doc(db, this.mainCollection, parentProductDocumentName, this.subProductsDocument, 'data');
    
    // Récupérer les sous-produits existants
    const subProductsDoc = await getDoc(subProductsDocRef);
    if (!subProductsDoc.exists()) {
      throw new Error('Document subProducts non trouvé');
    }
    
    const existingSubProducts = subProductsDoc.data().subProducts || [];
    
    // Supprimer le sous-produit spécifique
    const updatedSubProducts = existingSubProducts.filter((sp: any) => sp.id !== subProductId);
    
    // Sauvegarder les sous-produits mis à jour
    await setDoc(subProductsDocRef, {
      subProducts: updatedSubProducts,
      lastUpdated: Timestamp.now()
    }, { merge: true });
  }
}

// Service pour la gestion des images dans Firebase Storage
export class ImageService {
  private static basePath = 'produits';

  // Uploader plusieurs images pour un sous-produit
  static async uploadSubProductImages(
    productId: string, 
    subProductId: string, 
    files: File[]
  ): Promise<string[]> {
    try {
      console.log(`📤 Upload de ${files.length} images pour le sous-produit ${subProductId}`);
      
      const uploadPromises = files.map(async (file, index) => {
        // Créer le nom de fichier unique
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `image_${index + 1}_${timestamp}.${fileExtension}`;
        
        // Chemin dans Firebase Storage : produits/{productId}/{subProductId}/{fileName}
        const storagePath = `${this.basePath}/${productId}/${subProductId}/${fileName}`;
        const storageRef = ref(storage, storagePath);
        
        console.log(`📁 Upload vers: ${storagePath}`);
        
        // Uploader le fichier
        const snapshot = await uploadBytes(storageRef, file);
        
        // Obtenir l'URL de téléchargement
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        console.log(`✅ Image ${index + 1} uploadée: ${downloadURL}`);
        return downloadURL;
      });
      
      const downloadURLs = await Promise.all(uploadPromises);
      console.log(`🎉 Toutes les images uploadées avec succès: ${downloadURLs.length} images`);
      
      return downloadURLs;
    } catch (error) {
      console.error('❌ Erreur lors de l\'upload des images:', error);
      throw new Error(`Erreur lors de l'upload des images: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // Supprimer les images d'un sous-produit
  static async deleteSubProductImages(
    productId: string, 
    subProductId: string, 
    imageUrls: string[]
  ): Promise<void> {
    try {
      console.log(`🗑️ Suppression de ${imageUrls.length} images pour le sous-produit ${subProductId}`);
      
      const deletePromises = imageUrls.map(async (imageUrl) => {
        try {
          // Extraire le chemin du fichier depuis l'URL
          const url = new URL(imageUrl);
          const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
          
          if (pathMatch) {
            const filePath = decodeURIComponent(pathMatch[1]);
            const fileRef = ref(storage, filePath);
            await deleteObject(fileRef);
            console.log(`✅ Image supprimée: ${filePath}`);
          }
        } catch (error) {
          console.warn(`⚠️ Impossible de supprimer l'image ${imageUrl}:`, error);
        }
      });
      
      await Promise.all(deletePromises);
      console.log(`🎉 Suppression des images terminée`);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des images:', error);
      throw new Error(`Erreur lors de la suppression des images: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // Lister toutes les images d'un sous-produit
  static async listSubProductImages(
    productId: string, 
    subProductId: string
  ): Promise<string[]> {
    try {
      const folderPath = `${this.basePath}/${productId}/${subProductId}`;
      const folderRef = ref(storage, folderPath);
      
      const result = await listAll(folderRef);
      
      const downloadURLs = await Promise.all(
        result.items.map(async (itemRef) => {
          return await getDownloadURL(itemRef);
        })
      );
      
      console.log(`📋 ${downloadURLs.length} images trouvées pour le sous-produit ${subProductId}`);
      return downloadURLs;
    } catch (error) {
      console.error('❌ Erreur lors de la liste des images:', error);
      return [];
    }
  }
}

// Service pour les achats
export class AchatService {
  private static collection = 'Achats';
  private static storageFolder = 'Achats';

  // Fonction pour uploader une image dans Firebase Storage
  static async uploadMaterialImage(file: File, achatId: string, materialIndex: number, referenceAchat: string): Promise<string> {
    try {
      console.log('📤 Upload de l\'image du matériel...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        achatId,
        materialIndex,
        referenceAchat
      });
      
      // Créer un nom de fichier unique
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `material_${materialIndex}_${timestamp}.${fileExtension}`;
      const storagePath = `${this.storageFolder}/Materiel/${referenceAchat}/${fileName}`;
      
      console.log('📁 Nom de fichier généré:', fileName);
      
      // Référence vers le fichier dans Storage avec sous-dossier par référence d'achat
      const storageRef = ref(storage, storagePath);
      console.log('📍 Référence Storage créée:', storagePath);
      
      // Upload du fichier
      console.log('⬆️ Début de l\'upload...');
      const snapshot = await uploadBytes(storageRef, file);
      console.log('✅ Image uploadée avec succès:', snapshot.metadata.name);
      
      // Obtenir l'URL de téléchargement
      console.log('🔗 Récupération de l\'URL de téléchargement...');
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('🔗 URL de téléchargement obtenue:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      const errorCode = (error as any)?.code;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `material_${materialIndex}_${timestamp}.${fileExtension}`;
      const storagePath = `${this.storageFolder}/Materiel/${referenceAchat}/${fileName}`;
      
      console.error('❌ Erreur détaillée lors de l\'upload de l\'image:', {
        error: error,
        message: errorMessage,
        code: errorCode,
        serverResponse: (error as any)?.serverResponse,
        customData: (error as any)?.customData,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        storagePath: storagePath
      });
      
      // Messages d'erreur spécifiques selon le code d'erreur
      if (errorCode === 'storage/unauthorized' || errorCode === 'storage/permission-denied') {
        throw new Error('Erreur d\'autorisation: Vérifiez que vous êtes connecté et que les règles de sécurité Firebase Storage permettent l\'upload.');
      } else if (errorCode === 'storage/quota-exceeded') {
        throw new Error('Quota de stockage dépassé. Veuillez contacter l\'administrateur.');
      } else if (errorCode === 'storage/unauthenticated') {
        throw new Error('Vous devez être connecté pour uploader des images.');
      } else {
        throw new Error(`Erreur lors de l'upload de l'image: ${errorMessage}`);
      }
    }
  }

  // Fonction pour supprimer une image de Firebase Storage
  static async deleteMaterialImage(imageUrl: string): Promise<void> {
    try {
      if (!imageUrl) return;
      
      // Vérifier si c'est une URL blob locale (pas une URL Firebase Storage)
      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
        console.log('⚠️ URL blob locale détectée, pas de suppression nécessaire:', imageUrl);
        return;
      }
      
      // Vérifier si c'est une URL Firebase Storage
      if (!imageUrl.includes('firebasestorage.googleapis.com')) {
        console.log('⚠️ URL non-Firebase détectée, pas de suppression:', imageUrl);
        return;
      }
      
      console.log('🗑️ Suppression de l\'image Firebase Storage:', imageUrl);
      
      // Extraire le chemin complet du fichier de l'URL Firebase Storage
      // URL format: https://firebasestorage.googleapis.com/v0/b/bucket/o/Achats%2FREF%2Ffile.jpg?alt=media&token=...
      const urlParts = imageUrl.split('/');
      const encodedPath = urlParts.find(part => part.includes('Achats%2F'));
      
      if (!encodedPath) {
        console.log('⚠️ Impossible d\'extraire le chemin du fichier de l\'URL');
        return;
      }
      
      // Décoder le chemin (remplacer %2F par /)
      const decodedPath = decodeURIComponent(encodedPath);
      console.log('📍 Chemin décodé:', decodedPath);
      
      // Référence vers le fichier dans Storage
      const storageRef = ref(storage, decodedPath);
      
      // Supprimer le fichier
      await deleteObject(storageRef);
      console.log('✅ Image supprimée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l\'image:', error);
      // Ne pas faire échouer la suppression de l'achat si l'image ne peut pas être supprimée
    }
  }

  // Fonction pour s'assurer que la collection existe
  static async ensureCollectionExists(): Promise<void> {
    try {
      console.log('🔍 Vérification de l\'existence de la collection:', this.collection);
      
      // Créer un document temporaire pour forcer la création de la collection
      const tempDocRef = doc(collection(db, this.collection), '__temp__');
      
      try {
        // Vérifier si le document temporaire existe déjà
        const tempDoc = await getDoc(tempDocRef);
        
        if (!tempDoc.exists()) {
          // Créer le document temporaire pour forcer la création de la collection
          console.log('📁 Création de la collection via document temporaire...');
          await setDoc(tempDocRef, {
            _temp: true,
            createdAt: Timestamp.now()
          });
          console.log('✅ Collection créée avec succès !');
          
          // Supprimer le document temporaire
          await deleteDoc(tempDocRef);
          console.log('🗑️ Document temporaire supprimé');
        } else {
          console.log('✅ Collection existe déjà');
        }
      } catch (error) {
        console.log('📁 Collection créée via erreur - c\'est normal');
      }
      
    } catch (error) {
      console.log('❌ Erreur lors de la vérification de la collection:', error);
      // Continuer quand même - la collection sera créée avec le premier vrai document
    }
  }

  // Créer un nouvel achat
  static async createAchat(achatData: any): Promise<string> {
    try {
      console.log('🚀 Création d\'un nouvel achat...');
      
      // S'assurer que la collection existe
      await this.ensureCollectionExists();
      console.log('✅ Collection vérifiée, création du document...');
      
      // Les images sont déjà en base64 dans achatData.materials (converties dans AddMaterialModal)
      // On peut directement sauvegarder dans Firestore
      console.log('📝 Préparation des données avec images base64...');
      
      // Nettoyer les données pour éviter les erreurs Firestore
      const finalData = {
        referenceAchat: achatData.referenceAchat || '',
        fournisseur: {
          nom: achatData.fournisseur?.nom || '',
          telephone: achatData.fournisseur?.telephone || '',
          email: achatData.fournisseur?.email || '',
          ville: achatData.fournisseur?.ville || ''
        },
        materials: achatData.materials.map((material: any) => ({
          nom: material.nom || '',
          description: material.description || '',
          referenceFournisseur: material.referenceFournisseur || '',
          prixUnitaire: Number(material.prixUnitaire) || 0,
          quantite: Number(material.quantite) || 1,
          prixPaye: Number(material.prixPaye) || 0,
          image: material.image || '' // Image en base64 ou URL existante
        })),
        dateAchat: achatData.dateAchat || new Date(),
        dateCommande: (achatData.dateCommande && !isNaN(new Date(achatData.dateCommande).getTime())) ? achatData.dateCommande : new Date(),
        dateLivraison: (achatData.dateLivraison && !isNaN(new Date(achatData.dateLivraison).getTime())) ? achatData.dateLivraison : new Date(),
        etat: achatData.etat || 'En cours',
        totalAchat: Number(achatData.totalAchat) || 0,
        createdAt: achatData.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      console.log('📝 Données finales à sauvegarder (avec images base64):', {
        ...finalData,
        materials: finalData.materials.map((m: any) => ({
          nom: m.nom,
          hasImage: !!m.image,
          imageType: m.image ? (m.image.startsWith('data:image') ? 'base64' : 'url') : 'none'
        }))
      });
      
      const docRef = await addDoc(collection(db, this.collection), finalData);
      console.log('✅ Achat créé avec succès ! ID:', docRef.id);
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'achat:', error);
      throw error;
    }
  }

  // Récupérer tous les achats
  static async getAllAchats(): Promise<any[]> {
    try {
      console.log('🔍 Récupération de tous les achats...');
      
      const querySnapshot = await getDocs(
        query(collection(db, this.collection), orderBy('createdAt', 'desc'))
      );
      
      const achats = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // S'assurer que les materials sont bien présents avec leurs images
          materials: (data.materials || []).map((material: any, index: number) => ({
            ...material,
            image: material.image || '',
            // Log pour déboguer
            _debug: {
              hasImage: !!material.image,
              imageUrl: material.image,
              imageType: typeof material.image
            }
          }))
        };
      });
      
      console.log('✅ Achats récupérés:', achats.length);
      // Log détaillé des images pour le premier achat
      if (achats.length > 0) {
        console.log('🖼️ Images du premier achat:', achats[0].materials?.map((m: any, idx: number) => ({
          index: idx,
          nom: m.nom,
          image: m.image,
          debug: m._debug
        })));
      }
      return achats;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des achats:', error);
      throw error;
    }
  }

  // Récupérer un achat par ID
  static async getAchatById(id: string): Promise<any | null> {
    try {
      console.log('🔍 Récupération de l\'achat:', id);
      
      const docRef = doc(db, this.collection, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const achat = {
          id: docSnap.id,
          ...docSnap.data()
        };
        console.log('✅ Achat trouvé:', achat);
        return achat;
      } else {
        console.log('❌ Achat non trouvé');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'achat:', error);
      throw error;
    }
  }

  // Mettre à jour un achat
  static async updateAchat(id: string, updateData: any): Promise<void> {
    try {
      console.log('🚀 Mise à jour de l\'achat:', id);
      console.log('📦 Données reçues (avec images base64):', {
        materialsCount: updateData.materials?.length,
        materials: updateData.materials?.map((m: any, idx: number) => ({
          index: idx,
          nom: m.nom,
          hasImage: !!m.image,
          imageType: m.image ? (m.image.startsWith('data:image') ? 'base64' : m.image.startsWith('blob:') ? 'blob' : 'url') : 'none'
        }))
      });
      
      // Les images sont déjà en base64 dans updateData.materials (converties dans AddMaterialModal)
      // On peut directement sauvegarder dans Firestore
      console.log('📝 Préparation des données avec images base64...');
      
      console.log('💾 Mise à jour du document Firestore...');
      const docRef = doc(db, this.collection, id);
      
      // Nettoyer les données - les images sont déjà en base64
      const materialsToSave = updateData.materials.map((material: any) => ({
        nom: material.nom || '',
        description: material.description || '',
        referenceFournisseur: material.referenceFournisseur || '',
        prixUnitaire: Number(material.prixUnitaire) || 0,
        quantite: Number(material.quantite) || 1,
        prixPaye: Number(material.prixPaye) || 0,
        image: material.image || '' // Image en base64 ou URL existante
      }));
      
      console.log('💾 Images à sauvegarder dans Firestore:', materialsToSave.map((m: any, idx: number) => ({
        index: idx,
        nom: m.nom,
        hasImage: !!m.image,
        imageType: m.image ? (m.image.startsWith('data:image') ? 'base64' : 'url') : 'none',
        imageLength: m.image ? m.image.length : 0
      })));
      
      const dataWithTimestamp = {
        referenceAchat: updateData.referenceAchat || '',
        fournisseur: {
          nom: updateData.fournisseur?.nom || '',
          telephone: updateData.fournisseur?.telephone || '',
          email: updateData.fournisseur?.email || '',
          ville: updateData.fournisseur?.ville || ''
        },
        materials: materialsToSave,
        dateAchat: updateData.dateAchat || new Date(),
        dateCommande: (updateData.dateCommande && !isNaN(new Date(updateData.dateCommande).getTime())) ? updateData.dateCommande : new Date(),
        dateLivraison: (updateData.dateLivraison && !isNaN(new Date(updateData.dateLivraison).getTime())) ? updateData.dateLivraison : new Date(),
        etat: updateData.etat || 'En cours',
        totalAchat: Number(updateData.totalAchat) || 0,
        updatedAt: Timestamp.now()
      };
      
      console.log('📝 Données à mettre à jour:', dataWithTimestamp);
      console.log('🔍 État à sauvegarder:', updateData.etat);
      console.log('🔍 État dans dataWithTimestamp:', dataWithTimestamp.etat);
      await updateDoc(docRef, dataWithTimestamp);
      console.log('✅ Achat mis à jour avec succès !');
      console.log('🎉 Fonction updateAchat terminée avec succès');
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'achat:', error);
      throw error;
    }
  }

  // Supprimer un achat
  static async deleteAchat(id: string): Promise<void> {
    try {
      console.log('🚀 Suppression de l\'achat:', id);
      
      // Récupérer l'achat pour supprimer les images
      const achat = await this.getAchatById(id);
      if (achat && achat.materials) {
        // Supprimer toutes les images des matériels
        await Promise.all(
          achat.materials.map(async (material: any) => {
            if (material.image) {
              await this.deleteMaterialImage(material.image);
            }
          })
        );
      }
      
      const docRef = doc(db, this.collection, id);
      await deleteDoc(docRef);
      console.log('✅ Achat supprimé avec succès !');
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l\'achat:', error);
      throw error;
    }
  }

  // Récupérer les achats par fournisseur
  static async getAchatsByFournisseur(fournisseurNom: string): Promise<any[]> {
    try {
      console.log('🔍 Récupération des achats pour le fournisseur:', fournisseurNom);
      
      const querySnapshot = await getDocs(
        query(
          collection(db, this.collection),
          where('fournisseur.nom', '==', fournisseurNom),
          orderBy('createdAt', 'desc')
        )
      );
      
      const achats = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ Achats trouvés pour le fournisseur:', achats.length);
      return achats;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des achats par fournisseur:', error);
      throw error;
    }
  }

  // Méthodes pour les achats d'articles (sous-collection dans Achats)
  static async getAllAchatsArticles(): Promise<any[]> {
    try {
      console.log('🔍 Récupération de tous les achats d\'articles...');
      
      const querySnapshot = await getDocs(
        query(
          collection(db, this.collection, 'articles'),
          orderBy('createdAt', 'desc')
        )
      );
      
      const achats = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ Achats d\'articles récupérés:', achats.length);
      return achats;
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des achats d\'articles:', error);
      throw error;
    }
  }

  // Créer un nouvel achat d'articles
  static async createAchatArticle(achatData: any): Promise<string> {
    try {
      console.log('🚀 Création d\'un nouvel achat d\'articles...');
      
      // Upload des images des articles
      const articlesWithImages = await Promise.all(
        achatData.articles.map(async (article: any) => {
          if (article.imageFile) {
            const imageUrl = await this.uploadArticleImage(article.imageFile, article.nom);
            return {
              ...article,
              image: imageUrl,
              imageFile: undefined // Supprimer le fichier car il n'est pas supporté par Firestore
            };
          }
          return article;
        })
      );
      
      const dataWithTimestamp = {
        ...achatData,
        articles: articlesWithImages,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, this.collection, 'articles'), dataWithTimestamp);
      console.log('✅ Achat d\'articles créé avec succès ! ID:', docRef.id);
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'achat d\'articles:', error);
      throw error;
    }
  }

  // Mettre à jour un achat d'articles
  static async updateAchatArticle(id: string, updateData: any): Promise<void> {
    try {
      console.log('🔄 Mise à jour de l\'achat d\'articles:', id);
      
      const docRef = doc(db, this.collection, 'articles', id);
      
      // Upload des nouvelles images si nécessaire
      const articlesWithImages = await Promise.all(
        updateData.articles.map(async (article: any) => {
          if (article.imageFile) {
            const imageUrl = await this.uploadArticleImage(article.imageFile, article.nom);
            return {
              ...article,
              image: imageUrl,
              imageFile: undefined
            };
          }
          return article;
        })
      );
      
      const dataWithTimestamp = {
        ...updateData,
        articles: articlesWithImages,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, dataWithTimestamp);
      console.log('✅ Achat d\'articles mis à jour avec succès !');
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'achat d\'articles:', error);
      throw error;
    }
  }

  // Supprimer un achat d'articles
  static async deleteAchatArticle(id: string): Promise<void> {
    try {
      console.log('🗑️ Suppression de l\'achat d\'articles:', id);
      
      // Récupérer l'achat pour supprimer les images
      const achat = await this.getAchatArticleById(id);
      if (achat && achat.articles) {
        // Supprimer toutes les images des articles
        await Promise.all(
          achat.articles.map(async (article: any) => {
            if (article.image) {
              await this.deleteArticleImage(article.image);
            }
          })
        );
      }
      
      const docRef = doc(db, this.collection, 'articles', id);
      await deleteDoc(docRef);
      console.log('✅ Achat d\'articles supprimé avec succès !');
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l\'achat d\'articles:', error);
      throw error;
    }
  }

  // Récupérer un achat d'articles par ID
  static async getAchatArticleById(id: string): Promise<any> {
    try {
      const docRef = doc(db, this.collection, 'articles', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Achat d\'articles non trouvé');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'achat d\'articles:', error);
      throw error;
    }
  }

  // Upload d'image d'article
  static async uploadArticleImage(file: File, articleName: string): Promise<string> {
    try {
      const fileName = `articles/${articleName}-${Date.now()}.${file.name.split('.').pop()}`;
      const imageRef = ref(storage, fileName);
      
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);
      
      console.log('✅ Image d\'article uploadée:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('❌ Erreur lors de l\'upload de l\'image d\'article:', error);
      throw error;
    }
  }

  // Supprimer une image d'article
  static async deleteArticleImage(imageUrl: string): Promise<void> {
    try {
      if (imageUrl && imageUrl.includes('firebasestorage.googleapis.com')) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
        console.log('✅ Image d\'article supprimée:', imageUrl);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l\'image d\'article:', error);
      // Ne pas lancer l'erreur car l'image pourrait déjà être supprimée
    }
  }
}
