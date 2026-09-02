import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { Product } from '../../types';
import { ProductService } from '../../services/apiService';
import AddTagModal from './AddTagModal';
import { LabelService, uploadBlobUrl } from '../../services/apiService';
import CustomSelect from '../CustomSelect';
import { PRODUCT_CATEGORIES } from '../../config/characteristics';

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

  // Ref pour éviter de réinitialiser le formulaire une fois que l'utilisateur a commencé à éditer
  const initializedProductIdRef = useRef<string | null>(null);
  // Ref pour éviter que loadData (async) n'écrase les types ajoutés par l'utilisateur en mode création
  const createModeInitializedRef = useRef(false);

  // Initialiser les valeurs en mode édition
  useEffect(() => {
    // Utiliser fullProductData si disponible (produit complet rechargé), sinon initialProduct
    const productToUse = fullProductData || initialProduct;

    if (isEditMode && productToUse) {
      // Clé qui distingue init depuis initialProduct vs fullProductData (données complètes)
      const initKey = `${productToUse.id}:${fullProductData ? 'full' : 'partial'}`;
      // Ne pas réinitialiser si on a déjà chargé la version complète (évite d'écraser les saisies utilisateur)
      if (initializedProductIdRef.current === initKey) return;
      // Autoriser le passage de 'partial' → 'full', mais pas 'full' → 'full' ni 'partial' → 'partial'
      if (initializedProductIdRef.current === `${productToUse.id}:full`) return;
      initializedProductIdRef.current = initKey;
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
      initializedProductIdRef.current = null as any;
      createModeInitializedRef.current = false;
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
      setAvailableCharacteristics([]);
      setUserAddedCharacteristics([]);
      setNewCharTypeLabel('');
      setNewCharTypeKey('');
    }
  }, [show]);
  
  // État pour la modal d'ajout de tag
  const [showTagModal, setShowTagModal] = useState(false);
  const [currentTagField, setCurrentTagField] = useState<string>('type');
  const [tagInputValue, setTagInputValue] = useState('');
  
  // États pour les tags visuels (clés fixes + dynamiques)
  const [tags, setTags] = useState<Record<string, string[]>>({
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

  // États pour les caractéristiques dynamiques
  const [customLabels, setCustomLabels] = useState<Map<string, string>>(new Map());
  const [customCharacteristics, setCustomCharacteristics] = useState<Array<{ key: string; label: string }>>([]);
  // Types chargés depuis Firebase (remplacés à chaque rechargement)
  const [availableCharacteristics, setAvailableCharacteristics] = useState<Array<{ key: string; label: string }>>([]);
  // Types ajoutés manuellement par l'utilisateur (jamais écrasés par Firebase)
  const [userAddedCharacteristics, setUserAddedCharacteristics] = useState<Array<{ key: string; label: string }>>([]);
  // État pour stocker toutes les valeurs disponibles pour chaque caractéristique (depuis tous les produits)
  const [allAvailableValues, setAllAvailableValues] = useState<Map<string, string[]>>(new Map());

  // États pour l'ajout d'un nouveau type de caractéristique (mode création)
  const [showAddCharTypeModal, setShowAddCharTypeModal] = useState(false);
  const [newCharTypeLabel, setNewCharTypeLabel] = useState('');
  const [newCharTypeKey, setNewCharTypeKey] = useState('');

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

  // Charger les labels personnalisés depuis l'API
  const loadCustomLabels = useCallback(async () => {
    try {
      const labelsData = await LabelService.getLabels();
      const labelsMap = new Map<string, string>(Object.entries(labelsData));
      setCustomLabels(labelsMap);
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
            console.log('🔄 Rechargement du produit depuis l\'API MySQL...');
            const productData = await ProductService.getProductById(initialProduct.id);
            if (productData) {
              const standardFieldsList = ['id', 'nom', 'description', 'prix', 'image', 'images', 'categorie', 'stock', 'fournisseur', 'dateCreation', 'dateModification'];
              const fullProduct: any = { ...productData };
              // Ne garder que les caractéristiques qui sont des tableaux non vides
              Object.keys(fullProduct).forEach(key => {
                if (!standardFieldsList.includes(key) && Array.isArray(fullProduct[key]) && fullProduct[key].length === 0) {
                  delete fullProduct[key];
                }
              });
              setFullProductData(fullProduct);
              const labelsData = await LabelService.getLabels();
              const labelsMap = new Map<string, string>(Object.entries(labelsData));
              determineAvailableCharacteristics(fullProduct, labelsMap);
            } else {
              determineAvailableCharacteristics(initialProduct);
            }
          } catch (error) {
            console.error('❌ Erreur lors du rechargement du produit:', error);
            determineAvailableCharacteristics(initialProduct);
          }
        } else if (!isEditMode) {
          // En mode création, initialiser une seule fois (évite d'écraser les types ajoutés par l'utilisateur)
          if (!createModeInitializedRef.current) {
            createModeInitializedRef.current = true;
            setAvailableCharacteristics([]);
          }
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
        // Récupérer les labels depuis l'API
        const loadLabelsAndDetermine = async () => {
          try {
            const labelsData = await LabelService.getLabels();
            const labelsMap = new Map<string, string>(Object.entries(labelsData));
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

  const openTagModal = useCallback((field: string) => {
    setCurrentTagField(field);
    setTagInputValue('');
    setShowTagModal(true);
  }, []);

  const addTagFromModal = useCallback(() => {
    const tagValue = tagInputValue.trim();

    if (tagValue) {
      // Ajouter au tableau des tags (toutes les clés sont valides)
      setTags(prev => {
        const currentTags = prev[currentTagField] || [];
        if (!currentTags.includes(tagValue)) {
          return { ...prev, [currentTagField]: [...currentTags, tagValue] };
        }
        return prev;
      });

      // Mettre à jour le champ texte si c'est un champ fixe de newProduct
      const fixedFields = ['type', 'anse', 'couleurs', 'dimensions', 'materiau', 'capacite', 'poids', 'qualite', 'manches', 'col'];
      if (fixedFields.includes(currentTagField)) {
        setNewProduct(prev => {
          const currentValue = prev[currentTagField as keyof typeof prev] as string;
          const existingValues = currentValue ? currentValue.split(',').map(v => v.trim()) : [];
          if (!existingValues.includes(tagValue)) {
            return { ...prev, [currentTagField]: currentValue ? `${currentValue}, ${tagValue}` : tagValue };
          }
          return prev;
        });
      }

      setShowTagModal(false);
      setTagInputValue('');
    }
  }, [tagInputValue, currentTagField]);

  const removeTag = useCallback((field: string, tagToRemove: string) => {
    setTags(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter(tag => tag !== tagToRemove)
    }));

    // Mettre à jour le champ texte si c'est un champ fixe
    const fixedFields = ['type', 'anse', 'couleurs', 'dimensions', 'materiau', 'capacite', 'poids', 'qualite', 'manches', 'col'];
    if (fixedFields.includes(field)) {
      setNewProduct(prev => {
        const currentValue = prev[field as keyof typeof prev] as string;
        const updatedValues = currentValue ? currentValue.split(',').map(v => v.trim()).filter(v => v !== tagToRemove) : [];
        return { ...prev, [field]: updatedValues.join(', ') };
      });
    }
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
              // Téléverser l'image dans Firebase Storage
              try {
                console.log('🔄 Téléversement de l\'image vers Storage...');
                const storageUrl = await uploadBlobUrl(image, 'images/produits');
                imageUrls.push(storageUrl);
                console.log(`✅ Image ${i + 1} téléversée (total: ${imageUrls.length})`);
              } catch (error) {
                console.error('❌ Erreur lors du téléversement de l\'image:', error);
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
      
      // Collecter les caractéristiques dynamiques (clés non fixes)
      const fixedFields = ['type', 'anse', 'couleurs', 'dimensions', 'materiau', 'capacite', 'poids', 'qualite', 'manches', 'col'];
      const dynamicCharacteristics: Record<string, string[]> = {};
      Object.entries(tags).forEach(([key, values]) => {
        if (!fixedFields.includes(key) && Array.isArray(values) && values.length > 0) {
          dynamicCharacteristics[key] = values;
        }
      });

      // Ne sauvegarder les champs de caractéristiques standard que s'ils ont des valeurs
      const standardCharFields = ['type', 'anse', 'couleurs', 'dimensions', 'materiau', 'capacite', 'poids', 'qualite', 'manches', 'col'];
      const nonEmptyStandardChars: Record<string, string[]> = {};
      standardCharFields.forEach(field => {
        if (tags[field] && tags[field].length > 0) {
          nonEmptyStandardChars[field] = tags[field];
        }
      });

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
        // Seulement les caractéristiques standard non vides
        ...nonEmptyStandardChars,
        // Caractéristiques dynamiques créées en mode création
        ...dynamicCharacteristics,
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

      console.log('💾 Données à sauvegarder (caractéristiques non vides):', { ...nonEmptyStandardChars, ...dynamicCharacteristics });

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

        // Sauvegarder les labels des nouveaux types via l'API
        if (Object.keys(dynamicCharacteristics).length > 0) {
          try {
            const newLabels: Record<string, string> = {};
            [...availableCharacteristics, ...userAddedCharacteristics].forEach(char => {
              if (dynamicCharacteristics[char.key] !== undefined) {
                newLabels[char.key] = char.label;
              }
            });
            await LabelService.updateLabels(newLabels);
          } catch (labelError) {
            console.error('⚠️ Erreur lors de la sauvegarde des labels:', labelError);
          }
        }
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
  }, [newProduct, tags, isEditMode, initialProduct, availableCharacteristics, onAlert, onHide, onProductAdded]);

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
                    <Form.Label>Catégorie du produit</Form.Label>
                    <CustomSelect
                      value={newProduct.categorie}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, categorie: e.target.value }))}
                    >
                      <option value="">Aucune catégorie</option>
                      {PRODUCT_CATEGORIES.map((categorie) => (
                        <option key={categorie} value={categorie}>{categorie}</option>
                      ))}
                      {/* Catégorie déjà enregistrée hors de la liste : conservée */}
                      {newProduct.categorie && !PRODUCT_CATEGORIES.includes(newProduct.categorie) && (
                        <option value={newProduct.categorie}>{newProduct.categorie}</option>
                      )}
                    </CustomSelect>
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
                
                <Col md={6} style={{ display: 'flex', flexDirection: 'column' }}>
                  <Form.Group className="mb-3" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <Form.Label>Images du produit</Form.Label>

                    {/* Zone d'upload — même hauteur que la colonne gauche */}
                    <div
                      className="image-upload-zone"
                      onDrop={handleImageDrop}
                      onDragOver={handleDragOver}
                      style={{
                        border: '2px dashed #dee2e6',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '260px',
                      }}
                    >
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        multiple
                        style={{ display: 'none' }}
                        id="image-upload"
                      />

                      {newProduct.images.length === 0 ? (
                        /* État vide */
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                          <i className="bi bi-cloud-upload" style={{ fontSize: '2.2rem', color: '#adb5bd' }}></i>
                          <p className="mt-2 mb-1 text-muted" style={{ fontSize: '0.9rem' }}>Glissez-déposez des images ici</p>
                          <p className="text-muted small mb-2">ou</p>
                          <Form.Label htmlFor="image-upload" className="btn btn-outline-primary btn-sm" style={{ cursor: 'pointer', borderRadius: '20px', padding: '0.35rem 1.1rem' }}>
                            Choisir des fichiers
                          </Form.Label>
                          <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.72rem' }}>JPG, JPEG, PNG, WEBP (max 5MB par image)</p>
                        </div>
                      ) : (
                        /* État avec images */
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          {/* Barre d'actions */}
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 500 }}>
                              <i className="bi bi-images me-1"></i>{newProduct.images.length} image{newProduct.images.length > 1 ? 's' : ''}
                            </span>
                            <div className="d-flex gap-2">
                              <Form.Label
                                htmlFor="image-upload"
                                className="mb-0"
                                style={{
                                  cursor: 'pointer',
                                  background: 'linear-gradient(135deg, #0d6efd, #0b5ed7)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '20px',
                                  padding: '0.3rem 0.85rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 6px rgba(13,110,253,0.3)',
                                  transition: 'opacity 0.2s'
                                }}
                              >
                                <i className="bi bi-plus-circle"></i> Ajouter
                              </Form.Label>
                              <button
                                type="button"
                                onClick={removeAllImages}
                                style={{
                                  background: 'linear-gradient(135deg, #dc3545, #b02a37)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '20px',
                                  padding: '0.3rem 0.85rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(220,53,69,0.3)',
                                }}
                              >
                                <i className="bi bi-trash"></i> Tout supprimer
                              </button>
                            </div>
                          </div>

                          {/* Grille d'aperçus */}
                          <div className="row g-2">
                            {newProduct.images.map((image, index) => (
                              <div key={index} className="col-4">
                                <div className="position-relative">
                                  <img
                                    src={image}
                                    alt={`Aperçu ${index + 1}`}
                                    style={{
                                      width: '100%',
                                      height: '85px',
                                      objectFit: 'cover',
                                      borderRadius: '8px',
                                      border: '1px solid #dee2e6',
                                      display: 'block'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); removeImage(index); }}
                                    style={{
                                      position: 'absolute',
                                      top: '4px',
                                      right: '4px',
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      border: 'none',
                                      background: 'rgba(220,53,69,0.9)',
                                      color: '#fff',
                                      fontSize: '13px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      padding: 0,
                                      lineHeight: 1,
                                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)'
                                    }}
                                  >×</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Section 2: Caractéristiques */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="text-primary mb-0">
                  <i className="bi bi-gear me-2"></i>
                  Section 2: Caractéristiques
                </h5>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => { setNewCharTypeLabel(''); setNewCharTypeKey(''); setShowAddCharTypeModal(true); }}
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Ajouter un type
                </Button>
              </div>

              {(() => {
                // Combiner les types Firebase + types ajoutés par l'utilisateur (sans doublons)
                const allCharKeys = new Set(availableCharacteristics.map(c => c.key));
                const mergedCharacteristics = [
                  ...availableCharacteristics,
                  ...userAddedCharacteristics.filter(c => !allCharKeys.has(c.key))
                ];
                return mergedCharacteristics.length > 0 ? (
                (() => {
                  const rows: React.ReactElement[] = [];
                  for (let i = 0; i < mergedCharacteristics.length; i += 2) {
                    const renderCharCol = (charType: { key: string; label: string }) => {
                      const charKey = charType.key;
                      const charTags = tags[charKey] || [];
                      const badgeColor = getBadgeColor(charKey);

                      return (
                        <Form.Group className="mb-3" key={charKey}>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <Form.Label className="mb-0 fw-semibold">{charType.label}</Form.Label>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => openTagModal(charKey)}
                                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                              >
                                <i className="bi bi-plus me-1"></i>Ajouter une valeur
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => {
                                  setAvailableCharacteristics(prev => prev.filter(c => c.key !== charKey));
                                  setUserAddedCharacteristics(prev => prev.filter(c => c.key !== charKey));
                                  setTags(prev => { const next = { ...prev }; delete next[charKey]; return next; });
                                }}
                                style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem' }}
                                title="Supprimer ce type"
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </div>
                          <div className="tags-container" style={{ minHeight: '36px' }}>
                            {charTags.length > 0 ? (
                              charTags.map((value, index) => (
                                <span
                                  key={index}
                                  className={`tag-badge bg-${badgeColor}`}
                                  style={{ cursor: 'default', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  {value}
                                  <i
                                    className="bi bi-x"
                                    style={{ cursor: 'pointer', fontSize: '0.85rem', opacity: 0.7 }}
                                    onClick={() => removeTag(charKey, value)}
                                    title="Supprimer cette valeur"
                                  ></i>
                                </span>
                              ))
                            ) : (
                              <span className="text-muted small">Cliquez sur « Ajouter une valeur » pour commencer</span>
                            )}
                          </div>
                        </Form.Group>
                      );
                    };

                    const charType = mergedCharacteristics[i];
                    const nextCharType = i + 1 < mergedCharacteristics.length ? mergedCharacteristics[i + 1] : null;

                    rows.push(
                      <Row key={`row-${i}`}>
                        <Col md={6}>{renderCharCol(charType)}</Col>
                        {nextCharType && <Col md={6}>{renderCharCol(nextCharType)}</Col>}
                      </Row>
                    );
                  }
                  return rows;
                })()
              ) : (
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  {isEditMode
                    ? 'Ce produit n\'a pas encore de caractéristiques. Cliquez sur « Ajouter un type » pour en ajouter.'
                    : 'Aucun type de caractéristique ajouté. Cliquez sur « Ajouter un type » pour commencer.'}
                </div>
              );
              })()}
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

      {/* Modal pour ajouter un nouveau type de caractéristique (mode création) */}
      <Modal show={showAddCharTypeModal} onHide={() => setShowAddCharTypeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-plus-circle me-2"></i>
            Nouveau type de caractéristique
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nom du type <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="Ex: Finition, Emballage, Certification..."
              value={newCharTypeLabel}
              onChange={(e) => {
                const label = e.target.value;
                setNewCharTypeLabel(label);
                // Générer automatiquement la clé depuis le label
                const key = label.toLowerCase()
                  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '');
                setNewCharTypeKey(key);
              }}
              autoFocus
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Clé interne</Form.Label>
            <Form.Control
              type="text"
              placeholder="generee-automatiquement"
              value={newCharTypeKey}
              onChange={(e) => setNewCharTypeKey(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
            />
            <Form.Text className="text-muted">Identifiant unique, généré automatiquement depuis le nom.</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddCharTypeModal(false)}>
            Annuler
          </Button>
          <Button
            variant="primary"
            disabled={!newCharTypeLabel.trim() || !newCharTypeKey.trim()}
            onClick={() => {
              const key = newCharTypeKey.trim();
              const label = newCharTypeLabel.trim();
              // Vérifier que la clé n'existe pas déjà (dans les deux listes)
              const allChars = [...availableCharacteristics, ...userAddedCharacteristics];
              if (allChars.some(c => c.key === key)) {
                return;
              }
              // Ajouter dans la liste utilisateur (jamais écrasée par Firebase)
              setUserAddedCharacteristics(prev => [...prev, { key, label }]);
              setTags(prev => ({ ...prev, [key]: [] }));
              setShowAddCharTypeModal(false);
            }}
          >
            <i className="bi bi-check-circle me-1"></i>
            Ajouter
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AddProductModal;