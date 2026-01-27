import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import { Product, SubProduct } from '../../types';
import { SubProductService, ProductService } from '../../services/firebaseService';
import { useAuth } from '../../contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

interface Variation {
  id: string;
  characteristics: {
    type?: string;
    anse?: string;
    couleurs?: string;
    dimensions?: string;
    materiau?: string;
    capacite?: string;
    poids?: string;
    qualite?: string;
    manches?: string;
    col?: string;
  };
  prixUnitaire?: number;
  quantite?: number;
  image?: string;
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

interface AddSubProductModalProps {
  show: boolean;
  onHide: () => void;
  onSubProductAdded: () => void;
  onAlert: (type: 'success' | 'danger', message: string) => void;
  initialSubProduct?: SubProduct;
  isEditMode?: boolean;
}

const AddSubProductModal: React.FC<AddSubProductModalProps> = ({
  show,
  onHide,
  onSubProductAdded,
  onAlert,
  initialSubProduct,
  isEditMode = false
}) => {
  const { user } = useAuth();
  // États pour les données du sous-produit
  const [newSubProduct, setNewSubProduct] = useState({
    nom: '',
    description: '',
    prix: 0,
    quantite: 0,
    image: '',
    images: [] as string[],
    imageFile: null as File | null,
    imageFiles: [] as File[],
    categorie: ''
  });

  // États pour la gestion des données
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  // État pour les caractéristiques sélectionnées du sous-produit
  const [selectedCharacteristics, setSelectedCharacteristics] = useState({
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

  // État pour les variations
  const [variations, setVariations] = useState<Variation[]>([]);

  // États pour les caractéristiques dynamiques
  const [customLabels, setCustomLabels] = useState<Map<string, string>>(new Map());
  const [availableCharacteristics, setAvailableCharacteristics] = useState<Array<{ key: string; label: string }>>([]);

  // Charger la liste des produits au montage du composant
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const productsData = await ProductService.getAllProducts();
        setProducts(productsData);
      } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        onAlert('danger', 'Erreur lors du chargement des produits');
      } finally {
        setLoading(false);
      }
    };

