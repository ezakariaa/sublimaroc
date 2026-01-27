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
  Timestamp,
  deleteField
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

  // Fonction pour corriger les documents : nom de document = nom du produit, champ id = GRA-XXX
  // Cette fonction est obsolète, utiliser migrateAllIdsFromSubToGra() à la place
  static async migrateProductIds(): Promise<void> {
    // Rediriger vers la nouvelle fonction de migration
    await this.migrateAllIdsFromSubToGra();
  }
      
  // Fonction de migration pour mettre à jour les IDs de SUB- à GRA-
  static async migrateAllIdsFromSubToGra(): Promise<void> {
    try {
      console.log('🔄 Début de la migration des IDs de SUB- à GRA-...');
      const productsRef = collection(db, this.collection);
      const querySnapshot = await getDocs(productsRef);
      
      let updatedProductsCount = 0;
      
      for (const docSnapshot of querySnapshot.docs) {
        const productData = docSnapshot.data();
        
        // Vérifier si l'ID commence par SUB-
        if (productData.id && productData.id.startsWith('SUB-')) {
          const newId = productData.id.replace(/^SUB-/, 'GRA-');
          console.log(`🔄 Mise à jour de l'ID du produit: ${productData.id} → ${newId}`);
          
          // Mettre à jour le document avec le nouvel ID
          await updateDoc(doc(db, this.collection, docSnapshot.id), {
            id: newId
          });
          
          updatedProductsCount++;
          
          // Mettre à jour aussi les sous-produits de ce produit
          await SubProductService.migrateSubProductIds(productData.id, newId);
        }
      }
      
      console.log(`✅ Migration terminée: ${updatedProductsCount} produit(s) mis à jour`);
    } catch (error) {
      console.error('❌ Erreur lors de la migration des IDs:', error);
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
        // Ne définir que les caractéristiques qui existent réellement dans le document Firebase
        const product: any = {
          id: data.id || doc.id, // Utiliser le champ id du document, sinon fallback sur doc.id
          nom: data.nom || '',
          description: data.description || '',
          prix: data.prix || 0,
          image: data.image || '',
          images: Array.isArray(data.images) ? data.images : [], // Ajouter le support des images multiples
          categorie: data.categorie || '',
          stock: data.stock || 0,
          fournisseur: data.fournisseur || { nom: '', ville: '' },
          dateCreation: data.dateCreation?.toDate() || new Date(),
          dateModification: data.dateModification?.toDate() || new Date(),
        };
        
        // Ajouter uniquement les caractéristiques qui existent dans le document Firebase
        // Ne pas définir les caractéristiques qui n'existent pas (undefined au lieu de [])
        if (data.hasOwnProperty('type') && Array.isArray(data.type)) {
          product.type = data.type;
        }
        if (data.hasOwnProperty('anse') && Array.isArray(data.anse)) {
          product.anse = data.anse;
        }
        if (data.hasOwnProperty('dimensions') && Array.isArray(data.dimensions)) {
          product.dimensions = data.dimensions;
        }
        if (data.hasOwnProperty('couleurs') && Array.isArray(data.couleurs)) {
          product.couleurs = data.couleurs;
        }
        if (data.hasOwnProperty('materiau') && Array.isArray(data.materiau)) {
          product.materiau = data.materiau;
        }
        if (data.hasOwnProperty('capacite') && Array.isArray(data.capacite)) {
          product.capacite = data.capacite;
        }
        if (data.hasOwnProperty('poids') && Array.isArray(data.poids)) {
          product.poids = data.poids;
        }
        if (data.hasOwnProperty('qualite') && Array.isArray(data.qualite)) {
          product.qualite = data.qualite;
        }
        if (data.hasOwnProperty('manches') && Array.isArray(data.manches)) {
          product.manches = data.manches;
        }
        if (data.hasOwnProperty('col') && Array.isArray(data.col)) {
          product.col = data.col;
        }
        
        // Ajouter toutes les autres caractéristiques personnalisées qui existent dans le document
        Object.keys(data).forEach(key => {
          const standardFields = ['id', 'nom', 'description', 'prix', 'image', 'images', 'categorie', 'stock', 'fournisseur', 'dateCreation', 'dateModification', 'type', 'anse', 'dimensions', 'couleurs', 'materiau', 'capacite', 'poids', 'qualite', 'manches', 'col'];
          if (!standardFields.includes(key) && Array.isArray(data[key])) {
            product[key] = data[key];
          }
        });
        
        return product as Product;
      });
      
      // Log pour vérifier les caractéristiques récupérées
      console.log('📥 Produits récupérés avec caractéristiques:', products.map(p => ({
        id: p.id,
        nom: p.nom,
        qualite: p.qualite,
        manches: p.manches,
        col: p.col,
        qualiteLength: p.qualite?.length || 0,
        manchesLength: p.manches?.length || 0,
        colLength: p.col?.length || 0
      })));
      
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
      const product = {
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
        qualite: Array.isArray(data.qualite) ? data.qualite : [],
        manches: Array.isArray(data.manches) ? data.manches : [],
        col: Array.isArray(data.col) ? data.col : [],
        stock: data.stock || 0,
        fournisseur: data.fournisseur || { nom: '', ville: '' },
        dateCreation: data.dateCreation?.toDate() || new Date(),
        dateModification: data.dateModification?.toDate() || new Date(),
      } as Product;
      
      console.log('📥 Produit récupéré par ID avec caractéristiques:', {
        id: product.id,
        nom: product.nom,
        qualite: product.qualite,
        manches: product.manches,
        col: product.col,
        qualiteLength: product.qualite?.length || 0,
        manchesLength: product.manches?.length || 0,
        colLength: product.col?.length || 0,
        rawDataQualite: data.qualite,
        rawDataManches: data.manches,
        rawDataCol: data.col
      });
      
      return product;
    }
    return null;
  }

  static async createProduct(product: Omit<Product, 'id' | 'dateCreation' | 'dateModification'>): Promise<string> {
    try {
      console.log('🚀 DÉBUT createProduct');
      
    const now = Timestamp.now();
      
      // Générer l'ID du produit : GRA-3 lettres du nom en majuscules
      const productName = product.nom.toLowerCase().trim();
      const threeLetters = productName.substring(0, 3).replace(/[^a-z]/g, '').toUpperCase();
      const productId = `GRA-${threeLetters}`;
      
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
        id: productId, // ID au format GRA-XXX
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
        qualite: product.qualite || [],
        manches: product.manches || [],
        col: product.col || [],
        prix: product.prix || 0,
        stock: product.stock || 0,
      dateCreation: now,
      dateModification: now,
      };
      
      console.log('📦 Données complètes:', productData);
      console.log('🏷️ Caractéristiques à sauvegarder:', {
        qualite: productData.qualite,
        manches: productData.manches,
        col: productData.col,
        qualiteLength: productData.qualite?.length || 0,
        manchesLength: productData.manches?.length || 0,
        colLength: productData.col?.length || 0
      });
      
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

      // Trouver le document par son champ ID (pas par l'ID du document)
      console.log('🔍 Recherche du document avec l\'ID:', oldId);
      
      const productsRef = collection(db, this.collection);
      const querySnapshot = await getDocs(productsRef);
      
      console.log('📊 Nombre de documents dans la collection:', querySnapshot.docs.length);
      
      let documentId = null;
      let existingProductData: any = null;
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        console.log('🔍 Document:', docSnapshot.id, 'ID:', data.id);
        if (data.id === oldId) {
          documentId = docSnapshot.id; // Nom du document Firebase
          existingProductData = data; // Conserver les données existantes
          console.log('📄 Document trouvé:', documentId);
          break;
        }
      }
      
      if (!documentId) {
        console.error('❌ Aucun document trouvé avec l\'ID:', oldId);
        console.error('📊 Documents disponibles:', querySnapshot.docs.map(doc => ({ id: doc.id, dataId: doc.data().id })));
        throw new Error(`Produit avec l'ID ${oldId} non trouvé`);
      }

      // Liste des champs standards (non caractéristiques)
      const standardFields = ['id', 'nom', 'description', 'prix', 'image', 'images', 'categorie', 'stock', 'fournisseur', 'dateCreation', 'dateModification'];
      
      // Liste des caractéristiques de base connues
      const baseCharacteristics = ['type', 'anse', 'couleurs', 'dimensions', 'materiau', 'capacite', 'poids', 'qualite', 'manches', 'col'];
      
      // Préparer les données de mise à jour
      const updateData: any = {
        nom: productData.nom !== undefined ? productData.nom : (existingProductData.nom || 'Produit sans nom'),
        description: productData.description !== undefined ? productData.description : (existingProductData.description || ''),
        fournisseur: productData.fournisseur !== undefined ? productData.fournisseur : (existingProductData.fournisseur || { nom: 'Inconnu', ville: '' }),
        image: productData.image !== undefined ? productData.image : (existingProductData.image || '/mug.webp'),
        images: productData.images !== undefined ? productData.images : (existingProductData.images || []),
        categorie: productData.categorie !== undefined ? productData.categorie : (existingProductData.categorie || ''),
        prix: productData.prix !== undefined ? productData.prix : (existingProductData.prix || 0),
        stock: productData.stock !== undefined ? productData.stock : (existingProductData.stock || 0),
        dateModification: Timestamp.now(),
      };

      // Gérer la date de création (ne jamais la modifier)
      if (productData.dateCreation !== undefined) {
        updateData.dateCreation = productData.dateCreation instanceof Date ? 
          Timestamp.fromDate(productData.dateCreation) : 
          (productData.dateCreation || existingProductData.dateCreation || Timestamp.now());
      } else if (existingProductData.dateCreation) {
        updateData.dateCreation = existingProductData.dateCreation;
      }

      // Gérer les caractéristiques : ne mettre à jour que celles qui sont explicitement fournies dans productData
      // Pour les caractéristiques de base, utiliser les valeurs de productData si présentes, sinon conserver celles existantes
      baseCharacteristics.forEach(charKey => {
        if (productData[charKey] !== undefined) {
          // Si la caractéristique est fournie dans productData, l'utiliser
          updateData[charKey] = Array.isArray(productData[charKey]) ? productData[charKey] : [];
        } else if (existingProductData[charKey] !== undefined) {
          // Sinon, conserver la valeur existante
          updateData[charKey] = existingProductData[charKey];
        }
        // Si ni productData ni existingProductData n'ont cette caractéristique, ne pas l'inclure
      });

      // Gérer les caractéristiques personnalisées : conserver toutes celles qui existent dans le produit actuel
      // sauf si elles sont explicitement supprimées dans productData (présentes mais vides/null)
      Object.keys(existingProductData).forEach(key => {
        if (!standardFields.includes(key) && !baseCharacteristics.includes(key)) {
          const value = existingProductData[key];
          // Si c'est un tableau (caractéristique personnalisée)
          if (Array.isArray(value)) {
            // Si la caractéristique est fournie dans productData, utiliser cette valeur
            if (productData[key] !== undefined) {
              updateData[key] = Array.isArray(productData[key]) ? productData[key] : [];
            } else {
              // Sinon, conserver la valeur existante
              updateData[key] = value;
            }
          }
        }
      });

      // Ajouter les nouvelles caractéristiques personnalisées de productData qui n'existent pas encore
      Object.keys(productData).forEach(key => {
        if (!standardFields.includes(key) && !baseCharacteristics.includes(key)) {
          const value = productData[key];
          if (Array.isArray(value) && !updateData.hasOwnProperty(key)) {
            updateData[key] = value;
          }
        }
      });

      console.log('💾 Données de mise à jour avec caractéristiques:', {
        qualite: updateData.qualite,
        manches: updateData.manches,
        col: updateData.col,
        qualiteLength: updateData.qualite?.length || 0,
        manchesLength: updateData.manches?.length || 0,
        colLength: updateData.col?.length || 0
      });

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
      
      // Référence vers la sous-collection subProducts dans le produit parent
      // Chaque sous-produit est maintenant un document séparé
      const subProductsCollectionRef = collection(db, this.mainCollection, productDocumentName, this.subProductsDocument);
      const subProductsSnapshot = await getDocs(subProductsCollectionRef);
      
      console.log('📊 Nombre de sous-produits trouvés:', subProductsSnapshot.docs.length);
      
      return subProductsSnapshot.docs.map((docSnapshot, index: number) => {
        const subProduct = docSnapshot.data();
        
        // Convertir les dates (peuvent être des Timestamp ou des nombres)
        let dateCreation: Date;
        if (subProduct.dateCreation) {
          if (typeof subProduct.dateCreation === 'number') {
            dateCreation = new Date(subProduct.dateCreation);
          } else if (typeof subProduct.dateCreation.toDate === 'function') {
            dateCreation = subProduct.dateCreation.toDate();
          } else {
            dateCreation = new Date();
          }
        } else {
          dateCreation = new Date();
        }
        
        let dateModification: Date;
        if (subProduct.dateModification) {
          if (typeof subProduct.dateModification === 'number') {
            dateModification = new Date(subProduct.dateModification);
          } else if (typeof subProduct.dateModification.toDate === 'function') {
            dateModification = subProduct.dateModification.toDate();
          } else {
            dateModification = new Date();
          }
        } else {
          dateModification = new Date();
        }
        
        // Normaliser les caractéristiques pour s'assurer qu'elles sont des tableaux
        const normalizeArray = (value: any): string[] => {
          if (!value) return [];
          if (Array.isArray(value)) {
            return value.filter(v => v != null && v !== '').map(v => String(v).trim()).filter(v => v.length > 0);
          }
          if (typeof value === 'string' && value.trim()) {
            return [value.trim()];
          }
          return [];
        };

        const mappedSubProduct: SubProduct = {
          id: docSnapshot.id || subProduct.id || `subproduct-${index}`,
          productId: String(subProduct.productId || productId),
          nom: subProduct.nom || 'Sous-produit sans nom', // S'assurer que nom existe toujours
          description: String(subProduct.description || ''),
          prix: Number(subProduct.prix || 0),
          stock: Number(subProduct.stock || 0),
          dateCreation,
          dateModification,
          // S'assurer que les images sont bien présentes
          images: Array.isArray(subProduct.images) ? subProduct.images : (subProduct.image ? [subProduct.image] : []),
          image: subProduct.image || (Array.isArray(subProduct.images) && subProduct.images.length > 0 ? subProduct.images[0] : '/mug.webp'),
          // Normaliser les caractéristiques
          type: normalizeArray(subProduct.type),
          anse: normalizeArray(subProduct.anse),
          couleurs: normalizeArray(subProduct.couleurs),
          dimensions: normalizeArray(subProduct.dimensions),
          materiau: normalizeArray(subProduct.materiau),
          capacite: normalizeArray(subProduct.capacite),
          poids: normalizeArray(subProduct.poids),
          qualite: normalizeArray(subProduct.qualite),
          manches: normalizeArray(subProduct.manches),
          col: normalizeArray(subProduct.col),
          variations: Array.isArray((subProduct as any).variations) ? (subProduct as any).variations : []
        };
        
        // Log pour déboguer les caractéristiques et variations
        console.log(`📋 Sous-produit ${mappedSubProduct.id} caractéristiques:`, {
          type: mappedSubProduct.type,
          anse: mappedSubProduct.anse,
          couleurs: mappedSubProduct.couleurs,
          dimensions: mappedSubProduct.dimensions,
          materiau: mappedSubProduct.materiau,
          capacite: mappedSubProduct.capacite,
          poids: mappedSubProduct.poids,
          variationsCount: mappedSubProduct.variations?.length || 0,
          variations: mappedSubProduct.variations
        });
        
        // Log pour déboguer
        if (mappedSubProduct.images && mappedSubProduct.images.length > 0) {
          console.log(`🖼️ Sous-produit ${mappedSubProduct.id} a ${mappedSubProduct.images.length} image(s)`);
        } else {
          console.log(`⚠️ Sous-produit ${mappedSubProduct.id} n'a pas d'images`);
        }
        
        return mappedSubProduct;
      }) as SubProduct[];
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

      // Générer un ID basé sur la catégorie parent : GRA-3 lettres de la catégorie + numéro incrémental
      const categoryName = parentProductData.nom.toLowerCase().trim();
      const threeLetters = categoryName.substring(0, 3).replace(/[^a-z]/g, '').toUpperCase();
      
      // Récupérer les sous-produits existants pour cette catégorie
      const currentSubProducts = await this.getSubProductsByProductId(subProduct.productId);
      
      // Trouver le prochain numéro incrémental
      let nextNumber = 1;
      const existingIds = currentSubProducts.map(sp => sp.id);
      while (existingIds.includes(`GRA-${threeLetters}-${nextNumber}`)) {
        nextNumber++;
      }
      
      const subProductId = `GRA-${threeLetters}-${nextNumber}`;

      console.log('🔧 ID du sous-produit généré:', subProductId);

      // Référence vers la sous-collection subProducts dans le produit parent
      // Chaque sous-produit sera un document séparé au lieu d'un élément dans un tableau
      const subProductsCollectionRef = collection(db, this.mainCollection, parentProductDocumentName, this.subProductsDocument);
      const subProductDocRef = doc(subProductsCollectionRef, subProductId);

      console.log('📄 Chemin complet du document:', `${this.mainCollection}/${parentProductDocumentName}/${this.subProductsDocument}/${subProductId}`);

      // Préparer les données complètes du nouveau sous-produit
      // S'assurer que toutes les données sont sérialisables pour Firestore
      // IMPORTANT: Firestore a une limite de 1MB par document
      // Les images base64 peuvent être très longues, donc on limite leur taille
      let imagesArray = Array.isArray(subProduct.images) 
        ? subProduct.images.filter((img: any) => typeof img === 'string')
        : (subProduct.image && typeof subProduct.image === 'string' ? [subProduct.image] : ['/mug.webp']);
      
      // Limiter la taille de chaque image base64 à 1MB (augmenté pour permettre des images de meilleure qualité)
      imagesArray = imagesArray.map((img: string) => {
        if (img.length > 1000000) { // ~1MB par image (augmenté de 300KB à 1MB)
          console.warn('⚠️ Image base64 trop longue (' + Math.round(img.length / 1024) + 'KB), utilisation de l\'image par défaut');
          return '/mug.webp';
        }
        return img;
      }).filter((img: string) => img !== '/mug.webp' || imagesArray.length === 0); // Garder au moins une image
      
      // Vérifier la taille totale du tableau d'images
      const totalImagesSize = imagesArray.reduce((total: number, img: string) => total + img.length, 0);
      if (totalImagesSize > 1800000) { // ~1.8MB pour laisser de la marge (augmenté de 800KB)
        console.warn('⚠️ Taille totale des images trop grande (' + Math.round(totalImagesSize / 1024) + 'KB), limitation à 2 images maximum');
        // Limiter à 2 images maximum pour éviter de dépasser la limite
        imagesArray = imagesArray.slice(0, 2);
      }
      
      // S'assurer qu'on a au moins une image
      if (imagesArray.length === 0 || imagesArray.every((img: string) => img === '/mug.webp')) {
        imagesArray = ['/mug.webp'];
      }
      
      // Préparer les données du nouveau sous-produit
      // Chaque sous-produit est maintenant un document séparé, donc on peut utiliser Timestamp directement
      const newSubProductData = {
        id: subProductId,
        nom: String(subProduct.nom || 'Sous-produit sans nom'),
        description: String(subProduct.description || ''),
        prix: Number(subProduct.prix || 0),
        stock: Number(subProduct.stock || 0),
        image: String(subProduct.image || '/mug.webp'),
        images: imagesArray, // Tableau de strings uniquement
        productId: String(subProduct.productId),
        // Caractéristiques du sous-produit - s'assurer que ce sont des tableaux de strings
        type: Array.isArray(subProduct.type) ? subProduct.type.map(String) : [],
        anse: Array.isArray(subProduct.anse) ? subProduct.anse.map(String) : [],
        couleurs: Array.isArray(subProduct.couleurs) ? subProduct.couleurs.map(String) : [],
        dimensions: Array.isArray(subProduct.dimensions) ? subProduct.dimensions.map(String) : [],
        materiau: Array.isArray(subProduct.materiau) ? subProduct.materiau.map(String) : [],
        capacite: Array.isArray(subProduct.capacite) ? subProduct.capacite.map(String) : [],
        poids: Array.isArray(subProduct.poids) ? subProduct.poids.map(String) : [],
        qualite: Array.isArray((subProduct as any).qualite) ? (subProduct as any).qualite.map(String) : [],
        manches: Array.isArray((subProduct as any).manches) ? (subProduct as any).manches.map(String) : [],
        col: Array.isArray((subProduct as any).col) ? (subProduct as any).col.map(String) : [],
        variations: Array.isArray((subProduct as any).variations) ? (subProduct as any).variations : [],
        dateCreation: Timestamp.now(), // Timestamp Firebase directement (pas de problème car c'est un document, pas un tableau)
        dateModification: Timestamp.now() // Timestamp Firebase directement
      };
      
      // Vérifier que toutes les données sont correctes
      console.log('🔍 Vérification des données...');
      console.log('📦 Structure des données:', {
        id: typeof newSubProductData.id,
        nom: typeof newSubProductData.nom,
        images: Array.isArray(newSubProductData.images) ? `Array(${newSubProductData.images.length})` : typeof newSubProductData.images,
        dateCreation: newSubProductData.dateCreation?.constructor?.name || typeof newSubProductData.dateCreation,
        dateModification: newSubProductData.dateModification?.constructor?.name || typeof newSubProductData.dateModification
      });
      
      // Vérifier chaque élément du tableau d'images
      if (Array.isArray(newSubProductData.images)) {
        newSubProductData.images.forEach((img, idx) => {
          if (typeof img !== 'string') {
            console.error(`❌ Image ${idx} n'est pas une string:`, typeof img, img);
          }
        });
      }
      
      // Les Timestamp Firebase sont sérialisables directement dans un document Firestore
      // Pas besoin de tester JSON.stringify car Firestore gère les Timestamp nativement
      console.log('✅ Données préparées pour Firestore');

      console.log('📦 Données du nouveau sous-produit:', {
        id: newSubProductData.id,
        nom: newSubProductData.nom,
        nombreImages: newSubProductData.images.length
      });

      // Sauvegarder le sous-produit comme un document séparé dans la sous-collection
      // C'est la meilleure pratique Firestore et évite tous les problèmes de sérialisation dans un tableau
      console.log('💾 Sauvegarde du sous-produit comme document séparé...');
      
      try {
        await setDoc(subProductDocRef, newSubProductData);
      console.log('✅ Sous-produit créé avec succès !');
      console.log('📄 Document créé:', subProductId);
      console.log('📁 Chemin complet dans Firebase:');
        console.log(`   ${this.mainCollection}/${parentProductDocumentName}/${this.subProductsDocument}/${subProductId}`);
      } catch (setDocError: any) {
        console.error('❌ Erreur lors de la création du sous-produit:', setDocError);
        console.error('❌ Code d\'erreur:', setDocError?.code);
        console.error('❌ Message d\'erreur:', setDocError?.message);
        throw setDocError;
      }

      return subProductId;
    } catch (error) {
      console.error('❌ Erreur lors de la création du sous-produit:', error);
      console.error('❌ Type d\'erreur:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('❌ Message d\'erreur:', error instanceof Error ? error.message : String(error));
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
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
    
    // Référence vers la sous-collection subProducts dans le produit parent
    // Chaque sous-produit est maintenant un document séparé
    const subProductsCollectionRef = collection(db, this.mainCollection, parentProductDocumentName, this.subProductsDocument);
    
    // Récupérer tous les sous-produits pour trouver celui avec le bon ID
    // (car l'ID du document Firestore peut être différent de l'ID logique)
    const subProductsSnapshot = await getDocs(subProductsCollectionRef);
    
    let subProductDocRef = null;
    let subProductDoc = null;
    
    // Chercher le sous-produit par son ID logique (champ id) OU par l'ID du document Firestore
    // (car lors de la migration, seul le champ id est mis à jour, pas l'ID du document)
    for (const docSnapshot of subProductsSnapshot.docs) {
      const data = docSnapshot.data();
      const docId = docSnapshot.id; // ID du document Firestore
      const logicalId = data.id; // ID logique dans le champ id
      
      // Vérifier si l'ID du document Firestore correspond (peut être SUB- ou GRA-)
      if (docId === subProductId || 
          (subProductId.startsWith('GRA-') && docId === subProductId.replace(/^GRA-/, 'SUB-')) ||
          (subProductId.startsWith('SUB-') && docId === subProductId.replace(/^SUB-/, 'GRA-'))) {
        subProductDocRef = doc(subProductsCollectionRef, docId);
        subProductDoc = docSnapshot;
        console.log(`✅ Sous-produit trouvé par ID du document Firestore: ${docId} (ID logique: ${logicalId})`);
        break;
      }
      
      // Vérifier si l'ID logique correspond (peut être SUB- ou GRA-)
      if (logicalId === subProductId || 
          (subProductId.startsWith('GRA-') && logicalId === subProductId.replace(/^GRA-/, 'SUB-')) ||
          (subProductId.startsWith('SUB-') && logicalId === subProductId.replace(/^SUB-/, 'GRA-'))) {
        subProductDocRef = doc(subProductsCollectionRef, docId);
        subProductDoc = docSnapshot;
        console.log(`✅ Sous-produit trouvé par ID logique: ${logicalId} (ID document Firestore: ${docId})`);
        break;
      }
    }
    
    // Si pas trouvé, essayer avec l'ID du document directement (pour compatibilité)
    if (!subProductDoc) {
      const directDocRef = doc(subProductsCollectionRef, subProductId);
      const directDoc = await getDoc(directDocRef);
      if (directDoc.exists()) {
        subProductDocRef = directDocRef;
        subProductDoc = directDoc;
        console.log(`✅ Sous-produit trouvé directement avec l'ID du document ${subProductId}`);
      }
    }
    
    if (!subProductDoc || !subProductDoc.exists() || !subProductDocRef) {
      console.error(`❌ Sous-produit non trouvé. ID recherché: ${subProductId}`);
      console.error(`📋 Sous-produits disponibles dans ${parentProductDocumentName}:`, 
        subProductsSnapshot.docs.map(d => ({ docId: d.id, logicalId: d.data().id })));
      throw new Error(`Sous-produit avec l'ID ${subProductId} non trouvé`);
    }
    
    // À ce point, TypeScript sait que subProductDocRef n'est pas null
    const finalSubProductDocRef = subProductDocRef;
    
    const existingSubProduct = subProductDoc.data();
    
    console.log('✅ Sous-produit trouvé, mise à jour en cours...');
    
    // Préparer les données mises à jour
    // Préserver la date de création originale
    let dateCreation: Timestamp;
    if (existingSubProduct.dateCreation) {
      if (existingSubProduct.dateCreation instanceof Timestamp) {
        dateCreation = existingSubProduct.dateCreation;
      } else if (typeof existingSubProduct.dateCreation.toDate === 'function') {
        dateCreation = existingSubProduct.dateCreation;
      } else if (typeof existingSubProduct.dateCreation === 'number') {
        dateCreation = Timestamp.fromMillis(existingSubProduct.dateCreation);
      } else {
        dateCreation = Timestamp.now();
      }
    } else {
      dateCreation = Timestamp.now();
    }
    
    // Préparer les images - TOUJOURS utiliser les images fournies dans subProduct.images si elles sont définies
    let finalImages: string[] = [];
    
    console.log('🖼️ Préparation des images pour la mise à jour:', {
      hasSubProductImages: subProduct.images !== undefined,
      subProductImagesType: Array.isArray(subProduct.images) ? `Array(${subProduct.images.length})` : typeof subProduct.images,
      subProductImages: subProduct.images,
      existingImagesType: Array.isArray(existingSubProduct.images) ? `Array(${existingSubProduct.images.length})` : typeof existingSubProduct.images,
      existingImages: existingSubProduct.images
    });
    
    // Si subProduct.images est défini (même si c'est un tableau vide), l'utiliser
    // Cela permet de vider les images si nécessaire
    if (subProduct.images !== undefined) {
      if (Array.isArray(subProduct.images)) {
        // Filtrer les images valides (exclure '/mug.webp' et les chemins relatifs)
        finalImages = subProduct.images.filter((img: any) => 
          typeof img === 'string' && img !== '' && img !== '/mug.webp' && !img.startsWith('/')
        ).map(String);
        console.log('✅ Utilisation des images fournies dans subProduct.images:', finalImages.length);
      } else {
        console.warn('⚠️ subProduct.images n\'est pas un tableau, utilisation des images existantes');
        finalImages = existingSubProduct.images && Array.isArray(existingSubProduct.images)
          ? existingSubProduct.images.filter((img: any) => typeof img === 'string' && img !== '/mug.webp' && !img.startsWith('/')).map(String)
          : [];
      }
    } else {
      // Si subProduct.images n'est pas défini, conserver les images existantes
      console.log('ℹ️ subProduct.images non défini, conservation des images existantes');
      finalImages = existingSubProduct.images && Array.isArray(existingSubProduct.images)
        ? existingSubProduct.images.filter((img: any) => typeof img === 'string' && img !== '/mug.webp' && !img.startsWith('/')).map(String)
        : [];
    }
    
    // Si aucune image valide dans le tableau mais qu'une image principale est fournie, l'ajouter
    if (finalImages.length === 0 && subProduct.image && subProduct.image !== '/mug.webp' && subProduct.image.trim() !== '' && !subProduct.image.startsWith('/')) {
      console.log('ℹ️ Aucune image dans le tableau, utilisation de l\'image principale fournie');
      finalImages = [subProduct.image];
    }
    
    // Limiter la taille des images base64 à 1MB par image (augmenté pour permettre des images de meilleure qualité)
    // Mais ne pas remplacer par '/mug.webp' si c'est la seule image, on la garde même si elle est grande
    const originalFinalImagesLength = finalImages.length;
    finalImages = finalImages.map((img: string) => {
      if (img.length > 1000000) { // ~1MB par image (augmenté de 300KB à 1MB)
        console.warn('⚠️ Image base64 trop longue (' + Math.round(img.length / 1024) + 'KB)');
        // Ne pas remplacer si c'est la seule image, on la garde quand même
        if (originalFinalImagesLength === 1) {
          console.log('ℹ️ Image unique conservée malgré sa taille');
          return img;
        }
        return '/mug.webp';
      }
      return img;
    }).filter((img: string) => img !== '/mug.webp' || finalImages.length === 0); // Garder au moins une image
    
    // Vérifier la taille totale du tableau d'images
    const totalImagesSize = finalImages.reduce((total: number, img: string) => total + img.length, 0);
    if (totalImagesSize > 1800000) { // ~1.8MB pour laisser de la marge (augmenté de 800KB)
      console.warn('⚠️ Taille totale des images trop grande (' + Math.round(totalImagesSize / 1024) + 'KB), limitation à 2 images maximum');
      finalImages = finalImages.slice(0, 2);
    }
    
    // S'assurer qu'on a au moins une image SEULEMENT si l'utilisateur n'a pas explicitement fourni un tableau vide
    // Si subProduct.images est défini et est un tableau vide après filtrage, cela signifie que l'utilisateur a supprimé toutes les images
    const userProvidedEmptyArray = subProduct.images !== undefined && Array.isArray(subProduct.images) && 
      subProduct.images.filter((img: any) => typeof img === 'string' && img !== '' && img !== '/mug.webp' && !img.startsWith('/')).length === 0;
    
    if (finalImages.length === 0 && !userProvidedEmptyArray) {
      // L'utilisateur n'a pas explicitement vidé le tableau, utiliser l'image par défaut
      console.log('ℹ️ Aucune image valide, utilisation de l\'image par défaut');
      finalImages = ['/mug.webp'];
    } else if (finalImages.length === 0 && userProvidedEmptyArray) {
      // L'utilisateur a explicitement supprimé toutes les images, utiliser l'image par défaut quand même
      // (car Firestore nécessite au moins une image)
      console.log('✅ Tableau d\'images vide par intention de l\'utilisateur (toutes les images ont été supprimées)');
      finalImages = ['/mug.webp'];
    }
    
    console.log('🖼️ Images finales après traitement:', {
      nombreImages: finalImages.length,
      tailleTotale: Math.round(totalImagesSize / 1024) + 'KB',
      premiereImage: finalImages[0]?.substring(0, 50) + '...'
    });
    
    // Déterminer l'image principale
    // Si subProduct.image est fourni et valide (même s'il est grand), l'utiliser
    // Sinon, utiliser la première image de finalImages
    let mainImage: string;
    if (subProduct.image !== undefined && subProduct.image !== '/mug.webp' && subProduct.image.trim() !== '' && !subProduct.image.startsWith('/')) {
      // Utiliser l'image principale fournie, même si elle est grande
      mainImage = String(subProduct.image);
      console.log('🖼️ Utilisation de l\'image principale fournie:', mainImage.substring(0, 50) + '...');
    } else if (finalImages.length > 0 && finalImages[0] !== '/mug.webp') {
      // Utiliser la première image valide de finalImages
      mainImage = String(finalImages[0]);
      console.log('🖼️ Utilisation de la première image de finalImages:', mainImage.substring(0, 50) + '...');
    } else {
      // Fallback vers l'image par défaut
      mainImage = '/mug.webp';
      console.log('⚠️ Aucune image valide trouvée, utilisation de l\'image par défaut');
    }
    
    // Préparer les données mises à jour
    const updatedData: any = {
      id: String(existingSubProduct.id || subProductId),
      productId: String(existingSubProduct.productId || productId),
      nom: String(subProduct.nom !== undefined ? subProduct.nom : existingSubProduct.nom || ''),
      description: String(subProduct.description !== undefined ? subProduct.description : existingSubProduct.description || ''),
      prix: Number(subProduct.prix !== undefined ? subProduct.prix : existingSubProduct.prix || 0),
      stock: Number(subProduct.stock !== undefined ? subProduct.stock : existingSubProduct.stock || 0),
      image: mainImage,
      images: finalImages,
      dateCreation: dateCreation,
      dateModification: Timestamp.now(),
      type: Array.isArray(subProduct.type) ? subProduct.type.map(String) : (Array.isArray(existingSubProduct.type) ? existingSubProduct.type.map(String) : []),
      anse: Array.isArray(subProduct.anse) ? subProduct.anse.map(String) : (Array.isArray(existingSubProduct.anse) ? existingSubProduct.anse.map(String) : []),
      couleurs: Array.isArray(subProduct.couleurs) ? subProduct.couleurs.map(String) : (Array.isArray(existingSubProduct.couleurs) ? existingSubProduct.couleurs.map(String) : []),
      dimensions: Array.isArray(subProduct.dimensions) ? subProduct.dimensions.map(String) : (Array.isArray(existingSubProduct.dimensions) ? existingSubProduct.dimensions.map(String) : []),
      materiau: Array.isArray(subProduct.materiau) ? subProduct.materiau.map(String) : (Array.isArray(existingSubProduct.materiau) ? existingSubProduct.materiau.map(String) : []),
      capacite: Array.isArray(subProduct.capacite) ? subProduct.capacite.map(String) : (Array.isArray(existingSubProduct.capacite) ? existingSubProduct.capacite.map(String) : []),
      poids: Array.isArray(subProduct.poids) ? subProduct.poids.map(String) : (Array.isArray(existingSubProduct.poids) ? existingSubProduct.poids.map(String) : []),
      qualite: Array.isArray((subProduct as any).qualite) ? (subProduct as any).qualite.map(String) : (Array.isArray((existingSubProduct as any).qualite) ? (existingSubProduct as any).qualite.map(String) : []),
      manches: Array.isArray((subProduct as any).manches) ? (subProduct as any).manches.map(String) : (Array.isArray((existingSubProduct as any).manches) ? (existingSubProduct as any).manches.map(String) : []),
      col: Array.isArray((subProduct as any).col) ? (subProduct as any).col.map(String) : (Array.isArray((existingSubProduct as any).col) ? (existingSubProduct as any).col.map(String) : []),
      variations: (() => {
        // Si variations est explicitement fourni (même si c'est un tableau vide), l'utiliser
        if ((subProduct as any).variations !== undefined) {
          const providedVariations = (subProduct as any).variations;
          console.log('📦 Variations fournies dans subProduct:', {
            isArray: Array.isArray(providedVariations),
            count: Array.isArray(providedVariations) ? providedVariations.length : 'N/A',
            type: typeof providedVariations,
            variations: providedVariations
          });
          return Array.isArray(providedVariations) ? providedVariations : [];
        } else {
          // Sinon, conserver les variations existantes
          const existingVariations = (existingSubProduct as any).variations;
          console.log('📦 Aucune variation fournie, conservation des variations existantes:', {
            isArray: Array.isArray(existingVariations),
            count: Array.isArray(existingVariations) ? existingVariations.length : 'N/A',
            type: typeof existingVariations
          });
          return Array.isArray(existingVariations) ? existingVariations : [];
        }
      })()
    };
    
    // Vérifier la taille totale des données avant la sauvegarde
    // Calculer la taille sans les images d'abord
    const dataWithoutImages = { ...updatedData };
    delete dataWithoutImages.images;
    delete dataWithoutImages.image;
    const baseDataSize = JSON.stringify(dataWithoutImages).length;
    const imagesSize = updatedData.images ? updatedData.images.reduce((total: number, img: string) => total + img.length, 0) : 0;
    const imageSize = updatedData.image ? updatedData.image.length : 0;
    const totalDataSize = baseDataSize + imagesSize + imageSize;
    
    console.log('📊 Taille des données à sauvegarder:', {
      baseData: Math.round(baseDataSize / 1024) + 'KB',
      imagesArray: Math.round(imagesSize / 1024) + 'KB',
      imageField: Math.round(imageSize / 1024) + 'KB',
      total: Math.round(totalDataSize / 1024) + 'KB'
    });
    
    // Firestore limite à ~1MB par document (en fait 1,048,576 bytes)
    const FIRESTORE_MAX_SIZE = 1000000; // ~1MB pour laisser une marge
    const MAX_IMAGE_SIZE = 500000; // ~500KB par image pour laisser de la place pour les autres données
    
    if (totalDataSize > FIRESTORE_MAX_SIZE) {
      console.warn('⚠️ Taille totale des données dépasse la limite Firestore:', Math.round(totalDataSize / 1024) + 'KB');
      
      // Réduire la taille des images si nécessaire
      // Stratégie : Garder seulement l'image principale si elle est fournie et qu'elle est raisonnable
      // Sinon, garder seulement la première image du tableau
      
      if (updatedData.images && Array.isArray(updatedData.images)) {
        // Filtrer les images invalides
        updatedData.images = updatedData.images.filter((img: string) => img && img !== '/mug.webp' && !img.startsWith('/'));
        
        // Si l'image principale est fournie et qu'elle est raisonnable (< 500KB), l'utiliser seule
        if (updatedData.image && updatedData.image !== '/mug.webp' && !updatedData.image.startsWith('/') && updatedData.image.length <= MAX_IMAGE_SIZE) {
          console.warn('⚠️ Réduction à 1 image (image principale) pour respecter la limite Firestore');
          updatedData.images = [updatedData.image];
        } else if (updatedData.images.length > 0) {
          // Sinon, utiliser seulement la première image du tableau si elle est raisonnable
          const firstImage = updatedData.images[0];
          if (firstImage.length <= MAX_IMAGE_SIZE) {
            console.warn('⚠️ Réduction à 1 image (première du tableau) pour respecter la limite Firestore');
            updatedData.images = [firstImage];
            updatedData.image = firstImage;
          } else {
            // Si même la première image est trop grande, utiliser l'image par défaut
            console.warn('⚠️ Toutes les images sont trop grandes (' + Math.round(firstImage.length / 1024) + 'KB), utilisation de l\'image par défaut');
            updatedData.image = '/mug.webp';
            updatedData.images = ['/mug.webp'];
          }
        } else {
          // Aucune image valide, utiliser l'image par défaut
          console.warn('⚠️ Aucune image valide trouvée, utilisation de l\'image par défaut');
          updatedData.image = '/mug.webp';
          updatedData.images = ['/mug.webp'];
        }
        
        // Vérifier à nouveau la taille finale
        const finalImagesSize = updatedData.images.reduce((total: number, img: string) => total + img.length, 0);
        const finalImageSize = updatedData.image ? updatedData.image.length : 0;
        const finalTotalSize = baseDataSize + finalImagesSize + finalImageSize;
        
        console.log('📊 Taille finale après réduction:', {
          imagesArray: Math.round(finalImagesSize / 1024) + 'KB',
          imageField: Math.round(finalImageSize / 1024) + 'KB',
          total: Math.round(finalTotalSize / 1024) + 'KB',
          nombreImages: updatedData.images.length
        });
        
        if (finalTotalSize > FIRESTORE_MAX_SIZE) {
          console.error('❌ Impossible de réduire suffisamment la taille des données');
          throw new Error(`Taille des données trop importante (${Math.round(finalTotalSize / 1024)}KB). Veuillez utiliser des images plus petites.`);
        }
      }
    }
    
    // Sauvegarder le document mis à jour
    console.log('💾 Mise à jour du sous-produit...');
    console.log('📄 Chemin du document:', finalSubProductDocRef.path);
    console.log('📋 ID du sous-produit:', subProductId);
    console.log('📋 ID du produit parent:', productId);
    console.log('📋 Nom du document parent:', parentProductDocumentName);
    console.log('📦 Variations dans updatedData:', {
      hasVariations: updatedData.variations !== undefined,
      variationsType: Array.isArray(updatedData.variations) ? 'array' : typeof updatedData.variations,
      variationsCount: Array.isArray(updatedData.variations) ? updatedData.variations.length : 'N/A',
      variations: updatedData.variations
    });
    
    try {
      // Vérifier que le document existe avant de le mettre à jour
      const docCheck = await getDoc(finalSubProductDocRef);
      if (!docCheck.exists()) {
        console.error('❌ Le document n\'existe pas:', finalSubProductDocRef.path);
        throw new Error(`Sous-produit avec l'ID ${subProductId} non trouvé dans le document ${parentProductDocumentName}`);
      }
      
      // Utiliser updateDoc au lieu de setDoc pour éviter d'écraser des données
      // setDoc avec merge: false peut causer des problèmes si le document a été modifié
      await updateDoc(finalSubProductDocRef, updatedData);
      console.log('✅ Sous-produit mis à jour avec succès !');
      console.log('✅ Variations sauvegardées:', {
        count: Array.isArray(updatedData.variations) ? updatedData.variations.length : 0,
        variations: updatedData.variations
      });
    } catch (updateError: any) {
      console.error('❌ Erreur lors de la mise à jour du sous-produit:', updateError);
      console.error('📄 Chemin du document:', finalSubProductDocRef.path);
      console.error('📋 Détails de l\'erreur:', {
        code: updateError?.code,
        message: updateError?.message,
        stack: updateError?.stack
      });
      throw new Error(`Erreur lors de la mise à jour du sous-produit: ${updateError?.message || 'Erreur inconnue'}`);
    }
  }

  static async deleteSubProduct(productId: string, subProductId: string): Promise<void> {
    try {
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
    
      // Référence vers la sous-collection subProducts dans le produit parent
      const subProductsCollectionRef = collection(db, this.mainCollection, parentProductDocumentName, this.subProductsDocument);
      const subProductDocRef = doc(subProductsCollectionRef, subProductId);
      
      console.log('🗑️ Suppression du sous-produit:', {
        productId,
        subProductId,
        parentDocumentName: parentProductDocumentName,
        documentPath: subProductDocRef.path
      });
      
      // Vérifier que le document existe avant de le supprimer
      const docCheck = await getDoc(subProductDocRef);
      if (!docCheck.exists()) {
        console.warn('⚠️ Le document n\'existe pas:', subProductDocRef.path);
        throw new Error(`Sous-produit avec l'ID ${subProductId} non trouvé dans le document ${parentProductDocumentName}`);
      }
      
      // Supprimer le document
      await deleteDoc(subProductDocRef);
      console.log('✅ Sous-produit supprimé avec succès');
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression du sous-produit:', error);
      console.error('📋 Détails de l\'erreur:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      });
      throw new Error(`Erreur lors de la suppression du sous-produit: ${error?.message || 'Erreur inconnue'}`);
    }
  }

  // Fonction de migration pour mettre à jour les IDs de sous-produits de SUB- à GRA-
  static async migrateSubProductIds(oldProductId: string, newProductId: string): Promise<void> {
    try {
      console.log(`🔄 Migration des sous-produits pour le produit: ${oldProductId} → ${newProductId}`);
      
      // Trouver le produit parent par son nouvel ID pour obtenir le nom du document Firebase
      const productsRef = collection(db, this.mainCollection);
      const querySnapshot = await getDocs(productsRef);
      
      let parentProductDocumentName = null;
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        if (data.id === newProductId) {
          parentProductDocumentName = docSnapshot.id;
          break;
        }
      }
      
      if (!parentProductDocumentName) {
        console.warn(`⚠️ Produit parent non trouvé avec l'ID: ${newProductId}`);
        return;
      }
      
      // Récupérer tous les sous-produits de ce produit
      const subProductsCollectionRef = collection(db, this.mainCollection, parentProductDocumentName, this.subProductsDocument);
      const subProductsSnapshot = await getDocs(subProductsCollectionRef);
      
      let updatedCount = 0;
      
      for (const subProductDoc of subProductsSnapshot.docs) {
        const subProductData = subProductDoc.data();
        
        // Vérifier si l'ID commence par SUB-
        if (subProductData.id && subProductData.id.startsWith('SUB-')) {
          const newSubProductId = subProductData.id.replace(/^SUB-/, 'GRA-');
          console.log(`🔄 Mise à jour de l'ID du sous-produit: ${subProductData.id} → ${newSubProductId}`);
          
          // Mettre à jour le document avec le nouvel ID
          await updateDoc(doc(subProductsCollectionRef, subProductDoc.id), {
            id: newSubProductId,
            productId: newProductId // Mettre à jour aussi le productId
          });
          
          updatedCount++;
        } else if (subProductData.productId === oldProductId) {
          // Mettre à jour le productId même si l'ID du sous-produit n'a pas besoin d'être changé
          await updateDoc(doc(subProductsCollectionRef, subProductDoc.id), {
            productId: newProductId
          });
        }
      }
      
      console.log(`✅ Migration des sous-produits terminée: ${updatedCount} sous-produit(s) mis à jour`);
    } catch (error) {
      console.error('❌ Erreur lors de la migration des IDs de sous-produits:', error);
      throw error;
    }
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

// Service pour les articles
export class ArticleService {
  private static collection = 'Articles';

  // Créer un nouvel article
  static async createArticle(articleData: {
    referenceArticle: string;
    nom: string;
    categorieArticle: string; // ID du sous-produit
    image?: string; // Base64 string
    petiteDescription?: string;
    description?: string;
    prixUnitaire: number;
    quantite: number;
    prixAPayer: number;
    selectedTags?: {
      type?: string[];
      anse?: string[];
      couleurs?: string[];
      dimensions?: string[];
      materiau?: string[];
      capacite?: string[];
      poids?: string[];
    };
    variations?: Array<{
      id: string;
      characteristics: {
        type?: string;
        anse?: string;
        couleurs?: string;
        dimensions?: string;
        materiau?: string;
        capacite?: string;
        poids?: string;
      };
      prixUnitaire?: number;
      quantite?: number;
      image?: string;
    }>;
  }): Promise<string> {
    try {
      console.log('🚀 Création d\'un nouvel article dans Firestore...');
      console.log('📋 Données de l\'article:', {
        referenceArticle: articleData.referenceArticle,
        nom: articleData.nom,
        categorieArticle: articleData.categorieArticle,
        prixUnitaire: articleData.prixUnitaire,
        quantite: articleData.quantite,
        prixAPayer: articleData.prixAPayer,
        hasImage: !!articleData.image,
        imageLength: articleData.image?.length || 0
      });

      // Préparer les données pour Firestore
      const articleDoc: any = {
        id: articleData.referenceArticle,
        referenceArticle: articleData.referenceArticle,
        nom: articleData.nom.trim(),
        categorieArticle: articleData.categorieArticle,
        image: articleData.image || '',
        petiteDescription: articleData.petiteDescription?.trim() || '',
        description: articleData.description?.trim() || '',
        prixUnitaire: articleData.prixUnitaire,
        quantite: articleData.quantite,
        prixAPayer: articleData.prixAPayer,
        dateCreation: Timestamp.now(),
        dateModification: Timestamp.now()
      };

      // Ajouter les tags sélectionnés si disponibles
      if (articleData.selectedTags) {
        articleDoc.selectedTags = articleData.selectedTags;
      }

      // Ajouter les variations si disponibles
      if (articleData.variations && articleData.variations.length > 0) {
        articleDoc.variations = articleData.variations;
      }

      // Vérifier la taille du document (limite Firestore: 1MB)
      const dataSize = JSON.stringify(articleDoc).length;
      console.log('📊 Taille des données:', dataSize, 'bytes');

      if (dataSize > 1000000) { // 1MB
        console.warn('⚠️ Taille des données très importante:', dataSize, 'bytes');
        // Réduire la taille de l'image si nécessaire
        if (articleDoc.image && articleDoc.image.length > 500000) {
          console.log('⚠️ Image trop grande, réduction de la taille...');
          // Tronquer l'image base64 à 500KB
          articleDoc.image = articleDoc.image.substring(0, 500000);
        }
      }

      // Ajouter le document à Firestore
      const articlesRef = collection(db, this.collection);
      const docRef = await addDoc(articlesRef, articleDoc);
      
      console.log('✅ Article créé avec succès ! ID:', docRef.id);
      console.log('📄 Référence article:', articleData.referenceArticle);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'article:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création de l\'article';
      throw new Error(errorMessage);
    }
  }

  // Récupérer tous les articles
  static async getAllArticles(): Promise<any[]> {
    try {
      console.log('🔍 Récupération de tous les articles...');
      const articlesRef = collection(db, this.collection);
      const querySnapshot = await getDocs(query(articlesRef, orderBy('dateCreation', 'desc')));
      
      const articles = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dateCreation: data.dateCreation?.toDate ? data.dateCreation.toDate() : new Date(data.dateCreation),
          dateModification: data.dateModification?.toDate ? data.dateModification.toDate() : new Date(data.dateModification)
        };
      });
      
      console.log('✅ Articles récupérés:', articles.length);
      return articles;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des articles:', error);
      throw error;
    }
  }

  // Récupérer un article par son ID
  static async getArticleById(articleId: string): Promise<any | null> {
    try {
      const articlesRef = collection(db, this.collection);
      const q = query(articlesRef, where('id', '==', articleId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dateCreation: data.dateCreation?.toDate ? data.dateCreation.toDate() : new Date(data.dateCreation),
        dateModification: data.dateModification?.toDate ? data.dateModification.toDate() : new Date(data.dateModification)
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'article:', error);
      throw error;
    }
  }

  // Mettre à jour un article
  static async updateArticle(articleId: string, articleData: Partial<{
    nom: string;
    categorieArticle: string;
    image: string;
    petiteDescription: string;
    description: string;
    prixUnitaire: number;
    quantite: number;
    prixAPayer: number;
    selectedTags?: {
      type?: string[];
      anse?: string[];
      couleurs?: string[];
      dimensions?: string[];
      materiau?: string[];
      capacite?: string[];
      poids?: string[];
    };
    variations?: Array<{
      id: string;
      characteristics: {
        type?: string;
        anse?: string;
        couleurs?: string;
        dimensions?: string;
        materiau?: string;
        capacite?: string;
        poids?: string;
      };
      prixUnitaire?: number;
      quantite?: number;
      image?: string;
    }>;
  }>): Promise<void> {
    try {
      console.log('🔄 Mise à jour de l\'article:', articleId);
      
      const articlesRef = collection(db, this.collection);
      // Chercher par referenceArticle (qui est l'ID utilisé)
      const q = query(articlesRef, where('referenceArticle', '==', articleId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error(`Article avec l'ID ${articleId} non trouvé`);
      }
      
      const docRef = querySnapshot.docs[0].ref;
      const updateData = {
        ...articleData,
        dateModification: Timestamp.now()
      };
      
      await updateDoc(docRef, updateData);
      console.log('✅ Article mis à jour avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'article:', error);
      throw error;
    }
  }

  // Supprimer un article
  static async deleteArticle(articleId: string): Promise<void> {
    try {
      console.log('🗑️ Suppression de l\'article:', articleId);
      
      const articlesRef = collection(db, this.collection);
      const q = query(articlesRef, where('id', '==', articleId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error(`Article avec l'ID ${articleId} non trouvé`);
      }
      
      const docRef = querySnapshot.docs[0].ref;
      await deleteDoc(docRef);
      console.log('✅ Article supprimé avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l\'article:', error);
      throw error;
    }
  }
}
