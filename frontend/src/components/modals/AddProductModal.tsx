import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { Product } from '../../types';
import { ProductService } from '../../services/firebaseService';
import AddTagModal from './AddTagModal';
import { Timestamp } from 'firebase/firestore';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

interface AddProductModalProps {
  show: boolean;
  onHide: () => void;
  onProductAdded: () => void;
  onAlert: (type: 'success' | 'danger', message: string) => void;
  initialProduct?: Product;
  isEditMode?: boolean;
}

// Types de caractéristiques de base
const baseCharacteristicTypes = [
  { key: 'type', label: 'Type' },
  { key: 'anse', label: 'Anse' },
  { key: 'couleurs', label: 'Couleurs' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'materiau', label: 'Matière' },
  { key: 'capacite', label: 'Capacité' },
  { key: 'poids', label: 'Poids' },
  { key: 'qualite', label: 'Qualité' },
  { key: 'manches', label: 'Manches' },
  { key: 'col', label: 'Col' }
];

const AddProductModal: React.FC<AddProductModalProps> = ({
  show,
  onHide,
  onProductAdded,
  onAlert,
  initialProduct,
  isEditMode = false
}) => {
  const [newProduct, setNewProduct] = useState({
    nom: '',
    categorie: '',
    images: [] as string[],
    imageFiles: [] as File[],
    description: '',
    fournisseur: {
      nom: '',
      ville: ''
    },
    type: '',
    anse: '',
    couleurs: '',
    dimensions: '',
    materiau: '',
    capacite: '',
    poids: '',
    qualite: '',
    manches: '',
    col: '',
    prix: 0,
    stock: 0
  });

  // État pour stocker le produit complet rechargé depuis Firebase
  const [fullProductData, setFullProductData] = useState<any>(null);

  // Initialiser les valeurs en mode édition
  useEffect(() => {
    // Utiliser fullProductData si disponible (produit complet rechargé), sinon initialProduct
    const productToUse = fullProductData || initialProduct;
    
    if (isEditMode && productToUse) {
      console.log('🔧 Mode édition activé pour le produit:', productToUse);
      console.log('📊 Données du produit:', {
        type: productToUse.type,
        anse: productToUse.anse,
        couleurs: productToUse.couleurs,
        dimensions: productToUse.dimensions,
        materiau: productToUse.materiau,
        capacite: productToUse.capacite,
        poids: productToUse.poids,
        qualite: (productToUse as any).qualite,
        manches: (productToUse as any).manches,
        col: (productToUse as any).col,
        image: productToUse.image,
        images: (productToUse as any).images
      });
      
      // Gestion des images : priorité aux images multiples, sinon fallback sur l'image unique
      let productImages: string[] = [];
      if (Array.isArray((productToUse as any).images) && (productToUse as any).images.length > 0) {
        productImages = (productToUse as any).images;
        console.log('🖼️ Images multiples trouvées:', productImages.length, productImages);
      } else if (productToUse.image && productToUse.image !== '/placeholder-product.jpg' && productToUse.image !== '/mug.webp') {
        productImages = [productToUse.image];
        console.log('🖼️ Image unique trouvée:', productImages[0]);
      } else {
        console.log('🖼️ Aucune image trouvée');
      }
      
      setNewProduct({
        nom: productToUse.nom || '',
        categorie: productToUse.categorie || '',
        images: productImages,
        imageFiles: [],
        description: productToUse.description || '',
        fournisseur: {
          nom: productToUse.fournisseur?.nom || '',
          ville: productToUse.fournisseur?.ville || ''
        },
        type: Array.isArray(productToUse.type) ? productToUse.type.join(', ') : '',
        anse: Array.isArray(productToUse.anse) ? productToUse.anse.join(', ') : '',
        couleurs: Array.isArray(productToUse.couleurs) ? productToUse.couleurs.join(', ') : '',
        dimensions: Array.isArray(productToUse.dimensions) ? productToUse.dimensions.join(', ') : '',
        materiau: Array.isArray(productToUse.materiau) ? productToUse.materiau.join(', ') : '',
        capacite: Array.isArray(productToUse.capacite) ? productToUse.capacite.join(', ') : '',
        poids: Array.isArray(productToUse.poids) ? productToUse.poids.join(', ') : '',
        qualite: Array.isArray((productToUse as any).qualite) ? (productToUse as any).qualite.join(', ') : '',
        manches: Array.isArray((productToUse as any).manches) ? (productToUse as any).manches.join(', ') : '',
        col: Array.isArray((productToUse as any).col) ? (productToUse as any).col.join(', ') : '',
        prix: productToUse.prix || 0,
        stock: productToUse.stock || 0
      });

      // Initialiser les tags visuels avec les données du produit (de base + personnalisées)
      const initialTags: any = {
        type: Array.isArray(productToUse.type) ? productToUse.type : [],
        anse: Array.isArray(productToUse.anse) ? productToUse.anse : [],
        couleurs: Array.isArray(productToUse.couleurs) ? productToUse.couleurs : [],
        dimensions: Array.isArray(productToUse.dimensions) ? productToUse.dimensions : [],
        materiau: Array.isArray(productToUse.materiau) ? productToUse.materiau : [],
        capacite: Array.isArray(productToUse.capacite) ? productToUse.capacite : [],
        poids: Array.isArray(productToUse.poids) ? productToUse.poids : [],
        qualite: Array.isArray((productToUse as any).qualite) ? (productToUse as any).qualite : [],
        manches: Array.isArray((productToUse as any).manches) ? (productToUse as any).manches : [],
        col: Array.isArray((productToUse as any).col) ? (productToUse as any).col : []
      };
      
      // Ajouter toutes les caractéristiques personnalisées qui existent dans le produit
      const standardFields = ['id', 'nom', 'description', 'prix', 'image', 'images', 'categorie', 'stock', 'fournisseur', 'dateCreation', 'dateModification', 'type', 'anse', 'couleurs', 'dimensions', 'materiau', 'capacite', 'poids', 'qualite', 'manches', 'col'];
      Object.keys(productToUse).forEach(key => {
        if (!standardFields.includes(key)) {
          const value = (productToUse as any)[key];
          if (Array.isArray(value)) {
            initialTags[key] = value;
          }
        }
      });
      
      console.log('🏷️ Tags initialisés (base + personnalisées):', initialTags);
      setTags(initialTags);
    }
  }, [isEditMode, initialProduct, fullProductData]);

  // Réinitialiser les états quand la modale se ferme
  useEffect(() => {
    if (!show) {
      setNewProduct({
        nom: '',
        categorie: '',
        images: [],
        imageFiles: [],
        description: '',
        fournisseur: {
          nom: '',
          ville: ''
        },
        type: '',
        anse: '',
        couleurs: '',
        dimensions: '',
        materiau: '',
        capacite: '',
        poids: '',
        qualite: '',
        manches: '',
        col: '',
        prix: 0,
        stock: 0
      });
      
      setTags({
        type: [],
        anse: [],
        couleurs: [],
        dimensions: [],
        materiau: [],
        capacite: [],
        poids: [],
        qualite: [],
        manches: [],
        col: []
      });
    }
  }, [show]);
  
  // État pour la modal d'ajout de tag
  const [showTagModal, setShowTagModal] = useState(false);
  const [currentTagField, setCurrentTagField] = useState<keyof typeof newProduct>('type');
  const [tagInputValue, setTagInputValue] = useState('');
  
  // États pour les tags visuels
  const [tags, setTags] = useState({
    type: [] as string[],
    anse: [] as string[],
    couleurs: [] as string[],
    dimensions: [] as string[],
    materiau: [] as string[],
    capacite: [] as string[],
    poids: [] as string[],
    qualite: [] as string[],
    manches: [] as string[],
    col: [] as string[]
  });

  // États pour les caractéristiques dynamiques
  const [customLabels, setCustomLabels] = useState<Map<string, string>>(new Map());
  const [customCharacteristics, setCustomCharacteristics] = useState<Array<{ key: string; label: string }>>([]);
  const [availableCharacteristics, setAvailableCharacteristics] = useState<Array<{ key: string; label: string }>>([]);
  // État pour stocker toutes les valeurs disponibles pour chaque caractéristique (depuis tous les produits)
  const [allAvailableValues, setAllAvailableValues] = useState<Map<string, string[]>>(new Map());

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    console.log('📁 Fichiers sélectionnés:', files.map(f => f.name));
    
    if (files.length > 0) {
      const validFiles: File[] = [];
      const validPreviews: string[] = [];
      
      files.forEach(file => {
        // Vérifier le type de fichier
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          onAlert('danger', `Format de fichier non supporté pour ${file.name}. Utilisez JPG, JPEG, PNG ou WEBP.`);
          return;
        }
        
        // Vérifier la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          onAlert('danger', `Le fichier ${file.name} est trop volumineux. Taille maximale: 5MB.`);
          return;
        }

        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      });

      if (validFiles.length > 0) {
        console.log('✅ Fichiers valides ajoutés:', validFiles.map(f => f.name));
        setNewProduct(prev => ({
          ...prev,
          imageFiles: [...prev.imageFiles, ...validFiles],
          images: [...prev.images, ...validPreviews]
        }));
      }
      
      // Réinitialiser l'input pour permettre la sélection des mêmes fichiers
      event.target.value = '';
    }
  }, [onAlert]);

  const handleImageDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    console.log('📁 Fichiers glissés-déposés:', files.map(f => f.name));
    
    if (files.length > 0) {
      const validFiles: File[] = [];
      const validPreviews: string[] = [];
      
      files.forEach(file => {
        // Vérifier le type de fichier
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          onAlert('danger', `Format de fichier non supporté pour ${file.name}. Utilisez JPG, JPEG, PNG ou WEBP.`);
          return;
        }
        
        // Vérifier la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          onAlert('danger', `Le fichier ${file.name} est trop volumineux. Taille maximale: 5MB.`);
          return;
        }

        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      });

      if (validFiles.length > 0) {
        console.log('✅ Fichiers valides ajoutés via drag&drop:', validFiles.map(f => f.name));
        setNewProduct(prev => ({
          ...prev,
          imageFiles: [...prev.imageFiles, ...validFiles],
          images: [...prev.images, ...validPreviews]
        }));
      }
    }
  }, [onAlert]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const removeImage = useCallback((index: number) => {
    console.log('🗑️ Suppression de l\'image à l\'index:', index);
    console.log('🗑️ État avant suppression:', {
      imagesCount: newProduct.images.length,
      imageFilesCount: newProduct.imageFiles.length,
      images: newProduct.images,
      imageFiles: newProduct.imageFiles.map(f => f.name)
    });
    
    setNewProduct(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      // Pour les imageFiles, on doit être plus prudent car il peut y avoir un décalage
      // On garde seulement les fichiers qui correspondent aux images restantes
      const newImageFiles = prev.imageFiles.filter((_, i) => i !== index);
      
      console.log('🗑️ Images après suppression:', {
        imagesCount: newImages.length,
        imageFilesCount: newImageFiles.length,
        newImages: newImages,
        newImageFiles: newImageFiles.map(f => f.name)
      });
      
      return {
        ...prev,
        imageFiles: newImageFiles,
        images: newImages
      };
    });
  }, []);

  const removeAllImages = useCallback(() => {
    console.log('🗑️ Suppression de toutes les images');
    setNewProduct(prev => ({
      ...prev,
      imageFiles: [],
      images: []
    }));
  }, []);

  // Charger les labels personnalisés depuis Firebase
  const loadCustomLabels = useCallback(async () => {
    try {
      const labelsDocRef = doc(db, 'Settings', 'characteristicLabels');
      const labelsDoc = await getDoc(labelsDocRef);
      
      if (labelsDoc.exists()) {
        const labelsData = labelsDoc.data();
        const labelsMap = new Map<string, string>();
        
        Object.entries(labelsData).forEach(([key, value]) => {
          if (typeof value === 'string') {
            labelsMap.set(key, value);
          }
        });
        
        setCustomLabels(labelsMap);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des labels personnalisés:', error);
    }
  }, []);

  // Charger toutes les valeurs disponibles pour chaque caractéristique depuis tous les produits
  const loadAllAvailableValues = useCallback(async () => {
    try {
      console.log('🔄 Chargement de toutes les valeurs disponibles depuis Firebase...');
      const allProducts = await ProductService.getAllProducts();
      
      const standardFields = ['id', 'nom', 'description', 'prix', 'image', 'images', 'categorie', 'stock', 'fournisseur', 'dateCreation', 'dateModification'];
      
      // Map pour stocker toutes les valeurs uniques pour chaque caractéristique
      const valuesMap = new Map<string, Set<string>>();
      
      // Parcourir tous les produits pour collecter toutes les valeurs
      allProducts.forEach(product => {
        Object.keys(product).forEach(key => {
          if (!standardFields.includes(key)) {
            const value = product[key as keyof Product];
            if (Array.isArray(value) && value.length > 0) {
              // Ajouter les valeurs à la map
              if (!valuesMap.has(key)) {
                valuesMap.set(key, new Set<string>());
              }
              value.forEach(v => {
                if (typeof v === 'string' && v.trim()) {
                  valuesMap.get(key)!.add(v.trim());
                }
              });
            }
          }
        });
      });

      // Convertir les Sets en tableaux pour le state
      const valuesMapArray = new Map<string, string[]>();
      valuesMap.forEach((valueSet, key) => {
        valuesMapArray.set(key, Array.from(valueSet).sort());
      });
      setAllAvailableValues(valuesMapArray);

      console.log('✅ Toutes les valeurs disponibles chargées:', {
        characteristicsCount: valuesMapArray.size,
        valuesPerCharacteristic: Array.from(valuesMapArray.entries()).map(([key, values]) => ({
          key,
          valuesCount: values.length,
          values: values.slice(0, 5) // Afficher les 5 premières valeurs pour le debug
        }))
      });
    } catch (error) {
      console.error('❌ Erreur lors du chargement des valeurs disponibles:', error);
    }
  }, []);

  // Déterminer les caractéristiques disponibles pour le produit spécifique
  const determineAvailableCharacteristics = useCallback((product: Product | undefined, labelsMap?: Map<string, string>) => {
    if (!product) {
      console.log('⚠️ Aucun produit fourni pour déterminer les caractéristiques');
      setAvailableCharacteristics([]);
      return;
    }

    // Utiliser le labelsMap passé en paramètre ou le state customLabels
    const labelsToUse = labelsMap || customLabels;

    console.log('🔍 Détermination des caractéristiques pour le produit:', product.id, product.nom);
    console.log('📋 Labels disponibles:', Array.from(labelsToUse.entries()));

    const standardFields = ['id', 'nom', 'description', 'prix', 'image', 'images', 'categorie', 'stock', 'fournisseur', 'dateCreation', 'dateModification'];
    
    // Construire la liste uniquement à partir des caractéristiques qui existent réellement dans le produit
    const available: Array<{ key: string; label: string }> = [];
    
    // Parcourir toutes les clés du produit pour trouver les caractéristiques existantes
    const allKeys = Object.keys(product);
    console.log('🔑 Toutes les clés du produit:', allKeys);
    
    allKeys.forEach(key => {
      // Ignorer les champs standards
      if (standardFields.includes(key)) {
        return;
      }
      
      const value = product[key as keyof Product];
      console.log(`🔍 Vérification clé "${key}":`, {
        value,
        isArray: Array.isArray(value),
        length: Array.isArray(value) ? value.length : 'N/A',
        isUndefined: value === undefined,
        isNull: value === null
      });
      
      // Vérifier que la valeur existe, n'est pas undefined, est un tableau ET n'est pas vide
      if (value !== undefined && value !== null && Array.isArray(value) && value.length > 0) {
        // Chercher le label dans les caractéristiques de base
        const baseChar = baseCharacteristicTypes.find(ct => ct.key === key);
        if (baseChar) {
          console.log(`✅ Caractéristique de base trouvée: ${key} -> ${baseChar.label}`);
          available.push(baseChar);
        } else {
          // C'est une caractéristique personnalisée
          // Chercher d'abord dans les labels personnalisés
          const customLabel = labelsToUse.get(key);
          if (customLabel) {
            console.log(`✅ Caractéristique personnalisée trouvée avec label: ${key} -> ${customLabel}`);
            available.push({ key, label: customLabel });
          } else {
            // Sinon générer un label par défaut
            const label = key
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            console.log(`✅ Caractéristique personnalisée avec label généré: ${key} -> ${label}`);
            available.push({ key, label });
          }
        }
      } else {
        console.log(`⏭️ Clé "${key}" ignorée (pas un tableau non vide)`);
      }
    });

    // Appliquer les labels personnalisés
    const characteristicsWithLabels = available.map(charType => {
      const customLabel = labelsToUse.get(charType.key);
      return customLabel ? { ...charType, label: customLabel } : charType;
    });

    console.log('✅ Caractéristiques disponibles pour le produit:', {
      productId: product.id,
      productName: product.nom,
      availableCount: characteristicsWithLabels.length,
      available: characteristicsWithLabels.map(c => ({ key: c.key, label: c.label })),
      allProductKeys: Object.keys(product).filter(k => !standardFields.includes(k)),
      productCharacteristics: Object.keys(product)
        .filter(k => !standardFields.includes(k))
        .map(k => ({
          key: k,
          value: product[k as keyof Product],
          isArray: Array.isArray(product[k as keyof Product]),
          length: Array.isArray(product[k as keyof Product]) ? (product[k as keyof Product] as any[]).length : 0
        }))
    });

    setAvailableCharacteristics(characteristicsWithLabels);
  }, [customLabels]);

  // Charger les données au montage et quand la modale s'ouvre
  useEffect(() => {
    if (show) {
      // Charger d'abord les labels personnalisés et toutes les valeurs disponibles
      const loadData = async () => {
        await loadCustomLabels();
        await loadAllAvailableValues();
        
        // Ensuite, déterminer les caractéristiques du produit spécifique (si en mode édition)
        if (isEditMode && initialProduct) {
          try {
            // Recharger le produit depuis Firebase pour être sûr d'avoir TOUTES les caractéristiques
            // Le document ID Firebase est le nom du produit transformé en slug, pas l'ID GRA-XXX
            // Donc on doit chercher par le champ 'id' (GRA-XXX)
            console.log('🔄 Rechargement du produit depuis Firebase pour obtenir toutes les caractéristiques...');
            console.log('🔍 Recherche du produit avec ID:', initialProduct.id);
            
            // Chercher le document par le champ 'id' (GRA-XXX) au lieu du document ID
            const productsCollection = collection(db, 'Produits');
            const q = query(productsCollection, where('id', '==', initialProduct.id));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty && querySnapshot.docs.length > 0) {
              const productDoc = querySnapshot.docs[0];
              console.log('✅ Produit trouvé dans Firebase avec document ID:', productDoc.id);
              
            if (productDoc.exists()) {
              const productData = productDoc.data();
              console.log('📦 Données complètes du produit depuis Firebase:', productData);
              
              // Construire un produit complet avec SEULEMENT les caractéristiques qui ont des valeurs
              const standardFieldsList = ['id', 'nom', 'description', 'prix', 'image', 'images', 'categorie', 'stock', 'fournisseur', 'dateCreation', 'dateModification'];
              
              const fullProduct: any = {
                id: productData.id || productDoc.id,
                nom: productData.nom || '',
                description: productData.description || '',
                prix: productData.prix || 0,
                image: productData.image || '',
                images: Array.isArray(productData.images) ? productData.images : [],
                categorie: productData.categorie || '',
                stock: productData.stock || 0,
                fournisseur: productData.fournisseur || { nom: '', ville: '' },
                dateCreation: productData.dateCreation?.toDate() || new Date(),
                dateModification: productData.dateModification?.toDate() || new Date(),
              };
              
              // Ajouter UNIQUEMENT les caractéristiques qui sont des tableaux non vides
              Object.keys(productData).forEach(key => {
                if (!standardFieldsList.includes(key)) {
                  const value = productData[key];
                  // Ne garder que les caractéristiques qui sont des tableaux non vides
                  if (Array.isArray(value) && value.length > 0) {
                    fullProduct[key] = value;
                  }
                }
              });
              
              console.log('✅ Produit filtré depuis Firebase (seulement caractéristiques avec valeurs):', fullProduct);
              console.log('🔑 Clés du produit filtré:', Object.keys(fullProduct));
              console.log('📊 Caractéristiques du produit:', Object.keys(fullProduct).filter(k => !standardFieldsList.includes(k)));
              
              // Stocker le produit filtré pour l'utiliser dans l'initialisation des tags
              setFullProductData(fullProduct);
              
              // Récupérer les labels depuis Firebase directement
              const labelsDocRef = doc(db, 'Settings', 'characteristicLabels');
              const labelsDoc = await getDoc(labelsDocRef);
              const labelsMap = new Map<string, string>();
              if (labelsDoc.exists()) {
                const labelsData = labelsDoc.data();
                Object.entries(labelsData).forEach(([key, value]) => {
                  if (typeof value === 'string') {
                    labelsMap.set(key, value);
                  }
                });
              }
              
              console.log('📋 Labels chargés pour déterminer les caractéristiques:', Array.from(labelsMap.entries()));
              console.log('🎯 Appel de determineAvailableCharacteristics avec le produit filtré');
              determineAvailableCharacteristics(fullProduct, labelsMap);
            } else {
              console.error('❌ Document produit existe mais est vide');
              determineAvailableCharacteristics(initialProduct);
            }
            } else {
              console.error('❌ Produit non trouvé dans Firebase avec ID:', initialProduct.id);
              determineAvailableCharacteristics(initialProduct);
            }
          } catch (error) {
            console.error('❌ Erreur lors du rechargement du produit:', error);
            // En cas d'erreur, utiliser le produit initial
            determineAvailableCharacteristics(initialProduct);
          }
        } else if (!isEditMode) {
          // En mode création, aucune caractéristique n'est affichée
          setAvailableCharacteristics([]);
        }
      };
      loadData();
    }
  }, [show, isEditMode, initialProduct, loadCustomLabels, loadAllAvailableValues, determineAvailableCharacteristics]);

  // Recharger les caractéristiques quand customLabels change (après chargement)
  useEffect(() => {
    if (show && isEditMode && customLabels.size > 0) {
      // Utiliser fullProductData si disponible (produit filtré depuis Firebase), sinon initialProduct
      const productToUse = fullProductData || initialProduct;
      if (productToUse) {
        console.log('🔄 Rechargement des caractéristiques après chargement des labels');
        console.log('📦 Produit utilisé:', productToUse.id, productToUse.nom);
        // Récupérer les labels depuis Firebase directement
        const loadLabelsAndDetermine = async () => {
          try {
            const labelsDocRef = doc(db, 'Settings', 'characteristicLabels');
            const labelsDoc = await getDoc(labelsDocRef);
            const labelsMap = new Map<string, string>();
            if (labelsDoc.exists()) {
              const labelsData = labelsDoc.data();
              Object.entries(labelsData).forEach(([key, value]) => {
                if (typeof value === 'string') {
                  labelsMap.set(key, value);
                }
              });
            }
            determineAvailableCharacteristics(productToUse, labelsMap);
          } catch (error) {
            console.error('❌ Erreur lors du chargement des labels:', error);
            determineAvailableCharacteristics(productToUse);
          }
        };
        loadLabelsAndDetermine();
      }
    }
  }, [customLabels, show, isEditMode, fullProductData, initialProduct, determineAvailableCharacteristics]);

  // Fonction helper pour obtenir la couleur du badge selon le type de caractéristique
  const getBadgeColor = (key: string): string => {
    const colorMap: { [key: string]: string } = {
      type: 'primary',
      anse: 'info',
      couleurs: 'warning',
      dimensions: 'success',
      materiau: 'dark',
      capacite: 'secondary',
      poids: 'light',
      qualite: 'primary',
      manches: 'info',
      col: 'success'
    };
    return colorMap[key] || 'secondary';
  };

  const openTagModal = useCallback((field: keyof typeof newProduct) => {
    setCurrentTagField(field);
    setTagInputValue('');
    setShowTagModal(true);
  }, []);

  const addTagFromModal = useCallback(() => {
    const tagValue = tagInputValue.trim();
    
    if (tagValue) {
      // Vérifier que currentTagField est un champ de caractéristique valide
      const characteristicFields = ['type', 'anse', 'couleurs', 'dimensions', 'materiau', 'capacite', 'poids', 'qualite', 'manches', 'col'];
      
      if (characteristicFields.includes(currentTagField)) {
        // Ajouter au tableau des tags
        setTags(prev => {
          const currentTags = prev[currentTagField as keyof typeof prev];
          if (!currentTags.includes(tagValue)) {
            return {
              ...prev,
              [currentTagField]: [...currentTags, tagValue]
            };
          }
          return prev;
        });
        
        // Mettre à jour aussi le champ texte pour la sauvegarde
        setNewProduct(prev => {
          const currentValue = prev[currentTagField] as string;
          const existingValues = currentValue ? currentValue.split(',').map(v => v.trim()) : [];
          
          if (!existingValues.includes(tagValue)) {
            const newValue = currentValue ? `${currentValue}, ${tagValue}` : tagValue;
            return {
              ...prev,
              [currentTagField]: newValue
            };
          }
          return prev;
        });
      }
      
      setShowTagModal(false);
      setTagInputValue('');
    }
  }, [tagInputValue, currentTagField]);

  const removeTag = useCallback((field: keyof typeof tags, tagToRemove: string) => {
    // Supprimer du tableau des tags
    setTags(prev => ({
      ...prev,
      [field]: prev[field].filter(tag => tag !== tagToRemove)
    }));
    
    // Mettre à jour le champ texte
    setNewProduct(prev => {
      const currentValue = prev[field] as string;
      const updatedValues = currentValue ? currentValue.split(',').map(v => v.trim()).filter(v => v !== tagToRemove) : [];
      return {
        ...prev,
        [field]: updatedValues.join(', ')
      };
    });
  }, []);

  const handleAddProduct = useCallback(async () => {
    console.log('🚀 handleAddProduct appelé');
    console.log('📝 Mode édition:', isEditMode);
    console.log('📝 Produit initial:', initialProduct);
    console.log('📝 Nouvelles données:', newProduct);
    
    try {
      // Validation des champs obligatoires
      if (!newProduct.nom.trim()) {
        console.log('❌ Validation échouée: nom vide');
        onAlert('danger', 'Le nom du produit est obligatoire');
        return;
      }
      
      console.log('✅ Validation réussie, traitement en cours...');
      

      // Gestion intelligente des images
      let imageUrls: string[] = [];
      
      console.log('🖼️ Traitement des images:', {
        imagesCount: newProduct.images.length,
        imageFilesCount: newProduct.imageFiles.length,
        images: newProduct.images,
        imageFiles: newProduct.imageFiles.map(f => f.name)
      });
      
      // Si des images ont été sélectionnées
      if (newProduct.images && newProduct.images.length > 0) {
        // Traiter chaque image dans l'ordre
        for (let i = 0; i < newProduct.images.length; i++) {
          const image = newProduct.images[i];
          
          console.log(`🖼️ Traitement de l'image ${i + 1}/${newProduct.images.length}:`, {
            image: image,
            isBlob: image?.startsWith('blob:'),
            totalImages: newProduct.images.length,
            totalFiles: newProduct.imageFiles.length
          });
          
          if (image && image !== '/placeholder-product.jpg' && image !== '/mug.webp') {
            if (image.startsWith('blob:')) {
              // Convertir l'image blob en base64 pour la sauvegarder
              try {
                console.log('🔄 Conversion blob vers base64...');
                const response = await fetch(image);
                const blob = await response.blob();
                
                const base64Promise = new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    console.log('✅ Conversion base64 réussie');
                    resolve(reader.result as string);
                  };
                  reader.onerror = () => {
                    console.error('❌ Erreur de lecture du fichier');
                    reject(new Error('Erreur de lecture du fichier'));
                  };
                  reader.readAsDataURL(blob);
                });
                
                const base64Image = await base64Promise;
                imageUrls.push(base64Image);
                console.log(`✅ Image ${i + 1} base64 ajoutée aux URLs (total: ${imageUrls.length})`);
              } catch (error) {
                console.error('❌ Erreur lors de la conversion de l\'image:', error);
                // En cas d'erreur, utiliser l'image par défaut
                imageUrls.push('/mug.webp');
              }
            } else {
              // Image déjà sauvegardée (URL ou base64)
              console.log('📷 Image déjà sauvegardée, ajout direct');
              imageUrls.push(image);
            }
          } else {
            console.log('⚠️ Image ignorée (placeholder ou image par défaut)');
          }
        }
      }
      
      // Si aucune image valide, utiliser l'image par défaut
      if (imageUrls.length === 0) {
        console.log('🖼️ Aucune image valide, utilisation de l\'image par défaut');
        imageUrls = ['/mug.webp'];
      }
      
      console.log('🖼️ URLs finales des images:', imageUrls.length, imageUrls);
      
      // Préparer les données du produit avec les tags
      const productData = {
        nom: newProduct.nom.trim(),
        categorie: newProduct.categorie.trim(),
        image: imageUrls[0] || '/mug.webp', // Image principale (première image)
        images: imageUrls,
        description: newProduct.description.trim(),
        fournisseur: {
          nom: '',
          ville: ''
        },
        // Utiliser directement les tags des tableaux
        type: tags.type,
        anse: tags.anse,
        couleurs: tags.couleurs,
        dimensions: tags.dimensions,
        materiau: tags.materiau,
        capacite: tags.capacite,
        poids: tags.poids,
        qualite: tags.qualite,
        manches: tags.manches,
        col: tags.col,
        prix: 0, // Valeur par défaut
        stock: 0, // Valeur par défaut
        // Ajouter les dates requises
        dateCreation: isEditMode && initialProduct ? 
          (initialProduct.dateCreation instanceof Date ? 
            initialProduct.dateCreation : 
            (initialProduct.dateCreation as any)?.toDate ? 
              (initialProduct.dateCreation as any).toDate() : 
              new Date()) : 
          new Date(),
        dateModification: new Date()
      };

      console.log('💾 Données à sauvegarder:', {
        qualite: productData.qualite,
        manches: productData.manches,
        col: productData.col,
        tagsQualite: tags.qualite,
        tagsManches: tags.manches,
        tagsCol: tags.col
      });

      console.log('📊 Données finales du produit:', {
        nom: productData.nom,
        image: productData.image,
        imagesCount: productData.images.length,
        images: productData.images,
        mode: isEditMode ? 'édition' : 'création'
      });

      if (isEditMode && initialProduct) {
        console.log('🚀 Début de la mise à jour du produit...');
        // Créer un objet compatible avec le type attendu
        const updateData = {
          ...productData,
          dateCreation: productData.dateCreation,
          dateModification: productData.dateModification
        };
        console.log('📞 Appel de updateProductWithIdChange...');
        try {
          const newProductId = await ProductService.updateProductWithIdChange(initialProduct.id, updateData);
          console.log('✅ Produit mis à jour avec succès dans Firebase !');
          console.log('🆔 ID du produit retourné:', newProductId);
        } catch (updateError) {
          console.error('❌ Erreur lors de la mise à jour:', updateError);
          throw updateError;
        }
      } else {
        console.log('🚀 Début de la création du produit...');
        await ProductService.createProduct(productData);
        console.log('✅ Produit créé avec succès dans Firebase !');
      }
      
      console.log('🏁 Mise à jour terminée, continuation du processus...');
      console.log('📢 Affichage du message de succès...');
      if (isEditMode) {
        const oldName = initialProduct?.nom || '';
        const newName = productData.nom;
        if (oldName !== newName) {
          onAlert('success', `Produit mis à jour avec succès ! Nom changé de "${oldName}" à "${newName}"`);
        } else {
          onAlert('success', 'Produit mis à jour avec succès');
        }
      } else {
        onAlert('success', 'Produit ajouté avec succès');
      }
      
      console.log('🔄 Rafraîchissement de la liste des produits...');
      onProductAdded(); // Rafraîchir la liste des produits
      
      console.log('🔄 Fermeture de la modale...');
      onHide();
      
      console.log('🎉 Processus d\'ajout terminé avec succès !');
      
      // Réinitialiser le formulaire
      setNewProduct({
        nom: '',
        categorie: '',
        images: [],
        imageFiles: [],
        description: '',
        fournisseur: { nom: '', ville: '' },
        type: '',
        anse: '',
        couleurs: '',
        dimensions: '',
        materiau: '',
        capacite: '',
        poids: '',
        qualite: '',
        manches: '',
        col: '',
        prix: 0,
        stock: 0
      });
      
      // Réinitialiser les tags
      setTags({
        type: [],
        anse: [],
        couleurs: [],
        dimensions: [],
        materiau: [],
        capacite: [],
        poids: [],
        qualite: [],
        manches: [],
        col: []
      });
      
      // Réinitialiser la modal de tag
      setShowTagModal(false);
      setTagInputValue('');
      
      onProductAdded();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du produit:', error);
      
      // Afficher le message d'erreur spécifique
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'ajout du produit';
      onAlert('danger', errorMessage);
    }
  }, [newProduct, tags, isEditMode, initialProduct, onAlert, onHide, onProductAdded, newProduct.imageFiles, newProduct.images]);

  return (
    <>
      <Modal 
        show={show} 
        onHide={onHide}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`bi ${isEditMode ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`}></i>
            {isEditMode ? 'Modifier le Produit' : 'Ajouter un Produit Principal'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Form>
            {/* Section 1: Informations sur le produit */}
            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <i className="bi bi-info-circle me-2"></i>
                Section 1: Informations sur le produit
              </h5>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nom du produit *</Form.Label>
                    <Form.Control
                      type="text"
                      value={newProduct.nom}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, nom: e.target.value }))}
                      placeholder="Ex: Mug Premium"
                      required
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Description du produit</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={newProduct.description}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Décrivez le produit..."
                      style={{ minHeight: '180px'}}
                    />
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Images du produit</Form.Label>
                    
                    {/* Zone d'upload */}
                    <div
                      className="image-upload-zone"
                      onDrop={handleImageDrop}
                      onDragOver={handleDragOver}
                      style={{
                        border: '2px dashed #dee2e6',
                        borderRadius: '8px',
                        padding: '20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        minHeight: '120px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '15px'
                      }}
                    >
                          <i className="bi bi-cloud-upload" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
                      <p className="mt-2 mb-1">Glissez-déposez des images ici</p>
                          <p className="text-muted small">ou</p>
                          <Form.Control
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                        multiple
                            style={{ display: 'none' }}
                            id="image-upload"
                          />
                          <Form.Label 
                            htmlFor="image-upload" 
                            className="btn btn-outline-primary btn-sm"
                            style={{ cursor: 'pointer' }}
                          >
                        Choisir des fichiers
                          </Form.Label>
                      <p className="text-muted small mt-2">JPG, JPEG, PNG, WEBP (max 5MB par image)</p>
                        </div>

                    {/* Affichage des images sélectionnées */}
                    {newProduct.images.length > 0 && (
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0">Images sélectionnées ({newProduct.images.length})</h6>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={removeAllImages}
                          >
                            <i className="bi bi-trash me-1"></i>
                            Tout supprimer
                          </Button>
                    </div>
                        <div className="row g-2">
                          {newProduct.images.map((image, index) => (
                            <div key={index} className="col-md-4">
                              <div className="position-relative">
                                <img 
                                  src={image} 
                                  alt={`Aperçu ${index + 1}`} 
                                  style={{ 
                                    width: '100%', 
                                    height: '100px', 
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    border: '1px solid #dee2e6'
                                  }}
                                />
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  className="position-absolute"
                                  style={{ 
                                    top: '5px', 
                                    right: '5px',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    padding: '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    removeImage(index);
                                  }}
                                >
                                  <i className="bi bi-x" style={{ fontSize: '12px' }}></i>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Section 2: Caractéristiques */}
            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <i className="bi bi-gear me-2"></i>
                Section 2: Caractéristiques
              </h5>
              
              {availableCharacteristics.length > 0 ? (
                    (() => {
                      // Créer les lignes par paires de caractéristiques
                      const rows: React.ReactElement[] = [];
                      for (let i = 0; i < availableCharacteristics.length; i += 2) {
                        const charType = availableCharacteristics[i];
                        const nextCharType = i + 1 < availableCharacteristics.length ? availableCharacteristics[i + 1] : null;
                        const charKey = charType.key as keyof typeof tags;
                        const charTags = tags[charKey] || [];
                        const badgeColor = getBadgeColor(charType.key);
                        // Utiliser les valeurs du produit spécifique (depuis tags ou fullProductData)
                        // Ne pas utiliser allAvailableValues qui contient toutes les valeurs de tous les produits
                        const productToUse = fullProductData || initialProduct;
                        const productValues = productToUse && (productToUse as any)[charType.key];
                        const availableValues = Array.isArray(productValues) && productValues.length > 0 
                          ? productValues 
                          : (charTags.length > 0 ? charTags : []);
                        
                        rows.push(
                          <Row key={`row-${i}`}>
                            <Col md={6}>
                              <Form.Group className="mb-3">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                  <Form.Label className="mb-0">{charType.label}</Form.Label>
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => openTagModal(charKey)}
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  >
                                    <i className="bi bi-plus me-1"></i>
                                    Ajouter une nouvelle valeur
                                  </Button>
                                </div>
                                <div className="tags-container">
                                  {availableValues.length > 0 ? (
                                    availableValues.map((value, index) => {
                                      const isSelected = charTags.includes(value);
                                      return (
                                        <span 
                                          key={index} 
                                          className={`tag-badge ${isSelected ? `bg-${badgeColor}` : `bg-outline-${badgeColor}`}`}
                                          onClick={() => {
                                            if (isSelected) {
                                              removeTag(charKey, value);
                                            } else {
                                              setTags(prev => ({
                                                ...prev,
                                                [charKey]: [...(prev[charKey] || []), value]
                                              }));
                                            }
                                          }}
                                          style={{ cursor: 'pointer' }}
                                        >
                                          {value}
                                          {isSelected && <i className="bi bi-check ms-1"></i>}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-muted">Aucune valeur disponible</span>
                                  )}
                                </div>
                              </Form.Group>
                            </Col>
                            {nextCharType && (
                              <Col md={6}>
                                {(() => {
                                  const nextCharKey = nextCharType.key as keyof typeof tags;
                                  const nextCharTags = tags[nextCharKey] || [];
                                  const nextBadgeColor = getBadgeColor(nextCharType.key);
                                  // Utiliser les valeurs du produit spécifique (depuis tags ou fullProductData)
                                  // Ne pas utiliser allAvailableValues qui contient toutes les valeurs de tous les produits
                                  const productToUse = fullProductData || initialProduct;
                                  const nextProductValues = productToUse && (productToUse as any)[nextCharType.key];
                                  const nextAvailableValues = Array.isArray(nextProductValues) && nextProductValues.length > 0 
                                    ? nextProductValues 
                                    : (nextCharTags.length > 0 ? nextCharTags : []);
                                  
                                  return (
                                    <Form.Group className="mb-3">
                                      <div className="d-flex align-items-center justify-content-between mb-2">
                                        <Form.Label className="mb-0">{nextCharType.label}</Form.Label>
                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          onClick={() => openTagModal(nextCharKey)}
                                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                        >
                                          <i className="bi bi-plus me-1"></i>
                                          Ajouter une nouvelle valeur
                                        </Button>
                                      </div>
                                      <div className="tags-container">
                                        {nextAvailableValues.length > 0 ? (
                                          nextAvailableValues.map((value, index) => {
                                            const isSelected = nextCharTags.includes(value);
                                            return (
                                              <span 
                                                key={index} 
                                                className={`tag-badge ${isSelected ? `bg-${nextBadgeColor}` : `bg-outline-${nextBadgeColor}`}`}
                                                onClick={() => {
                                                  if (isSelected) {
                                                    removeTag(nextCharKey, value);
                                                  } else {
                                                    setTags(prev => ({
                                                      ...prev,
                                                      [nextCharKey]: [...(prev[nextCharKey] || []), value]
                                                    }));
                                                  }
                                                }}
                                                style={{ cursor: 'pointer' }}
                                              >
                                                {value}
                                                {isSelected && <i className="bi bi-check ms-1"></i>}
                                              </span>
                                            );
                                          })
                                        ) : (
                                          <span className="text-muted">Aucune valeur disponible</span>
                                        )}
                                      </div>
                                    </Form.Group>
                                  );
                                })()}
                            </Col>
                          )}
                          </Row>
                        );
                      }
                      return rows;
                    })()
                  ) : (
                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      Aucune caractéristique disponible. Veuillez d'abord ajouter des caractéristiques via la page de gestion des caractéristiques.
                    </div>
                  )}
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            <i className="bi bi-x-circle me-2"></i>
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              console.log('🔘 Bouton cliqué !');
              handleAddProduct();
            }}
            disabled={!newProduct.nom.trim()}
          >
            <i className="bi bi-check-circle me-2"></i>
            {isEditMode ? 'Mettre à jour' : 'Ajouter le Produit'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal pour ajouter un tag */}
      <AddTagModal
        show={showTagModal}
        onHide={() => setShowTagModal(false)}
        currentTagField={currentTagField}
        tagInputValue={tagInputValue}
        setTagInputValue={setTagInputValue}
        addTagFromModal={addTagFromModal}
      />
    </>
  );
};

export default AddProductModal;