    if (show) {
      loadProducts();
    }
  }, [show, onAlert]);

  // Initialiser les valeurs en mode édition
  useEffect(() => {
    if (isEditMode && initialSubProduct && show) {
      console.log('🔧 Mode édition activé pour le sous-produit:', initialSubProduct);
      console.log('🖼️ Images du sous-produit:', {
        images: initialSubProduct.images,
        image: initialSubProduct.image,
        hasImages: initialSubProduct.images && initialSubProduct.images.length > 0
      });
      
      // Filtrer les images pour exclure '/mug.webp' et ne garder que les vraies images (base64 ou URLs)
      const existingImages = (initialSubProduct.images || []).filter((img: string) => 
        img && img !== '/mug.webp' && img.trim() !== '' && !img.startsWith('/')
      );
      let imagesToPreview: string[] = [];
      
      if (existingImages.length > 0) {
        // Utiliser les images du tableau si elles sont valides
        imagesToPreview = existingImages;
        console.log('🖼️ Images trouvées dans le tableau images (filtrées):', imagesToPreview.length, 'image(s)');
      } else if (initialSubProduct.image && initialSubProduct.image !== '/mug.webp' && initialSubProduct.image.trim() !== '' && !initialSubProduct.image.startsWith('/')) {
        // Si le tableau est vide ou ne contient que '/mug.webp', utiliser l'image principale
        imagesToPreview = [initialSubProduct.image];
        console.log('🖼️ Image principale utilisée (tableau images vide ou invalide):', imagesToPreview[0]?.substring(0, 50) + '...');
      } else {
        imagesToPreview = [];
        console.log('⚠️ Aucune image valide trouvée pour ce sous-produit');
      }

      setNewSubProduct({
        nom: initialSubProduct.nom || '',
        description: initialSubProduct.description || '',
        prix: initialSubProduct.prix || 0,
        quantite: initialSubProduct.stock || 0,
        image: initialSubProduct.image || '',
        images: imagesToPreview,
        imageFile: null,
        imageFiles: [],
        categorie: initialSubProduct.productId || ''
      });
      
      console.log('✅ Images prévisualisées initialisées:', imagesToPreview);

      // Initialiser les caractéristiques (de base + personnalisées)
      const characteristics: any = {
        type: Array.isArray(initialSubProduct.type) ? initialSubProduct.type : [],
        anse: Array.isArray(initialSubProduct.anse) ? initialSubProduct.anse : [],
        couleurs: Array.isArray(initialSubProduct.couleurs) ? initialSubProduct.couleurs : [],
        dimensions: Array.isArray(initialSubProduct.dimensions) ? initialSubProduct.dimensions : [],
        materiau: Array.isArray(initialSubProduct.materiau) ? initialSubProduct.materiau : [],
        capacite: Array.isArray(initialSubProduct.capacite) ? initialSubProduct.capacite : [],
        poids: Array.isArray(initialSubProduct.poids) ? initialSubProduct.poids : [],
        qualite: Array.isArray((initialSubProduct as any).qualite) ? (initialSubProduct as any).qualite : [],
        manches: Array.isArray((initialSubProduct as any).manches) ? (initialSubProduct as any).manches : [],
        col: Array.isArray((initialSubProduct as any).col) ? (initialSubProduct as any).col : []
      };
      
      // Ajouter toutes les caractéristiques personnalisées qui existent dans le sous-produit
      const standardFields = ['id', 'productId', 'nom', 'description', 'prix', 'image', 'images', 'stock', 'dateCreation', 'dateModification', 'variations', 'type', 'anse', 'couleurs', 'dimensions', 'materiau', 'capacite', 'poids', 'qualite', 'manches', 'col'];
      Object.keys(initialSubProduct).forEach(key => {
        if (!standardFields.includes(key)) {
          const value = (initialSubProduct as any)[key];
          if (Array.isArray(value)) {
            characteristics[key] = value;
          }
        }
      });
      
      console.log('🏷️ Caractéristiques initialisées (base + personnalisées):', characteristics);
      setSelectedCharacteristics(characteristics);

      // Charger les variations en mode édition
      if ((initialSubProduct as any).variations && Array.isArray((initialSubProduct as any).variations)) {
        console.log('📦 Chargement des variations existantes:', (initialSubProduct as any).variations.length);
        setVariations((initialSubProduct as any).variations);
      } else {
        setVariations([]);
      }

      // Recharger le produit parent depuis Firebase pour obtenir toutes ses caractéristiques
      const loadParentProductFromFirebase = async () => {
        try {
          console.log('🔄 Rechargement du produit parent depuis Firebase...');
          console.log('🔍 Recherche du produit avec ID:', initialSubProduct.productId);
          
          // Chercher le document par le champ 'id' (GRA-XXX)
          const productsCollection = collection(db, 'Produits');
          const q = query(productsCollection, where('id', '==', initialSubProduct.productId));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty && querySnapshot.docs.length > 0) {
            const productDoc = querySnapshot.docs[0];
            const productData = productDoc.data();
            console.log('✅ Produit parent trouvé dans Firebase avec document ID:', productDoc.id);
            
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
            
            console.log('✅ Produit parent filtré depuis Firebase (seulement caractéristiques avec valeurs):', fullProduct);
            console.log('🔑 Clés du produit parent filtré:', Object.keys(fullProduct));
            console.log('📊 Caractéristiques du produit parent:', Object.keys(fullProduct).filter(k => !standardFieldsList.includes(k)));
            
            setSelectedProduct(fullProduct);
          } else {
            console.warn('⚠️ Produit parent non trouvé dans Firebase avec ID:', initialSubProduct.productId);
            // Fallback sur le produit depuis la liste locale
            const parentProduct = products.find(p => p.id === initialSubProduct.productId);
            if (parentProduct) {
              const normalizedParentProduct = {
                ...parentProduct,
                type: Array.isArray(parentProduct.type) ? parentProduct.type : [],
                anse: Array.isArray(parentProduct.anse) ? parentProduct.anse : [],
                couleurs: Array.isArray(parentProduct.couleurs) ? parentProduct.couleurs : [],
                dimensions: Array.isArray(parentProduct.dimensions) ? parentProduct.dimensions : [],
                materiau: Array.isArray(parentProduct.materiau) ? parentProduct.materiau : [],
                capacite: Array.isArray(parentProduct.capacite) ? parentProduct.capacite : [],
                poids: Array.isArray(parentProduct.poids) ? parentProduct.poids : [],
                qualite: Array.isArray((parentProduct as any).qualite) ? (parentProduct as any).qualite : [],
                manches: Array.isArray((parentProduct as any).manches) ? (parentProduct as any).manches : [],
                col: Array.isArray((parentProduct as any).col) ? (parentProduct as any).col : []
              };
              setSelectedProduct(normalizedParentProduct);
            }
          }
        } catch (error) {
          console.error('❌ Erreur lors du rechargement du produit parent:', error);
          // Fallback sur le produit depuis la liste locale
          const parentProduct = products.find(p => p.id === initialSubProduct.productId);
          if (parentProduct) {
            const normalizedParentProduct = {
              ...parentProduct,
              type: Array.isArray(parentProduct.type) ? parentProduct.type : [],
              anse: Array.isArray(parentProduct.anse) ? parentProduct.anse : [],
              couleurs: Array.isArray(parentProduct.couleurs) ? parentProduct.couleurs : [],
              dimensions: Array.isArray(parentProduct.dimensions) ? parentProduct.dimensions : [],
              materiau: Array.isArray(parentProduct.materiau) ? parentProduct.materiau : [],
              capacite: Array.isArray(parentProduct.capacite) ? parentProduct.capacite : [],
              poids: Array.isArray(parentProduct.poids) ? parentProduct.poids : [],
              qualite: Array.isArray((parentProduct as any).qualite) ? (parentProduct as any).qualite : [],
              manches: Array.isArray((parentProduct as any).manches) ? (parentProduct as any).manches : [],
              col: Array.isArray((parentProduct as any).col) ? (parentProduct as any).col : []
            };
            setSelectedProduct(normalizedParentProduct);
          }
        }
      };
      
      // Charger le produit parent depuis Firebase
      loadParentProductFromFirebase();
    } else if (!isEditMode && show) {
      // Réinitialiser en mode création uniquement
      setNewSubProduct(prev => ({ ...prev, images: [] }));
      setSelectedProduct(null);
      setSelectedCharacteristics({
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
      // Réinitialiser les variations en mode création
      setVariations([]);
    }
  }, [isEditMode, initialSubProduct, products, show]);
  
  // Réinitialiser les images quand la modale se ferme
  useEffect(() => {
    if (!show) {
      setNewSubProduct(prev => ({ ...prev, images: [] }));
    }
  }, [show]);

  // Debug: Log des changements d'images
  useEffect(() => {
    console.log('🖼️ State images mis à jour:', {
      imagesCount: newSubProduct.images.length,
      images: newSubProduct.images.map((img, i) => ({
        index: i,
        isBlob: img.startsWith('blob:'),
        preview: img.substring(0, 50) + '...'
      }))
    });
  }, [newSubProduct.images]);

  // Calculer le prix total automatiquement
  const prixTotal = newSubProduct.prix * newSubProduct.quantite;

  // Calculer les valeurs à partir des variations
  const totalPrixVariations = variations.reduce((sum, variation) => {
    const prix = variation.prixUnitaire || newSubProduct.prix || 0;
    const qty = variation.quantite ?? 0;
    return sum + (prix * qty);
  }, 0);

  const totalQuantiteVariations = variations.reduce((sum, variation) => {
    return sum + (variation.quantite ?? 0);
  }, 0);

  const prixUnitaireMoyenVariations = variations.length > 0 
    ? variations.reduce((sum, variation) => sum + (variation.prixUnitaire || newSubProduct.prix || 0), 0) / variations.length
    : newSubProduct.prix || 0;

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

  // Déterminer les caractéristiques disponibles pour le produit
  const determineAvailableCharacteristics = useCallback((product: Product | null) => {
    if (!product) {
      setAvailableCharacteristics([]);
      return;
    }

    // Détecter les caractéristiques personnalisées dans le produit
    const customChars = new Map<string, string>();
    const standardFields = ['id', 'nom', 'description', 'prix', 'image', 'images', 'categorie', 'stock', 'fournisseur', 'dateCreation', 'dateModification'];
    
    Object.keys(product).forEach(key => {
      if (!standardFields.includes(key)) {
        const value = product[key as keyof Product];
        if (Array.isArray(value) && value.length > 0) {
          const isBaseChar = baseCharacteristicTypes.some(ct => ct.key === key);
          if (!isBaseChar && !customChars.has(key)) {
            const label = key
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            customChars.set(key, label);
          }
        }
      }
    });

    const customCharsArray = Array.from(customChars.entries()).map(([key, label]) => ({ key, label }));

    // Construire la liste uniquement à partir des caractéristiques qui existent réellement dans le produit
    const available: Array<{ key: string; label: string }> = [];
    
    // Parcourir toutes les clés du produit pour trouver les caractéristiques existantes
    Object.keys(product).forEach(key => {
      // Ignorer les champs standards
      const standardFields = ['id', 'nom', 'description', 'prix', 'image', 'images', 'categorie', 'stock', 'fournisseur', 'dateCreation', 'dateModification'];
      if (standardFields.includes(key)) {
        return;
      }
      
      const value = product[key as keyof Product];
      
      // Vérifier que la valeur existe, n'est pas undefined, est un tableau ET n'est pas vide
      if (value !== undefined && value !== null && Array.isArray(value) && value.length > 0) {
        // Chercher le label dans les caractéristiques de base
        const baseChar = baseCharacteristicTypes.find(ct => ct.key === key);
        if (baseChar) {
          available.push(baseChar);
        } else {
          // C'est une caractéristique personnalisée
          const customChar = customCharsArray.find(cc => cc.key === key);
          if (customChar) {
            available.push(customChar);
          } else {
            // Générer un label par défaut si pas trouvé
            const label = key
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            available.push({ key, label });
          }
        }
      }
    });

    // Appliquer les labels personnalisés
    const characteristicsWithLabels = available.map(charType => {
      const customLabel = customLabels.get(charType.key);
      return customLabel ? { ...charType, label: customLabel } : charType;
    });

    setAvailableCharacteristics(characteristicsWithLabels);
  }, [customLabels]);

  // Charger les labels personnalisés au montage
  useEffect(() => {
    if (show) {
      loadCustomLabels();
    }
  }, [show, loadCustomLabels]);

  // Déterminer les caractéristiques disponibles quand le produit sélectionné change
  useEffect(() => {
    if (selectedProduct) {
      determineAvailableCharacteristics(selectedProduct);
    } else {
      setAvailableCharacteristics([]);
    }
  }, [selectedProduct, determineAvailableCharacteristics]);

  // Gérer le changement de catégorie
  const handleCategoryChange = async (productId: string) => {
    try {
      // Recharger le produit depuis Firebase pour obtenir toutes ses caractéristiques
      console.log('🔄 Rechargement du produit depuis Firebase pour obtenir toutes les caractéristiques...');
      console.log('🔍 Recherche du produit avec ID:', productId);
      
      // Chercher le document par le champ 'id' (GRA-XXX) au lieu du document ID
      const productsCollection = collection(db, 'Produits');
      const q = query(productsCollection, where('id', '==', productId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty && querySnapshot.docs.length > 0) {
        const productDoc = querySnapshot.docs[0];
        const productData = productDoc.data();
        console.log('✅ Produit trouvé dans Firebase avec document ID:', productDoc.id);
        
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
        
        setSelectedProduct(fullProduct);
        setNewSubProduct(prev => ({ ...prev, categorie: productId }));
        
        // Réinitialiser les caractéristiques sélectionnées SEULEMENT si on n'est pas en mode édition
        // ou si c'est un changement de catégorie différent de celle du sous-produit initial
        if (!isEditMode || (isEditMode && initialSubProduct && productId !== initialSubProduct.productId)) {
          setSelectedCharacteristics({
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
          // Réinitialiser aussi les variations lors du changement de catégorie
          setVariations([]);
        }
      } else {
        console.warn('⚠️ Produit non trouvé dans Firebase avec ID:', productId);
        // Fallback sur le produit depuis la liste locale
        const product = products.find(p => p.id === productId);
        if (product) {
          const normalizedProduct = {
            ...product,
            type: Array.isArray(product.type) ? product.type : [],
            anse: Array.isArray(product.anse) ? product.anse : [],
            couleurs: Array.isArray(product.couleurs) ? product.couleurs : [],
            dimensions: Array.isArray(product.dimensions) ? product.dimensions : [],
            materiau: Array.isArray(product.materiau) ? product.materiau : [],
            capacite: Array.isArray(product.capacite) ? product.capacite : [],
            poids: Array.isArray(product.poids) ? product.poids : [],
            qualite: Array.isArray((product as any).qualite) ? (product as any).qualite : [],
            manches: Array.isArray((product as any).manches) ? (product as any).manches : [],
            col: Array.isArray((product as any).col) ? (product as any).col : []
          };
          setSelectedProduct(normalizedProduct);
          setNewSubProduct(prev => ({ ...prev, categorie: productId }));
        } else {
          setSelectedProduct(null);
          setNewSubProduct(prev => ({ ...prev, categorie: productId }));
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors du rechargement du produit:', error);
      // Fallback sur le produit depuis la liste locale
      const product = products.find(p => p.id === productId);
      if (product) {
        const normalizedProduct = {
          ...product,
          type: Array.isArray(product.type) ? product.type : [],
          anse: Array.isArray(product.anse) ? product.anse : [],
          couleurs: Array.isArray(product.couleurs) ? product.couleurs : [],
          dimensions: Array.isArray(product.dimensions) ? product.dimensions : [],
          materiau: Array.isArray(product.materiau) ? product.materiau : [],
          capacite: Array.isArray(product.capacite) ? product.capacite : [],
          poids: Array.isArray(product.poids) ? product.poids : [],
          qualite: Array.isArray((product as any).qualite) ? (product as any).qualite : [],
          manches: Array.isArray((product as any).manches) ? (product as any).manches : [],
          col: Array.isArray((product as any).col) ? (product as any).col : []
        };
        setSelectedProduct(normalizedProduct);
        setNewSubProduct(prev => ({ ...prev, categorie: productId }));
      } else {
        setSelectedProduct(null);
        setNewSubProduct(prev => ({ ...prev, categorie: productId }));
      }
    }
  };

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

  // Gérer la sélection/désélection d'un tag
  const handleTagToggle = (category: keyof typeof selectedCharacteristics | string, tagValue: string) => {
    setSelectedCharacteristics(prev => {
      // Gérer les caractéristiques personnalisées qui n'existent pas encore dans l'état
      const categoryKey = category as keyof typeof prev;
      const currentTags = (prev[categoryKey] as string[]) || [];
      
      // S'assurer que currentTags est bien un tableau
      if (!Array.isArray(currentTags)) {
        console.warn(`⚠️ currentTags n'est pas un tableau pour ${category}:`, currentTags);
        return prev;
      }
      
      const isSelected = currentTags.includes(tagValue);
      
      if (isSelected) {
        // Désélectionner le tag
        return {
          ...prev,
          [category]: currentTags.filter(tag => tag !== tagValue)
        };
      } else {
        // Sélectionner le tag
        return {
          ...prev,
          [category]: [...currentTags, tagValue]
        };
      }
    });
  };

  // Fonction pour générer toutes les combinaisons possibles de caractéristiques
  // Utilise uniquement les caractéristiques disponibles du produit spécifique
  const generateAllCombinations = useCallback(() => {
    // Utiliser uniquement les caractéristiques disponibles du produit spécifique
    // au lieu de toutes les caractéristiques de base
    const activeCategories = availableCharacteristics
      .map(charType => charType.key)
      .filter(charKey => {
        const selectedValues = selectedCharacteristics[charKey as keyof typeof selectedCharacteristics];
        return Array.isArray(selectedValues) && selectedValues.length > 0;
      });
    
    if (activeCategories.length === 0) {
      return [];
    }

    // Fonction récursive pour générer toutes les combinaisons
    const combine = (arrays: string[][], index: number = 0): any[] => {
      if (index === arrays.length) {
        return [{}];
      }
      
      const currentArray = arrays[index];
      const rest = combine(arrays, index + 1);
      const result: any[] = [];
      
      for (const value of currentArray) {
        for (const combination of rest) {
          result.push({
            ...combination,
            [activeCategories[index]]: value
          });
        }
      }
      
      return result;
    };

    const activeArrays = activeCategories.map(cat => {
      const selectedValues = selectedCharacteristics[cat as keyof typeof selectedCharacteristics];
      return Array.isArray(selectedValues) ? selectedValues : [];
    });
    
    return combine(activeArrays);
  }, [selectedCharacteristics, availableCharacteristics]);

  // Fonction pour créer une variation à partir d'une combinaison
  const createVariationFromCombination = useCallback((combination: any) => {
    const newVariation: Variation = {
      id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      characteristics: combination,
      prixUnitaire: newSubProduct.prix || 0,
      quantite: 1
    };
    return newVariation;
  }, [newSubProduct.prix]);

  // Fonction pour ajouter des variations
  const handleAddVariation = useCallback(() => {
    console.log('🔄 Génération des variations...');
    const combinations = generateAllCombinations();
    console.log('📊 Combinaisons générées:', combinations.length);
    
    if (combinations.length === 0) {
      onAlert('danger', 'Veuillez sélectionner au moins une caractéristique pour créer des variations');
      return;
    }
    
    // Créer une variation pour chaque combinaison
    const newVariations = combinations.map(combo => createVariationFromCombination(combo));
    console.log('✅ Nouvelles variations créées:', newVariations.length);
    
    // Vérifier les doublons en comparant les caractéristiques
    setVariations(prev => {
      console.log('📋 Variations actuelles avant ajout:', prev.length);
      const existingKeys = new Set(
        prev.map(v => JSON.stringify(v.characteristics))
      );
      
      const uniqueNewVariations = newVariations.filter(v => {
        const key = JSON.stringify(v.characteristics);
        return !existingKeys.has(key);
      });
      
      console.log('✨ Variations uniques à ajouter:', uniqueNewVariations.length);
      const finalVariations = [...prev, ...uniqueNewVariations];
      console.log('📦 Total variations après ajout:', finalVariations.length);
      
      if (uniqueNewVariations.length === 0) {
        onAlert('danger', 'Toutes les variations possibles existent déjà');
      } else if (uniqueNewVariations.length < newVariations.length) {
        onAlert('success', `${uniqueNewVariations.length} nouvelle(s) variation(s) ajoutée(s) (${newVariations.length - uniqueNewVariations.length} déjà existante(s))`);
      } else {
        onAlert('success', `${uniqueNewVariations.length} variation(s) créée(s) avec succès !`);
      }
      
      return finalVariations;
    });
  }, [generateAllCombinations, createVariationFromCombination, onAlert]);

  // Fonction pour supprimer une variation
  const handleDeleteVariation = useCallback((variationId: string) => {
    setVariations(prev => prev.filter(v => v.id !== variationId));
  }, []);

  // Fonction pour mettre à jour une variation
  const handleUpdateVariation = useCallback((updatedVariation: Variation) => {
    setVariations(prev => prev.map(v => v.id === updatedVariation.id ? updatedVariation : v));
  }, []);

  // Gérer l'upload d'image et convertir en base64
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        console.log('🖼️ Prévisualisations créées:', validPreviews.length);
        console.log('🖼️ URLs de prévisualisation:', validPreviews);
        setNewSubProduct(prev => {
          const newImages = [...prev.images, ...validPreviews];
          console.log('🔄 Mise à jour du state - anciennes images:', prev.images.length, 'nouvelles images:', newImages.length);
          return {
            ...prev,
            imageFiles: [...prev.imageFiles, ...validFiles],
            images: newImages
          };
        });
      } else {
        console.log('⚠️ Aucun fichier valide après validation');
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
        setNewSubProduct(prev => ({
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

  // Handler pour l'upload d'image d'une variation
  const handleVariationImageUpload = useCallback(async (variationId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        onAlert('danger', 'Veuillez sélectionner un fichier image valide');
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        onAlert('danger', 'Le fichier est trop volumineux. Taille maximale: 5MB');
        return;
      }

      // Convertir en base64
      try {
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
          reader.readAsDataURL(file);
        });

        // Mettre à jour la variation avec l'image
        const updatedVariation = variations.find(v => v.id === variationId);
        if (updatedVariation) {
          const updated = {
            ...updatedVariation,
            image: base64Image
          };
          handleUpdateVariation(updated);
          onAlert('success', 'Image ajoutée avec succès');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la conversion de l\'image:', error);
        onAlert('danger', 'Erreur lors de la conversion de l\'image');
      }
    }
    // Réinitialiser l'input pour permettre la sélection du même fichier
    event.target.value = '';
  }, [variations, handleUpdateVariation, onAlert]);

  // Supprimer une image de la liste
  const removeImage = useCallback((index: number) => {
    console.log('🗑️ Suppression de l\'image à l\'index:', index);
    setNewSubProduct(prev => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, i) => i !== index),
      images: prev.images.filter((_, i) => i !== index)
    }));
  }, []);

  const removeAllImages = useCallback(() => {
    console.log('🗑️ Suppression de toutes les images');
    setNewSubProduct(prev => ({
      ...prev,
      imageFiles: [],
      images: []
    }));
  }, []);

  const handleAddSubProduct = useCallback(async () => {
    // Vérifier l'authentification
    if (!user) {
      onAlert('danger', 'Vous devez être connecté pour ajouter un sous-produit');
      return;
    }

    // Validation des champs obligatoires
    if (!newSubProduct.nom.trim()) {
      onAlert('danger', 'Le nom du sous-produit est obligatoire');
      return;
    }
    
    if (!newSubProduct.categorie) {
      onAlert('danger', 'La catégorie est obligatoire');
      return;
    }

    if (!selectedProduct) {
      onAlert('danger', 'Veuillez sélectionner une catégorie valide');
      return;
    }

    try {
      // Gestion des images multiples en base64
      let imageUrls: string[] = [];
      let mainImageUrl = '/mug.webp';

      // Convertir les fichiers sélectionnés en base64
      if (newSubProduct.imageFiles.length > 0) {
        console.log(`🔄 Conversion de ${newSubProduct.imageFiles.length} image(s) en base64...`);
        
        const base64Promises = newSubProduct.imageFiles.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve(reader.result as string);
            };
            reader.onerror = () => {
              reject(new Error('Erreur de lecture du fichier'));
            };
            reader.readAsDataURL(file);
          });
        });

        try {
          imageUrls = await Promise.all(base64Promises);
          console.log(`✅ ${imageUrls.length} image(s) convertie(s) en base64`);
        
        // La première image devient l'image principale
        if (imageUrls.length > 0) {
          mainImageUrl = imageUrls[0];
        }
        } catch (conversionError) {
          console.error('❌ Erreur lors de la conversion des images:', conversionError);
          onAlert('danger', 'Erreur lors de la conversion des images');
          return;
        }
      }

      if (isEditMode && initialSubProduct) {
        // En mode édition, NE PAS utiliser les images existantes ici
        // Les images existantes seront gérées plus tard dans la logique de combinaison
        // Seulement utiliser les nouvelles images converties en base64
        console.log('🔄 Mode édition - imageUrls après conversion:', imageUrls.length, 'image(s)');
      } else {
        // Mode création - créer le sous-produit avec les images base64 directement
        if (imageUrls.length === 0) {
          // Pas d'images, utiliser l'image par défaut
          imageUrls = ['/mug.webp'];
          mainImageUrl = '/mug.webp';
        }
        
        // Créer le sous-produit avec les images base64
        const subProductData: any = {
        nom: newSubProduct.nom.trim(),
        description: newSubProduct.description.trim(),
        prix: newSubProduct.prix,
        stock: newSubProduct.quantite,
          image: mainImageUrl,
          images: imageUrls,
        productId: selectedProduct.id,
        // Ajouter les caractéristiques sélectionnées
          type: selectedCharacteristics.type || [],
          anse: selectedCharacteristics.anse || [],
          couleurs: selectedCharacteristics.couleurs || [],
          dimensions: selectedCharacteristics.dimensions || [],
          materiau: selectedCharacteristics.materiau || [],
          capacite: selectedCharacteristics.capacite || [],
          poids: selectedCharacteristics.poids || [],
          qualite: selectedCharacteristics.qualite || [],
          manches: selectedCharacteristics.manches || [],
          col: selectedCharacteristics.col || [],
          // Ajouter les variations - toujours envoyer explicitement pour garantir la sauvegarde
          variations: Array.isArray(variations) ? variations : []
        };

        console.log('🔄 Création du sous-produit avec images base64:', {
          nom: subProductData.nom,
          nombreImages: imageUrls.length,
          variationsCount: variations.length,
          variations: variations
        });
        
        await SubProductService.createSubProduct(subProductData);
        console.log('✅ Sous-produit créé avec succès');
        
        onAlert('success', 'Sous-produit ajouté avec succès');
      }

      // Pour le mode édition, créer les données et mettre à jour
      if (isEditMode && initialSubProduct) {
        console.log('🔄 Mode édition - Préparation des images:', {
          previewImagesCount: newSubProduct.images.length,
          previewImages: newSubProduct.images.map((img, i) => ({
            index: i,
            isBlob: img.startsWith('blob:'),
            preview: img.substring(0, 50) + '...'
          })),
          imageUrlsCount: imageUrls.length,
          imageFilesCount: newSubProduct.imageFiles.length,
          originalImagesCount: initialSubProduct.images?.length || 0
        });
        
        // Combiner les images existantes avec les nouvelles images ajoutées
        // IMPORTANT: newSubProduct.images contient SEULEMENT les images qui doivent être sauvegardées
        // (les images supprimées ont déjà été retirées de newSubProduct.images)
        
        const finalImageUrls: string[] = [];
        let newImageIndex = 0;
        
        // Parcourir newSubProduct.images (qui ne contient que les images restantes après suppression)
        for (let i = 0; i < newSubProduct.images.length; i++) {
          const previewUrl = newSubProduct.images[i];
          
          if (previewUrl.startsWith('blob:')) {
            // C'est une nouvelle image ajoutée, utiliser la version base64 de imageUrls
            if (newImageIndex < imageUrls.length) {
              finalImageUrls.push(imageUrls[newImageIndex]);
              newImageIndex++;
            } else {
              console.warn('⚠️ Blob URL trouvé mais pas de base64 correspondant à l\'index', newImageIndex);
            }
          } else {
            // C'est une image existante (base64 ou URL), la conserver telle quelle
            // Cette image a été conservée par l'utilisateur (pas supprimée)
            finalImageUrls.push(previewUrl);
          }
        }
        
        // Ajouter les nouvelles images restantes UNIQUEMENT si newSubProduct.images n'est pas vide
        // Si newSubProduct.images est vide, cela signifie que l'utilisateur a supprimé toutes les images
        // et on ne doit PAS réintroduire d'images même s'il y en a dans imageUrls
        if (newSubProduct.images.length > 0 && newImageIndex < imageUrls.length) {
          console.log('➕ Ajout des nouvelles images restantes:', imageUrls.length - newImageIndex);
          finalImageUrls.push(...imageUrls.slice(newImageIndex));
        } else if (newSubProduct.images.length === 0 && imageUrls.length > 0) {
          console.log('⚠️ newSubProduct.images est vide mais imageUrls contient des images');
          console.log('⚠️ Ignorant imageUrls car l\'utilisateur a supprimé toutes les images');
          console.log('⚠️ imageUrls provient probablement d\'une ancienne conversion qui n\'a pas été nettoyée');
        }
        
        // Utiliser directement finalImageUrls (qui contient SEULEMENT les images restantes après suppression)
        // Ne JAMAIS utiliser de fallback vers les images originales car l'utilisateur a peut-être voulu les supprimer
        // Si finalImageUrls est vide, cela signifie que l'utilisateur a supprimé toutes les images
        // On envoie un tableau vide pour indiquer explicitement qu'il n'y a plus d'images
        const finalImageUrlsWithFallback = finalImageUrls; // Utiliser directement, même si vide
        
        // L'image principale est la première nouvelle image ajoutée, sinon la première image du tableau final
        const finalMainImageUrl = (imageUrls.length > 0 && imageUrls[0] !== '/mug.webp')
          ? imageUrls[0] 
          : (finalImageUrls.length > 0 && finalImageUrls[0] !== '/mug.webp'
              ? finalImageUrls[0]
              : '/mug.webp');
        
        console.log('🖼️ Images finales pour la mise à jour:', {
          previewImagesCount: newSubProduct.images.length,
          newImagesCount: imageUrls.length,
          finalImageUrlsCount: finalImageUrls.length,
          finalImageUrlsCountWithFallback: finalImageUrlsWithFallback.length,
          finalImageUrls: finalImageUrlsWithFallback.map((img, i) => ({
            index: i,
            preview: img.substring(0, 50) + '...',
            isDefault: img === '/mug.webp'
          })),
          mainImageUrl: finalMainImageUrl.substring(0, 50) + '...',
          nombreImages: finalImageUrlsWithFallback.length
        });
        
        console.log('📤 Données à envoyer pour la mise à jour:', {
          images: finalImageUrlsWithFallback,
          imagesCount: finalImageUrlsWithFallback.length,
          imageMain: finalMainImageUrl.substring(0, 50) + '...',
          previewImagesCount: newSubProduct.images.length,
          finalImageUrlsCount: finalImageUrls.length
        });
        
        const subProductData: any = {
          nom: newSubProduct.nom.trim(),
          description: newSubProduct.description.trim(),
          prix: newSubProduct.prix,
          stock: newSubProduct.quantite,
          image: finalMainImageUrl,
          images: finalImageUrlsWithFallback, // Toujours envoyer le tableau d'images, même s'il est vide
          productId: selectedProduct.id,
          // Ajouter les caractéristiques sélectionnées
          type: selectedCharacteristics.type || [],
          anse: selectedCharacteristics.anse || [],
          couleurs: selectedCharacteristics.couleurs || [],
          dimensions: selectedCharacteristics.dimensions || [],
          materiau: selectedCharacteristics.materiau || [],
          capacite: selectedCharacteristics.capacite || [],
          poids: selectedCharacteristics.poids || [],
          qualite: selectedCharacteristics.qualite || [],
          manches: selectedCharacteristics.manches || [],
          col: selectedCharacteristics.col || [],
          // Ajouter les variations - toujours envoyer explicitement pour garantir la mise à jour
          variations: Array.isArray(variations) ? variations : []
        };

        console.log('📦 Données du sous-produit avec variations (mode édition):', {
          nom: subProductData.nom,
          variationsCount: variations.length,
          variations: variations,
          variationsInData: subProductData.variations?.length || 0,
          variationsType: Array.isArray(subProductData.variations) ? 'array' : typeof subProductData.variations
        });

        // Ajouter la date de création originale
        subProductData.dateCreation = initialSubProduct.dateCreation instanceof Date ? 
            initialSubProduct.dateCreation : 
            (initialSubProduct.dateCreation as any)?.toDate ? 
              (initialSubProduct.dateCreation as any).toDate() : 
            new Date();

        // Mode édition - mettre à jour le sous-produit existant
        console.log('🔄 Mise à jour du sous-produit avec les données:', {
          ...subProductData,
          images: subProductData.images?.map((img: string) => img.substring(0, 50) + '...') || [],
          imagesCount: subProductData.images?.length || 0,
          imageMain: subProductData.image?.substring(0, 50) + '...' || 'N/A',
          variationsCount: subProductData.variations?.length || 0,
          variations: subProductData.variations
        });
        await SubProductService.updateSubProduct(initialSubProduct.productId, initialSubProduct.id, subProductData);
        
        // Attendre un peu pour s'assurer que Firebase a terminé la mise à jour
        await new Promise(resolve => setTimeout(resolve, 500));
        
        onAlert('success', 'Sous-produit mis à jour avec succès');
      }
      
      // Réinitialiser le formulaire
      setNewSubProduct({
        nom: '',
        description: '',
        prix: 0,
        quantite: 0,
        image: '',
        images: [],
        imageFile: null,
        imageFiles: [],
        categorie: ''
      });
      setSelectedProduct(null);
      setSelectedCharacteristics({
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
      setVariations([]);
      
      onHide();
      onSubProductAdded();
    } catch (error) {
      console.error('Erreur lors de l\'ajout/mise à jour du sous-produit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Détails de l\'erreur:', errorMessage);
      console.error('Type d\'erreur:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
      
      // Afficher un message d'erreur plus détaillé
      const detailedMessage = errorMessage.length > 100 
        ? `${errorMessage.substring(0, 100)}...` 
        : errorMessage;
      onAlert('danger', `${isEditMode ? 'Erreur lors de la mise à jour' : 'Erreur lors de l\'ajout'} du sous-produit: ${detailedMessage}`);
    }
  }, [
    user,
    newSubProduct, 
    selectedProduct, 
    onAlert, 
    onHide, 
    onSubProductAdded, 
    initialSubProduct, 
    isEditMode, 
    newSubProduct.images, // IMPORTANT: Ajouter newSubProduct.images aux dépendances pour avoir la valeur actuelle
    variations, // IMPORTANT: Ajouter variations aux dépendances pour avoir la valeur actuelle
    selectedCharacteristics.type, 
    selectedCharacteristics.anse, 
    selectedCharacteristics.couleurs, 
    selectedCharacteristics.dimensions, 
    selectedCharacteristics.materiau, 
    selectedCharacteristics.capacite, 
    selectedCharacteristics.poids,
    selectedCharacteristics.qualite,
    selectedCharacteristics.manches,
    selectedCharacteristics.col
  ]);

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className={`bi ${isEditMode ? 'bi-pencil-square' : 'bi-plus-square'} me-2`}></i>
          {isEditMode ? 'Modifier le Sous-produit' : 'Ajouter un Sous-produit'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <Form>
          {/* Section 1: Informations sur le sous-produit */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-info-circle me-2"></i>
              Section 1: Informations sur le sous-produit
            </h5>
            
            <Row>
              {/* 1ère colonne */}
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nom du sous-produit *</Form.Label>
                  <Form.Control
                    type="text"
                    value={newSubProduct.nom}
                    onChange={(e) => setNewSubProduct({...newSubProduct, nom: e.target.value})}
                    placeholder="Nom du sous-produit"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Catégorie *</Form.Label>
                  <Form.Select
                    value={newSubProduct.categorie}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    required
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.nom}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description du sous-produit</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={newSubProduct.description}
                    onChange={(e) => setNewSubProduct({...newSubProduct, description: e.target.value})}
                    placeholder="Description du sous-produit"
                  />
                </Form.Group>
              </Col>

              {/* 2e colonne */}
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Images du sous-produit</Form.Label>
                  
                  {/* Zone d'upload */}
                  <div
                    className="image-upload-zone"
                    onDrop={handleImageDrop}
                    onDragOver={handleDragOver}
                    onClick={() => {
                      const input = document.getElementById('subproduct-image-upload') as HTMLInputElement;
                      if (input) {
                        input.click();
                      }
                    }}
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
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      multiple
                      style={{ display: 'none' }}
                      id="subproduct-image-upload"
                    />
                    <label 
                      htmlFor="subproduct-image-upload" 
                      className="btn btn-outline-primary btn-sm"
                      style={{ cursor: 'pointer', margin: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      Choisir des fichiers
                    </label>
                    <p className="text-muted small mt-2">JPG, JPEG, PNG, WEBP (max 5MB par image)</p>
                  </div>

                  {/* Affichage des images sélectionnées */}
                  {newSubProduct.images && Array.isArray(newSubProduct.images) && newSubProduct.images.length > 0 && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">Images sélectionnées ({newSubProduct.images.length})</h6>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={removeAllImages}
                          title="Tout supprimer"
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                      <div className="row g-2">
                        {newSubProduct.images.map((image, index) => (
                          <div key={`subproduct-image-${index}-${image.substring(0, 20)}`} className="col-md-4">
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

          {/* Section 2: Caractéristiques du sous-produit */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-tags me-2"></i>
              Section 2: Caractéristiques du sous-produit
            </h5>
            
            {selectedProduct ? (
              <div className="p-3 bg-light rounded">
                <h6 className="mb-3">Caractéristiques de la catégorie "{selectedProduct.nom}" :</h6>
                
                {availableCharacteristics.length > 0 ? (
                  (() => {
                    // Créer les lignes par paires de caractéristiques
                    const rows: React.ReactElement[] = [];
                    for (let i = 0; i < availableCharacteristics.length; i += 2) {
                      const charType = availableCharacteristics[i];
                      const nextCharType = i + 1 < availableCharacteristics.length ? availableCharacteristics[i + 1] : null;
                      const charKey = charType.key as keyof typeof selectedProduct;
                      const charValues = Array.isArray(selectedProduct[charKey]) ? (selectedProduct[charKey] as string[]) : [];
                      const badgeColor = getBadgeColor(charType.key);
                      const selectedValues = selectedCharacteristics[charType.key as keyof typeof selectedCharacteristics] || [];
                      
                      rows.push(
                        <Row key={`row-${i}`}>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label className="d-flex align-items-center justify-content-between">
                                <span>{charType.label}</span>
                              </Form.Label>
                              <div className="tags-container">
                                {charValues.length > 0 ? (
                                  charValues.map((value, index) => {
                                    const isSelected = selectedValues.includes(value);
                                    return (
                                      <span 
                                        key={index} 
                                        className={`tag-badge ${isSelected ? `bg-${badgeColor}` : `bg-outline-${badgeColor}`}`}
                                        onClick={() => handleTagToggle(charType.key as keyof typeof selectedCharacteristics, value)}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        {value}
                                        {isSelected && <i className="bi bi-check ms-1"></i>}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span className="text-muted">Aucune valeur définie</span>
                                )}
                              </div>
                            </Form.Group>
                          </Col>
                          {nextCharType && (
                            <Col md={6}>
                              {(() => {
                                const nextCharKey = nextCharType.key as keyof typeof selectedProduct;
                                const nextCharValues = Array.isArray(selectedProduct[nextCharKey]) ? (selectedProduct[nextCharKey] as string[]) : [];
                                const nextBadgeColor = getBadgeColor(nextCharType.key);
                                const nextSelectedValues = selectedCharacteristics[nextCharType.key as keyof typeof selectedCharacteristics] || [];
                                
                                return (
                                  <Form.Group className="mb-3">
                                    <Form.Label className="d-flex align-items-center justify-content-between">
                                      <span>{nextCharType.label}</span>
                                    </Form.Label>
                                    <div className="tags-container">
                                      {nextCharValues.length > 0 ? (
                                        nextCharValues.map((value, index) => {
                                          const isSelected = nextSelectedValues.includes(value);
                                          return (
                                            <span 
                                              key={index} 
                                              className={`tag-badge ${isSelected ? `bg-${nextBadgeColor}` : `bg-outline-${nextBadgeColor}`}`}
                                              onClick={() => handleTagToggle(nextCharType.key as keyof typeof selectedCharacteristics, value)}
                                              style={{ cursor: 'pointer' }}
                                            >
                                              {value}
                                              {isSelected && <i className="bi bi-check ms-1"></i>}
                                            </span>
                                          );
                                        })
                                      ) : (
                                        <span className="text-muted">Aucune valeur définie</span>
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
                    Aucune caractéristique disponible pour ce produit. Veuillez d'abord ajouter des caractéristiques via la page de gestion des caractéristiques.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-light rounded text-center">
                <i className="bi bi-info-circle me-2"></i>
                Sélectionnez une catégorie pour voir ses caractéristiques
              </div>
            )}
          </div>

          {/* Section 2.6: Variations */}
          {selectedProduct && (() => {
            const hasSelectedTags = 
              selectedCharacteristics.type.length > 0 ||
              selectedCharacteristics.anse.length > 0 ||
              selectedCharacteristics.couleurs.length > 0 ||
              selectedCharacteristics.dimensions.length > 0 ||
              selectedCharacteristics.materiau.length > 0 ||
              selectedCharacteristics.capacite.length > 0 ||
              selectedCharacteristics.poids.length > 0 ||
              selectedCharacteristics.qualite.length > 0 ||
              selectedCharacteristics.manches.length > 0 ||
              selectedCharacteristics.col.length > 0;

            if (!hasSelectedTags) {
              return null;
            }

            return (
              <div className="mb-4">
                <h5 className="text-primary mb-3">
                  <i className="bi bi-list-ul me-2"></i>
                  Variations
                </h5>
                <Card className="bg-light">
                  <Card.Body style={{ padding: '1.5rem' }}>
                    <div className="d-flex justify-content-between align-items-center mb-0">
                      <p className="text-muted mb-0">
                        Créez des variations à partir des caractéristiques sélectionnées
                      </p>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={handleAddVariation}
                        disabled={!hasSelectedTags}
                        title="Générer toutes les variations"
                      >
                        <i className="bi bi-plus-circle"></i>
                      </Button>
                    </div>
                    
                    <div className="mb-0">
                      <p className="text-info mb-0" style={{ fontSize: '0.9rem' }}>
                        <i className="bi bi-info-circle me-1"></i>
                        Nombre de variations créées : <strong>{variations.length}</strong>
                      </p>
                    </div>

                    {variations.length > 0 ? (
                      <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <Table hover className="mb-0" style={{ tableLayout: 'fixed', width: '100%' }}>
                          <style>{`
                            .table-responsive table td,
                            .table-responsive table th {
                              border-left: none !important;
                              border-right: none !important;
                            }
                          `}</style>
                          <colgroup>
                            <col style={{ width: '42%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '12%' }} />
                          </colgroup>
                          <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                              <th style={{ width: '42%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '600', borderLeft: 'none', borderRight: 'none' }}>
                                <i className="bi bi-tags me-2"></i>Caractéristiques
                              </th>
                              <th style={{ width: '10%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '600', textAlign: 'center', borderLeft: 'none', borderRight: 'none' }}>
                                <i className="bi bi-image me-2"></i>Image
                              </th>
                              <th style={{ width: '12%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '600', textAlign: 'center', borderLeft: 'none', borderRight: 'none' }}>
                                <i className="bi bi-currency-exchange me-2"></i>Prix Unitaire
                              </th>
                              <th style={{ width: '12%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '600', textAlign: 'center', borderLeft: 'none', borderRight: 'none' }}>
                                <i className="bi bi-box me-2"></i>Quantité
                              </th>
                              <th style={{ width: '12%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '600', textAlign: 'center', borderLeft: 'none', borderRight: 'none' }}>
                                <i className="bi bi-calculator me-2"></i>Total
                              </th>
                              <th style={{ width: '12%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '600', textAlign: 'center', borderLeft: 'none', borderRight: 'none' }}>
                                <i className="bi bi-gear me-2"></i>Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {variations.map((variation, index) => {
                              const prixUnitaire = variation.prixUnitaire || newSubProduct.prix || 0;
                              const quantite = variation.quantite ?? 0;
                              const totalLigne = prixUnitaire * quantite;
                              
                              return (
                                <tr key={variation.id} style={{ verticalAlign: 'middle' }}>
                                  <td style={{ width: '50%', wordWrap: 'break-word', padding: '0.75rem', borderLeft: 'none', borderRight: 'none' }}>
                                    <div className="d-flex flex-wrap gap-1 align-items-center">
                                      {Object.entries(variation.characteristics)
                                        .filter(([_, value]) => value)
                                        .map(([key, value]) => {
                                          const labels: { [key: string]: string } = {
                                            couleurs: 'Couleur',
                                            dimensions: 'Taille',
                                            materiau: 'Matériau',
                                            type: 'Type',
                                            anse: 'Anse',
                                            capacite: 'Capacité',
                                            poids: 'Poids',
                                            qualite: 'Qualité',
                                            manches: 'Manches',
                                            col: 'Col'
                                          };
                                          const colors: { [key: string]: string } = {
                                            couleurs: 'warning',
                                            dimensions: 'success',
                                            materiau: 'dark',
                                            type: 'primary',
                                            anse: 'info',
                                            capacite: 'secondary',
                                            poids: 'light',
                                            qualite: 'primary',
                                            manches: 'info',
                                            col: 'success'
                                          };
                                          return (
                                            <Badge 
                                              key={key} 
                                              bg={colors[key] as any}
                                              text={key === 'poids' ? 'dark' : undefined}
                                              style={{ fontSize: '0.75rem', padding: '0.35em 0.65em' }}
                                            >
                                              <strong>{labels[key] || key}:</strong> {value}
                                            </Badge>
                                          );
                                        })}
                                    </div>
                                  </td>
                                  <td style={{ width: '10%', padding: '0.5rem', textAlign: 'center', verticalAlign: 'middle', borderLeft: 'none', borderRight: 'none' }}>
                                    <div
                                      className="d-flex align-items-center justify-content-center mx-auto"
                                      style={{
                                        width: '70px',
                                        height: '70px',
                                        border: '2px dashed #dee2e6',
                                        borderRadius: '8px',
                                        backgroundColor: '#f8f9fa',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        position: 'relative'
                                      }}
                                      onClick={() => {
                                        const inputId = `variation-image-${variation.id}`;
                                        const input = document.getElementById(inputId) as HTMLInputElement;
                                        if (input) {
                                          input.click();
                                        }
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#007bff';
                                        e.currentTarget.style.backgroundColor = '#e7f3ff';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#dee2e6';
                                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                                      }}
                                      title="Cliquez pour ajouter une image"
                                    >
                                      {variation.image ? (
                                        <img
                                          src={variation.image}
                                          alt="Variation"
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: '6px'
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Optionnel: Ouvrir l'image en grand ou permettre de la changer
                                          }}
                                        />
                                      ) : (
                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '100%',
                                            height: '100%',
                                            fontSize: '1.5rem',
                                            color: '#6c757d',
                                            fontWeight: 'bold'
                                          }}
                                        >
                                          +
                                        </div>
                                      )}
                                      <input
                                        type="file"
                                        id={`variation-image-${variation.id}`}
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleVariationImageUpload(variation.id, e)}
                                      />
                                    </div>
                                  </td>
                                  <td style={{ width: '12%', padding: '0.5rem', textAlign: 'center', borderLeft: 'none', borderRight: 'none' }}>
                                    <Form.Control
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={prixUnitaire}
                                      onChange={(e) => {
                                        const updated = {
                                          ...variation,
                                          prixUnitaire: parseFloat(e.target.value) || 0
                                        };
                                        handleUpdateVariation(updated);
                                      }}
                                      style={{ 
                                        width: '100%', 
                                        textAlign: 'center',
                                        fontSize: '0.9rem',
                                        padding: '0.4rem 0.5rem'
                                      }}
                                      className="text-center"
                                    />
                                  </td>
                                  <td style={{ width: '12%', padding: '0.5rem', textAlign: 'center', borderLeft: 'none', borderRight: 'none' }}>
                                    <Form.Control
                                      type="number"
                                      min="0"
                                      value={quantite}
                                      onChange={(e) => {
                                        const inputValue = e.target.value;
                                        let newQuantite = 0;
                                        if (inputValue === '') {
                                          newQuantite = 0;
                                        } else {
                                          const parsed = parseInt(inputValue);
                                          newQuantite = isNaN(parsed) ? 0 : Math.max(0, parsed);
                                        }
                                        const updated = {
                                          ...variation,
                                          quantite: newQuantite
                                        };
                                        handleUpdateVariation(updated);
                                      }}
                                      style={{ 
                                        width: '100%', 
                                        textAlign: 'center',
                                        fontSize: '0.9rem',
                                        padding: '0.4rem 0.5rem'
                                      }}
                                      className="text-center"
                                    />
                                  </td>
                                  <td style={{ width: '12%', padding: '0.75rem', textAlign: 'center', borderLeft: 'none', borderRight: 'none' }}>
                                    <div className="fw-bold text-primary" style={{ fontSize: '0.95rem' }}>
                                      {totalLigne.toFixed(2)}
                                    </div>
                                  </td>
                                  <td style={{ width: '12%', padding: '0.5rem', textAlign: 'center', borderLeft: 'none', borderRight: 'none' }}>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleDeleteVariation(variation.id)}
                                      title="Supprimer cette variation"
                                      style={{ 
                                        padding: '0.35rem 0.5rem',
                                        fontSize: '0.85rem'
                                      }}
                                    >
                                      <i className="bi bi-trash"></i>
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-info-circle me-2"></i>
                        Aucune variation créée. Cliquez sur "Générer toutes les variations" pour créer automatiquement toutes les combinaisons possibles.
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </div>
            );
          })()}

          {/* Section 3: Prix */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-currency-exchange me-2"></i>
              Section 3: Prix et Quantité
            </h5>
            
            {variations.length > 0 ? (
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Prix Unitaire Moyen (MAD)</Form.Label>
                    <Form.Control
                      type="text"
                      value={`${prixUnitaireMoyenVariations.toFixed(2)} MAD`}
                      readOnly
                      className="bg-light"
                    />
                    <Form.Text className="text-muted">
                      Moyenne des prix unitaires des variations
                    </Form.Text>
                  </Form.Group>
                </Col>
                
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Quantité Totale</Form.Label>
                    <Form.Control
                      type="text"
                      value={totalQuantiteVariations}
                      readOnly
                      className="bg-light"
                    />
                    <Form.Text className="text-muted">
                      Somme des quantités de toutes les variations
                    </Form.Text>
                  </Form.Group>
                </Col>
                
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Prix Total des Variations (MAD)</Form.Label>
                    <Form.Control
                      type="text"
                      value={`${totalPrixVariations.toFixed(2)} MAD`}
                      readOnly
                      className="bg-light"
                    />
                    <Form.Text className="text-muted">
                      Total (prix × quantité) de toutes les variations
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            ) : (
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Prix Unitaire (MAD) *</Form.Label>
                    <Form.Control
                      type="number"
                      value={newSubProduct.prix}
                      onChange={(e) => setNewSubProduct({...newSubProduct, prix: Number(e.target.value)})}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </Form.Group>
                </Col>
                
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Quantité *</Form.Label>
                    <Form.Control
                      type="number"
                      value={newSubProduct.quantite}
                      onChange={(e) => setNewSubProduct({...newSubProduct, quantite: Number(e.target.value)})}
                      placeholder="0"
                      min="0"
                      required
                    />
                  </Form.Group>
                </Col>
                
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Prix Total (MAD)</Form.Label>
                    <Form.Control
                      type="text"
                      value={`${prixTotal.toFixed(2)} MAD`}
                      readOnly
                      className="bg-light"
                    />
                  </Form.Group>
                </Col>
              </Row>
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
          onClick={handleAddSubProduct}
          disabled={!newSubProduct.nom || !newSubProduct.categorie || loading}
        >
          <i className="bi bi-check-circle me-2"></i>
          {loading ? (isEditMode ? 'Mise à jour en cours...' : 'Ajout en cours...') : (isEditMode ? 'Mettre à jour' : 'Ajouter le Sous-produit')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddSubProductModal;
