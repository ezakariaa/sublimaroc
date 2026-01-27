import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Card, Badge, Table } from 'react-bootstrap';
import { SubProductService, ProductService, ArticleService } from '../../services/firebaseService';
import { SubProduct, Product } from '../../types';

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
  };
  prixUnitaire?: number;
  quantite?: number;
  image?: string;
}

interface Article {
  id: string;
  referenceArticle: string;
  nom: string;
  categorieArticle: string;
  image?: string;
  petiteDescription?: string;
  description?: string;
  prixUnitaire: number;
  quantite: number;
  prixAPayer: number;
  dateCreation: Date;
  dateModification: Date;
  selectedTags?: {
    type?: string[];
    anse?: string[];
    couleurs?: string[];
    dimensions?: string[];
    materiau?: string[];
    capacite?: string[];
    poids?: string[];
  };
  variations?: Variation[];
}

interface AddArticleModalProps {
  show: boolean;
  onHide: () => void;
  onArticleAdded: () => void;
  onAlert?: (type: 'success' | 'danger', message: string) => void;
  initialArticle?: Article | null;
  isEditMode?: boolean;
}

const AddArticleModal: React.FC<AddArticleModalProps> = ({
  show,
  onHide,
  onArticleAdded,
  onAlert,
  initialArticle,
  isEditMode = false
}) => {
  // Fonction pour générer la référence d'article
  const generateReferenceArticle = useCallback(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const randomNumbers = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `GRA-ART-${day}${month}${year}-${randomNumbers}`;
  }, []);

  // États pour les données de l'article
  const [referenceArticle, setReferenceArticle] = useState<string>('');
  const [nomArticle, setNomArticle] = useState<string>('');
  const [categorieArticle, setCategorieArticle] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [petiteDescription, setPetiteDescription] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [prixUnitaire, setPrixUnitaire] = useState<number>(0);
  const [quantite, setQuantite] = useState<number>(1);
  const [prixAPayer, setPrixAPayer] = useState<number>(0);

  // États pour la gestion des données
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductSubProducts, setSelectedProductSubProducts] = useState<SubProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  
  // État pour les tags sélectionnés
  const [selectedTags, setSelectedTags] = useState<{
    type: Set<string>;
    anse: Set<string>;
    couleurs: Set<string>;
    dimensions: Set<string>;
    materiau: Set<string>;
    capacite: Set<string>;
    poids: Set<string>;
  }>({
    type: new Set(),
    anse: new Set(),
    couleurs: new Set(),
    dimensions: new Set(),
    materiau: new Set(),
    capacite: new Set(),
    poids: new Set()
  });

  // État pour les variations
  const [variations, setVariations] = useState<Variation[]>([]);
  const [previousCategorieArticle, setPreviousCategorieArticle] = useState<string>('');

  // Charger la liste des produits au montage du composant
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        console.log('🔄 Chargement des produits...');
        const productsData = await ProductService.getAllProducts();
        console.log('✅ Produits chargés:', productsData.length);
        setProducts(productsData);
      } catch (error) {
        console.error('❌ Erreur lors du chargement des produits:', error);
        if (onAlert) {
          onAlert('danger', 'Erreur lors du chargement des catégories d\'articles');
        }
      } finally {
        setLoading(false);
      }
    };

    if (show) {
      loadProducts();
    }
  }, [show, onAlert]);
  
  // Définir la catégorie en mode édition une fois que les produits sont chargés
  useEffect(() => {
    if (show && isEditMode && initialArticle && initialArticle.categorieArticle && products.length > 0) {
      // Vérifier si la catégorie n'est pas déjà définie ou si elle ne correspond pas à l'article initial
      if (categorieArticle !== initialArticle.categorieArticle) {
        console.log('📝 Définition de la catégorie en mode édition:', initialArticle.categorieArticle);
        setCategorieArticle(initialArticle.categorieArticle);
        // Mettre à jour previousCategorieArticle pour éviter la réinitialisation des tags
        setPreviousCategorieArticle(initialArticle.categorieArticle);
      }
    }
  }, [show, isEditMode, initialArticle, products.length, categorieArticle]);

  // Charger les sous-produits et le produit sélectionné quand un produit est sélectionné
  useEffect(() => {
    const loadSubProductsForProduct = async () => {
      if (!categorieArticle || !show) {
        if (!categorieArticle) {
          setSelectedProductSubProducts([]);
          setSelectedProduct(null);
          // Réinitialiser les tags sélectionnés seulement si la catégorie est vraiment supprimée (pas juste vide au début)
          if ((!isEditMode || !initialArticle) && previousCategorieArticle !== '') {
            console.log('🗑️ Catégorie supprimée, réinitialisation des tags');
            setSelectedTags({
              type: new Set(),
              anse: new Set(),
              couleurs: new Set(),
              dimensions: new Set(),
              materiau: new Set(),
              capacite: new Set(),
              poids: new Set()
            });
            setPreviousCategorieArticle('');
          }
        }
        return;
      }

      try {
        // Trouver le produit sélectionné
        const product = products.find(p => p.id === categorieArticle);
        if (product) {
          console.log('📦 Produit sélectionné trouvé:', product.nom);
          setSelectedProduct(product);
        } else {
          console.log('⚠️ Produit sélectionné non trouvé dans la liste');
          setSelectedProduct(null);
        }

        console.log('🔄 Chargement des sous-produits pour le produit:', categorieArticle);
        const subProducts = await SubProductService.getSubProductsByProductId(categorieArticle);
        console.log('✅ Sous-produits chargés:', subProducts.length);
        console.log('📋 Détails des sous-produits:', subProducts.map(sp => ({
          id: sp.id,
          nom: sp.nom,
          type: sp.type,
          anse: sp.anse,
          couleurs: sp.couleurs,
          dimensions: sp.dimensions,
          materiau: sp.materiau,
          capacite: sp.capacite,
          poids: sp.poids
        })));
        setSelectedProductSubProducts(subProducts);
        
        // Ne réinitialiser les tags sélectionnés QUE si on change vraiment de catégorie (pas au premier chargement)
        const isCategoryChange = previousCategorieArticle !== '' && previousCategorieArticle !== categorieArticle;
        
        console.log('🔍 Vérification changement catégorie:', {
          previousCategorieArticle,
          categorieArticle,
          isCategoryChange,
          show,
          isEditMode
        });
        
        if (isCategoryChange) {
          console.log('🔄 Changement de catégorie détecté:', previousCategorieArticle, '->', categorieArticle);
          // Réinitialiser les tags et variations seulement lors d'un vrai changement
          setSelectedTags({
            type: new Set(),
            anse: new Set(),
            couleurs: new Set(),
            dimensions: new Set(),
            materiau: new Set(),
            capacite: new Set(),
            poids: new Set()
          });
          setVariations([]);
          setVariationsLoaded(false);
        } else {
          console.log('✅ Pas de changement de catégorie, conservation des tags sélectionnés');
        }
        
        // Toujours mettre à jour previousCategorieArticle pour suivre la catégorie actuelle (seulement si différent)
        if (categorieArticle && previousCategorieArticle !== categorieArticle) {
          console.log('📝 Mise à jour previousCategorieArticle:', previousCategorieArticle, '->', categorieArticle);
          setPreviousCategorieArticle(categorieArticle);
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des sous-produits:', error);
        setSelectedProductSubProducts([]);
        setSelectedProduct(null);
      }
    };

    loadSubProductsForProduct();
  }, [categorieArticle, show, products, isEditMode, initialArticle]);

  // Calculer automatiquement le prix à payer
  useEffect(() => {
    const total = prixUnitaire * quantite;
    setPrixAPayer(total);
  }, [prixUnitaire, quantite]);

  // Initialiser les données quand la modale s'ouvre en mode édition
  useEffect(() => {
    if (show && isEditMode && initialArticle) {
      console.log('📝 Initialisation des données en mode édition:', initialArticle);
      setReferenceArticle(initialArticle.referenceArticle);
      setNomArticle(initialArticle.nom);
      // Ne pas définir categorieArticle ici, elle sera définie après le chargement des produits
      setImagePreview(initialArticle.image || '');
      setImageFile(null);
      setPetiteDescription(initialArticle.petiteDescription || '');
      setDescription(initialArticle.description || '');
      setPrixUnitaire(initialArticle.prixUnitaire);
      setQuantite(initialArticle.quantite);
      setPrixAPayer(initialArticle.prixAPayer);
      
      // Charger les tags sélectionnés si disponibles
      if (initialArticle.selectedTags) {
        setSelectedTags({
          type: new Set(initialArticle.selectedTags.type || []),
          anse: new Set(initialArticle.selectedTags.anse || []),
          couleurs: new Set(initialArticle.selectedTags.couleurs || []),
          dimensions: new Set(initialArticle.selectedTags.dimensions || []),
          materiau: new Set(initialArticle.selectedTags.materiau || []),
          capacite: new Set(initialArticle.selectedTags.capacite || []),
          poids: new Set(initialArticle.selectedTags.poids || [])
        });
      }
      
      // Initialiser previousCategorieArticle avec la catégorie de l'article en mode édition
      if (initialArticle.categorieArticle) {
        setPreviousCategorieArticle(initialArticle.categorieArticle);
      }
    } else if (!show) {
      // Réinitialiser les états quand la modale se ferme
      setReferenceArticle('');
      setNomArticle('');
      setCategorieArticle('');
      setImageFile(null);
      setImagePreview('');
      setPetiteDescription('');
      setDescription('');
      setPrixUnitaire(0);
      setQuantite(1);
      setPrixAPayer(0);
      setSelectedProduct(null);
      setSelectedProductSubProducts([]);
      setSelectedTags({
        type: new Set(),
        anse: new Set(),
        couleurs: new Set(),
        dimensions: new Set(),
        materiau: new Set(),
        capacite: new Set(),
        poids: new Set()
      });
      setVariations([]);
      setVariationsLoaded(false);
    } else if (show && !isEditMode) {
      // Générer une nouvelle référence si la modale s'ouvre en mode création
      setReferenceArticle(generateReferenceArticle());
      // Réinitialiser les tags en mode création
      setSelectedTags({
        type: new Set(),
        anse: new Set(),
        couleurs: new Set(),
        dimensions: new Set(),
        materiau: new Set(),
        capacite: new Set(),
        poids: new Set()
      });
      setVariations([]);
      setVariationsLoaded(false);
    }
  }, [show, isEditMode, initialArticle, generateReferenceArticle]);

  // Flag pour éviter de recharger les variations plusieurs fois
  const [variationsLoaded, setVariationsLoaded] = useState(false);
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  
  // Charger les variations en mode édition (seulement au premier chargement de la modale pour cet article)
  useEffect(() => {
    // Ne charger les variations QUE si on est en mode édition ET que c'est un nouvel article
    if (show && isEditMode && initialArticle) {
      // Si c'est un nouvel article (ID différent), réinitialiser le flag et charger les variations
      if (currentArticleId !== initialArticle.id) {
        console.log('🔄 Nouvel article détecté:', initialArticle.id);
        setCurrentArticleId(initialArticle.id);
        setVariationsLoaded(false);
        
        // Charger les variations de ce nouvel article
        if (initialArticle.variations && initialArticle.variations.length > 0) {
          console.log('📦 Chargement des variations existantes:', initialArticle.variations.length);
          setVariations(initialArticle.variations);
        } else {
          console.log('📝 Aucune variation existante, tableau vide initialisé');
          setVariations([]);
        }
        setVariationsLoaded(true);
      }
      // Si c'est le même article, ne RIEN faire - ne pas écraser les variations créées par l'utilisateur
    } else if (!show) {
      // Réinitialiser les flags quand la modale se ferme
      console.log('🚪 Fermeture de la modale, réinitialisation des flags');
      setVariationsLoaded(false);
      setCurrentArticleId(null);
    }
    // En mode création (isEditMode === false), ne RIEN faire - laisser l'utilisateur créer ses variations
  }, [show, isEditMode, initialArticle?.id, currentArticleId]); // Ne pas inclure variationsLoaded pour éviter les boucles
  
  // Fonction pour gérer la sélection/désélection d'un tag
  const toggleTag = useCallback((category: keyof typeof selectedTags, tag: string) => {
    console.log('🏷️ Toggle tag:', category, tag);
    setSelectedTags(prev => {
      const newTags = { ...prev };
      const categorySet = new Set(newTags[category]);
      
      if (categorySet.has(tag)) {
        categorySet.delete(tag);
        console.log('❌ Tag désélectionné:', tag);
      } else {
        categorySet.add(tag);
        console.log('✅ Tag sélectionné:', tag);
      }
      
      newTags[category] = categorySet;
      console.log('📋 Tags après toggle:', Array.from(categorySet));
      return newTags;
    });
  }, []);

  // Fonction pour générer toutes les combinaisons possibles de caractéristiques
  const generateAllCombinations = useCallback(() => {
    const categories = ['type', 'anse', 'couleurs', 'dimensions', 'materiau', 'capacite', 'poids'] as const;
    const selectedArrays = categories.map(cat => Array.from(selectedTags[cat]));
    
    // Filtrer les catégories qui ont des valeurs sélectionnées
    const activeCategories = categories.filter((cat, index) => selectedArrays[index].length > 0);
    
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

    const activeArrays = activeCategories.map(cat => Array.from(selectedTags[cat]));
    return combine(activeArrays);
  }, [selectedTags]);

  // Fonction pour créer une variation à partir d'une combinaison
  const createVariationFromCombination = useCallback((combination: any) => {
    const newVariation: Variation = {
      id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      characteristics: combination,
      prixUnitaire: prixUnitaire,
      quantite: 1
    };
    return newVariation;
  }, [prixUnitaire]);

  // Fonction pour ajouter une variation
  const handleAddVariation = useCallback(() => {
    console.log('🔄 Génération des variations...');
    const combinations = generateAllCombinations();
    console.log('📊 Combinaisons générées:', combinations.length);
    
    if (combinations.length === 0) {
      if (onAlert) {
        onAlert('danger', 'Veuillez sélectionner au moins une caractéristique pour créer des variations');
      }
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
        if (onAlert) {
          onAlert('danger', 'Toutes les variations possibles existent déjà');
        }
      } else if (uniqueNewVariations.length < newVariations.length) {
        if (onAlert) {
          onAlert('success', `${uniqueNewVariations.length} nouvelle(s) variation(s) ajoutée(s) (${newVariations.length - uniqueNewVariations.length} déjà existante(s))`);
        }
      } else if (onAlert) {
        onAlert('success', `${uniqueNewVariations.length} variation(s) créée(s) avec succès !`);
      }
      
      return finalVariations;
    });
    
    // Marquer que les variations ont été modifiées pour éviter qu'elles soient écrasées
    setVariationsLoaded(true);
  }, [generateAllCombinations, createVariationFromCombination, onAlert]);

  // Fonction pour supprimer une variation
  const handleDeleteVariation = useCallback((variationId: string) => {
    setVariations(prev => prev.filter(v => v.id !== variationId));
  }, []);

  // Fonction pour mettre à jour une variation
  const handleUpdateVariation = useCallback((updatedVariation: Variation) => {
    setVariations(prev => prev.map(v => v.id === updatedVariation.id ? updatedVariation : v));
  }, []);

  // Gestion de l'upload d'image
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        if (onAlert) {
        onAlert('danger', 'Format de fichier non supporté. Utilisez JPG, JPEG, PNG ou WEBP.');
        }
        return;
      }
      
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        if (onAlert) {
        onAlert('danger', 'Le fichier est trop volumineux. Taille maximale: 5MB.');
        }
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, [onAlert]);

  // Gestion du drag & drop d'image
  const handleImageDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        if (onAlert) {
        onAlert('danger', 'Format de fichier non supporté. Utilisez JPG, JPEG, PNG ou WEBP.');
        }
        return;
      }
      
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        if (onAlert) {
        onAlert('danger', 'Le fichier est trop volumineux. Taille maximale: 5MB.');
        }
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, [onAlert]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // Supprimer une image
  const removeImage = useCallback(() => {
    setImageFile(null);
    setImagePreview('');
  }, []);

  // Sauvegarder l'article
  const handleSaveArticle = useCallback(async () => {
    try {
      // Validation des champs obligatoires
      if (!nomArticle.trim()) {
        if (onAlert) {
          onAlert('danger', 'Le nom de l\'article est obligatoire');
        }
        return;
      }

      if (!categorieArticle) {
        if (onAlert) {
          onAlert('danger', 'La catégorie d\'article est obligatoire');
        }
        return;
      }

      if (prixUnitaire <= 0) {
        if (onAlert) {
          onAlert('danger', 'Le prix unitaire doit être supérieur à 0');
        }
          return;
        }

      if (quantite <= 0) {
        if (onAlert) {
          onAlert('danger', 'La quantité doit être supérieure à 0');
        }
          return;
        }

      // Convertir l'image en base64 si une nouvelle image est uploadée
      let imageBase64 = '';
      if (imageFile) {
        try {
          console.log('🖼️ Conversion de l\'image en base64...');
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              // Limiter la taille à 1MB pour éviter les problèmes avec Firestore
              if (result.length > 1000000) {
                console.warn('⚠️ Image trop grande, réduction de la taille...');
                // Tronquer à 1MB
                resolve(result.substring(0, 1000000));
              } else {
                resolve(result);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
          });
          console.log('✅ Image convertie en base64, taille:', imageBase64.length, 'bytes');
        } catch (error) {
          console.error('❌ Erreur lors de la conversion de l\'image:', error);
          if (onAlert) {
            onAlert('danger', 'Erreur lors de la conversion de l\'image');
          }
          return;
        }
      } else if (isEditMode && initialArticle && imagePreview && !imagePreview.startsWith('blob:')) {
        // En mode édition, si aucune nouvelle image n'est uploadée, garder l'image existante
        imageBase64 = imagePreview;
      }

      // Préparer les données pour Firestore
      const articleData: any = {
        nom: nomArticle.trim(),
        categorieArticle,
        petiteDescription: petiteDescription.trim(),
        description: description.trim(),
        prixUnitaire,
        quantite,
        prixAPayer,
        // Ajouter les tags sélectionnés
        selectedTags: {
          type: Array.from(selectedTags.type),
          anse: Array.from(selectedTags.anse),
          couleurs: Array.from(selectedTags.couleurs),
          dimensions: Array.from(selectedTags.dimensions),
          materiau: Array.from(selectedTags.materiau),
          capacite: Array.from(selectedTags.capacite),
          poids: Array.from(selectedTags.poids)
        },
        // Ajouter les variations si elles existent
        variations: variations.length > 0 ? variations : undefined
      };

      // Ajouter l'image seulement si elle existe (nouvelle ou existante)
      if (imageBase64) {
        articleData.image = imageBase64;
      }

      console.log('💾 Sauvegarde de l\'article dans Firestore...');
      console.log('📋 Données:', {
        referenceArticle,
        nom: articleData.nom,
        categorieArticle,
        hasImage: !!imageBase64,
        imageLength: imageBase64 ? imageBase64.length : 0,
        prixUnitaire,
        quantite,
        prixAPayer,
        selectedTags: articleData.selectedTags,
        variationsCount: variations.length
      });

      // Sauvegarder dans Firestore
      if (isEditMode && initialArticle) {
        // Mode édition : mettre à jour l'article existant
        await ArticleService.updateArticle(initialArticle.referenceArticle, articleData);
        if (onAlert) {
          onAlert('success', `Article "${nomArticle}" modifié avec succès !`);
        }
      } else {
        // Mode création : créer un nouvel article
        articleData.referenceArticle = referenceArticle;
        await ArticleService.createArticle(articleData);
        if (onAlert) {
          onAlert('success', `Article "${nomArticle}" enregistré avec succès !`);
        }
      }
      
      onArticleAdded();
      onHide();

    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'article:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement de l\'article';
      if (onAlert) {
      onAlert('danger', errorMessage);
    }
    }
  }, [nomArticle, categorieArticle, prixUnitaire, quantite, referenceArticle, imageFile, petiteDescription, description, prixAPayer, selectedTags, variations, isEditMode, initialArticle, onAlert, onArticleAdded, onHide]);

  return (
    <Modal 
      show={show} 
      onHide={onHide}
      size="lg"
      centered
    >
        <Modal.Header closeButton>
          <Modal.Title>
          <i className={`bi ${isEditMode ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
          {isEditMode ? 'Modifier un Article' : 'Ajouter un Article'}
          </Modal.Title>
        </Modal.Header>
      <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <Form>
          {/* Référence Article */}
            <div className="mb-4">
              <Card className="bg-primary text-white">
              <Card.Body style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
                  <div className="d-flex align-items-center">
                  <i className="bi bi-tag-fill me-3" style={{ fontSize: '2rem' }}></i>
                    <div>
                    <h6 className="mb-1">Référence d'Article</h6>
                    <h4 className="mb-0 font-monospace">{referenceArticle}</h4>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>

          {/* Section 2: Informations Article */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-bag me-2"></i>
              Informations Article
            </h5>
            
                  <Row>
              {/* Colonne 1 */}
                    <Col md={6}>
                      <Form.Group className="mb-3">
                  <Form.Label>Nom d'article *</Form.Label>
                        <Form.Control
                          type="text"
                    value={nomArticle}
                    onChange={(e) => setNomArticle(e.target.value)}
                          placeholder="Ex: T-shirt blanc"
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                  <Form.Label>Catégorie d'Article *</Form.Label>
                  <Form.Select
                    value={categorieArticle}
                    onChange={(e) => setCategorieArticle(e.target.value)}
                    required
                    disabled={loading}
                  >
                    <option value="">Sélectionner une catégorie...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.nom || 'Sans nom'} ({product.id})
                      </option>
                    ))}
                  </Form.Select>
                  {loading && (
                    <Form.Text className="text-muted">
                      Chargement des catégories...
                    </Form.Text>
                  )}
                      </Form.Group>
                    
                      <Form.Group className="mb-3">
                        <Form.Label>Image de l'article</Form.Label>
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
                            minHeight: '150px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                    {imagePreview ? (
                            <div className="text-center">
                              <img 
                          src={imagePreview} 
                                alt="Aperçu" 
                                style={{ 
                                  maxWidth: '120px', 
                                  maxHeight: '120px', 
                                  objectFit: 'cover',
                                  borderRadius: '4px',
                                  marginBottom: '10px'
                                }}
                              />
                              <div>
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                            onClick={removeImage}
                                >
                                  <i className="bi bi-trash me-1"></i>
                                  Supprimer
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <i className="bi bi-cloud-upload" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
                              <p className="mt-2 mb-1">Glissez-déposez une image ici</p>
                              <p className="text-muted small">ou</p>
                              <Form.Control
                                type="file"
                                accept="image/*"
                          onChange={handleImageUpload}
                                style={{ display: 'none' }}
                          id="image-upload"
                              />
                              <Form.Label 
                          htmlFor="image-upload"
                                className="btn btn-outline-primary btn-sm"
                                style={{ cursor: 'pointer' }}
                              >
                                Choisir un fichier
                              </Form.Label>
                              <p className="text-muted small mt-2">JPG, JPEG, PNG, WEBP (max 5MB)</p>
                            </div>
                          )}
                        </div>
                      </Form.Group>
                    </Col>
                  
              {/* Colonne 2 */}
              <Col md={6}>
                      <Form.Group className="mb-3">
                  <Form.Label>Petite description</Form.Label>
                        <Form.Control
                    as="textarea"
                    rows={3}
                    value={petiteDescription}
                    onChange={(e) => setPetiteDescription(e.target.value)}
                    placeholder="Description courte de l'article..."
                        />
                      </Form.Group>
                
                      <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                        <Form.Control
                    as="textarea"
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description détaillée de l'article..."
                        />
                      </Form.Group>
                    </Col>
                  </Row>
          </div>

          {/* Section 2.5: Tags du Produit */}
          {categorieArticle && (() => {
            // Normaliser les caractéristiques pour chaque sous-produit
            const normalizedSubProducts = selectedProductSubProducts.map(sp => ({
              ...sp,
              type: Array.isArray(sp.type) ? sp.type.filter(t => t && String(t).trim()) : [],
              anse: Array.isArray(sp.anse) ? sp.anse.filter(a => a && String(a).trim()) : [],
              couleurs: Array.isArray(sp.couleurs) ? sp.couleurs.filter(c => c && String(c).trim()) : [],
              dimensions: Array.isArray(sp.dimensions) ? sp.dimensions.filter(d => d && String(d).trim()) : [],
              materiau: Array.isArray(sp.materiau) ? sp.materiau.filter(m => m && String(m).trim()) : [],
              capacite: Array.isArray(sp.capacite) ? sp.capacite.filter(c => c && String(c).trim()) : [],
              poids: Array.isArray(sp.poids) ? sp.poids.filter(p => p && String(p).trim()) : []
            }));

            // Normaliser les caractéristiques du produit lui-même
            const normalizedProduct = selectedProduct ? {
              type: Array.isArray(selectedProduct.type) ? selectedProduct.type.filter(t => t && String(t).trim()) : [],
              anse: Array.isArray(selectedProduct.anse) ? selectedProduct.anse.filter(a => a && String(a).trim()) : [],
              couleurs: Array.isArray(selectedProduct.couleurs) ? selectedProduct.couleurs.filter(c => c && String(c).trim()) : [],
              dimensions: Array.isArray(selectedProduct.dimensions) ? selectedProduct.dimensions.filter(d => d && String(d).trim()) : [],
              materiau: Array.isArray(selectedProduct.materiau) ? selectedProduct.materiau.filter(m => m && String(m).trim()) : [],
              capacite: Array.isArray(selectedProduct.capacite) ? selectedProduct.capacite.filter(c => c && String(c).trim()) : [],
              poids: Array.isArray(selectedProduct.poids) ? selectedProduct.poids.filter(p => p && String(p).trim()) : []
            } : null;
            
            // Vérifier s'il y a au moins une caractéristique à afficher (soit dans les sous-produits, soit dans le produit)
            const hasCharacteristicsFromSubProducts = normalizedSubProducts.some(sp => 
              sp.type.length > 0 ||
              sp.anse.length > 0 ||
              sp.couleurs.length > 0 ||
              sp.dimensions.length > 0 ||
              sp.materiau.length > 0 ||
              sp.capacite.length > 0 ||
              sp.poids.length > 0
            );

            const hasCharacteristicsFromProduct = normalizedProduct ? (
              normalizedProduct.type.length > 0 ||
              normalizedProduct.anse.length > 0 ||
              normalizedProduct.couleurs.length > 0 ||
              normalizedProduct.dimensions.length > 0 ||
              normalizedProduct.materiau.length > 0 ||
              normalizedProduct.capacite.length > 0 ||
              normalizedProduct.poids.length > 0
            ) : false;

            const hasCharacteristics = hasCharacteristicsFromSubProducts || hasCharacteristicsFromProduct;
            
            console.log('🔍 Vérification des caractéristiques:', {
              nombreSousProduits: normalizedSubProducts.length,
              hasCharacteristicsFromSubProducts,
              hasCharacteristicsFromProduct,
              hasCharacteristics,
              produitSelectionne: selectedProduct?.nom,
              detailsSousProduits: normalizedSubProducts.map(sp => ({
                id: sp.id,
                nom: sp.nom,
                type: sp.type.length,
                anse: sp.anse.length,
                couleurs: sp.couleurs.length,
                dimensions: sp.dimensions.length,
                materiau: sp.materiau.length,
                capacite: sp.capacite.length,
                poids: sp.poids.length
              })),
              detailsProduit: normalizedProduct ? {
                type: normalizedProduct.type.length,
                anse: normalizedProduct.anse.length,
                couleurs: normalizedProduct.couleurs.length,
                dimensions: normalizedProduct.dimensions.length,
                materiau: normalizedProduct.materiau.length,
                capacite: normalizedProduct.capacite.length,
                poids: normalizedProduct.poids.length
              } : null
            });
            
            if (!hasCharacteristics) {
              console.log('⚠️ Aucune caractéristique trouvée pour les sous-produits ni pour le produit');
              return null;
            }
            
            return (
          <div className="mb-4">
            <h5 className="text-primary mb-3">
                <i className="bi bi-tags me-2"></i>
                Caractéristiques du Produit
            </h5>
              <Card className="bg-light" style={{ padding: '1rem' }}>
                <Card.Body style={{ padding: '1rem' }}>
                  <div className="d-flex flex-column gap-3">
                    {/* Collecter toutes les caractéristiques uniques de tous les sous-produits OU du produit */}
                    {(() => {
                      const allCharacteristics = {
                        type: new Set<string>(),
                        anse: new Set<string>(),
                        couleurs: new Set<string>(),
                        dimensions: new Set<string>(),
                        materiau: new Set<string>(),
                        capacite: new Set<string>(),
                        poids: new Set<string>()
                      };

                      // Si des sous-produits existent, utiliser leurs caractéristiques
                      if (normalizedSubProducts.length > 0) {
                        normalizedSubProducts.forEach((subProduct, index) => {
                          console.log(`🔍 Sous-produit ${index + 1}:`, {
                            id: subProduct.id,
                            nom: subProduct.nom,
                            type: subProduct.type,
                            anse: subProduct.anse,
                            couleurs: subProduct.couleurs,
                            dimensions: subProduct.dimensions,
                            materiau: subProduct.materiau,
                            capacite: subProduct.capacite,
                            poids: subProduct.poids
                          });
                          
                          // Type - déjà normalisé
                          subProduct.type.forEach(t => allCharacteristics.type.add(t));
                          
                          // Anse - déjà normalisé
                          subProduct.anse.forEach(a => allCharacteristics.anse.add(a));
                          
                          // Couleurs - déjà normalisé
                          subProduct.couleurs.forEach(c => allCharacteristics.couleurs.add(c));
                          
                          // Dimensions - déjà normalisé
                          subProduct.dimensions.forEach(d => allCharacteristics.dimensions.add(d));
                          
                          // Matériau - déjà normalisé
                          subProduct.materiau.forEach(m => allCharacteristics.materiau.add(m));
                          
                          // Capacité - déjà normalisé
                          subProduct.capacite.forEach(c => allCharacteristics.capacite.add(c));
                          
                          // Poids - déjà normalisé
                          subProduct.poids.forEach(p => allCharacteristics.poids.add(p));
                        });
                      } else if (normalizedProduct) {
                        // Sinon, utiliser les caractéristiques du produit lui-même
                        console.log('📦 Utilisation des caractéristiques du produit:', {
                          nom: selectedProduct?.nom,
                          type: normalizedProduct.type,
                          anse: normalizedProduct.anse,
                          couleurs: normalizedProduct.couleurs,
                          dimensions: normalizedProduct.dimensions,
                          materiau: normalizedProduct.materiau,
                          capacite: normalizedProduct.capacite,
                          poids: normalizedProduct.poids
                        });
                        
                        normalizedProduct.type.forEach(t => allCharacteristics.type.add(t));
                        normalizedProduct.anse.forEach(a => allCharacteristics.anse.add(a));
                        normalizedProduct.couleurs.forEach(c => allCharacteristics.couleurs.add(c));
                        normalizedProduct.dimensions.forEach(d => allCharacteristics.dimensions.add(d));
                        normalizedProduct.materiau.forEach(m => allCharacteristics.materiau.add(m));
                        normalizedProduct.capacite.forEach(c => allCharacteristics.capacite.add(c));
                        normalizedProduct.poids.forEach(p => allCharacteristics.poids.add(p));
                      }
                      
                      console.log('📊 Caractéristiques collectées:', {
                        type: Array.from(allCharacteristics.type),
                        anse: Array.from(allCharacteristics.anse),
                        couleurs: Array.from(allCharacteristics.couleurs),
                        dimensions: Array.from(allCharacteristics.dimensions),
                        materiau: Array.from(allCharacteristics.materiau),
                        capacite: Array.from(allCharacteristics.capacite),
                        poids: Array.from(allCharacteristics.poids)
                      });

                      const groups: React.ReactElement[] = [];

                      // Tags Type (bleu)
                      if (allCharacteristics.type.size > 0) {
                        groups.push(
                          <div key="type-group" className="d-flex align-items-center gap-2 flex-wrap">
                            <strong className="text-muted" style={{ fontSize: '0.9rem', minWidth: '80px' }}>Type:</strong>
                            <div className="d-flex flex-wrap gap-2">
                              {Array.from(allCharacteristics.type).map((type, index) => {
                                const isSelected = selectedTags.type.has(type);
                                return (
                                  <Badge 
                                    key={`type-${index}`} 
                                    bg={isSelected ? "primary" : "secondary"}
                                    style={{ 
                                      fontSize: '0.85rem', 
                                      padding: '0.5rem 0.75rem',
                                      cursor: 'pointer',
                                      opacity: isSelected ? 1 : 0.6,
                                      border: isSelected ? '2px solid #0d6efd' : '2px solid transparent'
                                    }}
                                    onClick={() => toggleTag('type', type)}
                                    title={isSelected ? 'Cliquer pour désélectionner' : 'Cliquer pour sélectionner'}
                                  >
                                    <i className="bi bi-box me-1"></i>
                                    {type}
                                    {isSelected && <i className="bi bi-check-circle ms-1"></i>}
                                  </Badge>
                                );
                              })}
          </div>
                          </div>
                        );
                      }

                      // Tags Anse (info/cyan)
                      if (allCharacteristics.anse.size > 0) {
                        groups.push(
                          <div key="anse-group" className="d-flex align-items-center gap-2 flex-wrap">
                            <strong className="text-muted" style={{ fontSize: '0.9rem', minWidth: '80px' }}>Anse:</strong>
                            <div className="d-flex flex-wrap gap-2">
                              {Array.from(allCharacteristics.anse).map((anse, index) => {
                                const isSelected = selectedTags.anse.has(anse);
                                return (
                                  <Badge 
                                    key={`anse-${index}`} 
                                    bg={isSelected ? "info" : "secondary"}
                                    style={{ 
                                      fontSize: '0.85rem', 
                                      padding: '0.5rem 0.75rem',
                                      cursor: 'pointer',
                                      opacity: isSelected ? 1 : 0.6,
                                      border: isSelected ? '2px solid #0dcaf0' : '2px solid transparent'
                                    }}
                                    onClick={() => toggleTag('anse', anse)}
                                    title={isSelected ? 'Cliquer pour désélectionner' : 'Cliquer pour sélectionner'}
                                  >
                                    <i className="bi bi-handle me-1"></i>
                                    {anse}
                                    {isSelected && <i className="bi bi-check-circle ms-1"></i>}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Tags Couleurs (warning/jaune)
                      if (allCharacteristics.couleurs.size > 0) {
                        groups.push(
                          <div key="couleurs-group" className="d-flex align-items-center gap-2 flex-wrap">
                            <strong className="text-muted" style={{ fontSize: '0.9rem', minWidth: '80px' }}>Couleur:</strong>
                            <div className="d-flex flex-wrap gap-2">
                              {Array.from(allCharacteristics.couleurs).map((couleur, index) => {
                                const isSelected = selectedTags.couleurs.has(couleur);
                                return (
                                  <Badge 
                                    key={`couleur-${index}`} 
                                    bg={isSelected ? "warning" : "secondary"}
                                    text={isSelected ? "dark" : undefined}
                                    style={{ 
                                      fontSize: '0.85rem', 
                                      padding: '0.5rem 0.75rem',
                                      cursor: 'pointer',
                                      opacity: isSelected ? 1 : 0.6,
                                      border: isSelected ? '2px solid #ffc107' : '2px solid transparent'
                                    }}
                                    onClick={() => toggleTag('couleurs', couleur)}
                                    title={isSelected ? 'Cliquer pour désélectionner' : 'Cliquer pour sélectionner'}
                                  >
                                    <i className="bi bi-palette me-1"></i>
                                    {couleur}
                                    {isSelected && <i className="bi bi-check-circle ms-1"></i>}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Tags Dimensions (success/vert) - Taille
                      if (allCharacteristics.dimensions.size > 0) {
                        groups.push(
                          <div key="dimensions-group" className="d-flex align-items-center gap-2 flex-wrap">
                            <strong className="text-muted" style={{ fontSize: '0.9rem', minWidth: '80px' }}>Taille:</strong>
                            <div className="d-flex flex-wrap gap-2">
                              {Array.from(allCharacteristics.dimensions).map((dim, index) => {
                                const isSelected = selectedTags.dimensions.has(dim);
                                return (
                                  <Badge 
                                    key={`dim-${index}`} 
                                    bg={isSelected ? "success" : "secondary"}
                                    style={{ 
                                      fontSize: '0.85rem', 
                                      padding: '0.5rem 0.75rem',
                                      cursor: 'pointer',
                                      opacity: isSelected ? 1 : 0.6,
                                      border: isSelected ? '2px solid #198754' : '2px solid transparent'
                                    }}
                                    onClick={() => toggleTag('dimensions', dim)}
                                    title={isSelected ? 'Cliquer pour désélectionner' : 'Cliquer pour sélectionner'}
                                  >
                                    <i className="bi bi-rulers me-1"></i>
                                    {dim}
                                    {isSelected && <i className="bi bi-check-circle ms-1"></i>}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Tags Matériau (dark/gris foncé)
                      if (allCharacteristics.materiau.size > 0) {
                        groups.push(
                          <div key="materiau-group" className="d-flex align-items-center gap-2 flex-wrap">
                            <strong className="text-muted" style={{ fontSize: '0.9rem', minWidth: '80px' }}>Matériau:</strong>
                            <div className="d-flex flex-wrap gap-2">
                              {Array.from(allCharacteristics.materiau).map((materiau, index) => {
                                const isSelected = selectedTags.materiau.has(materiau);
                                return (
                                  <Badge 
                                    key={`materiau-${index}`} 
                                    bg={isSelected ? "dark" : "secondary"}
                                    style={{ 
                                      fontSize: '0.85rem', 
                                      padding: '0.5rem 0.75rem',
                                      cursor: 'pointer',
                                      opacity: isSelected ? 1 : 0.6,
                                      border: isSelected ? '2px solid #212529' : '2px solid transparent'
                                    }}
                                    onClick={() => toggleTag('materiau', materiau)}
                                    title={isSelected ? 'Cliquer pour désélectionner' : 'Cliquer pour sélectionner'}
                                  >
                                    <i className="bi bi-gear me-1"></i>
                                    {materiau}
                                    {isSelected && <i className="bi bi-check-circle ms-1"></i>}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Tags Capacité (secondary/gris)
                      if (allCharacteristics.capacite.size > 0) {
                        groups.push(
                          <div key="capacite-group" className="d-flex align-items-center gap-2 flex-wrap">
                            <strong className="text-muted" style={{ fontSize: '0.9rem', minWidth: '80px' }}>Capacité:</strong>
                            <div className="d-flex flex-wrap gap-2">
                              {Array.from(allCharacteristics.capacite).map((cap, index) => {
                                const isSelected = selectedTags.capacite.has(cap);
                                return (
                                  <Badge 
                                    key={`cap-${index}`} 
                                    bg={isSelected ? "secondary" : "light"}
                                    text={isSelected ? "light" : "dark"}
                                    style={{ 
                                      fontSize: '0.85rem', 
                                      padding: '0.5rem 0.75rem',
                                      cursor: 'pointer',
                                      opacity: isSelected ? 1 : 0.6,
                                      border: isSelected ? '2px solid #6c757d' : '2px solid transparent'
                                    }}
                                    onClick={() => toggleTag('capacite', cap)}
                                    title={isSelected ? 'Cliquer pour désélectionner' : 'Cliquer pour sélectionner'}
                                  >
                                    <i className="bi bi-cup me-1"></i>
                                    {cap}
                                    {isSelected && <i className="bi bi-check-circle ms-1"></i>}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Tags Poids (light/gris clair)
                      if (allCharacteristics.poids.size > 0) {
                        groups.push(
                          <div key="poids-group" className="d-flex align-items-center gap-2 flex-wrap">
                            <strong className="text-muted" style={{ fontSize: '0.9rem', minWidth: '80px' }}>Poids:</strong>
                            <div className="d-flex flex-wrap gap-2">
                              {Array.from(allCharacteristics.poids).map((poids, index) => {
                                const isSelected = selectedTags.poids.has(poids);
                                return (
                                  <Badge 
                                    key={`poids-${index}`} 
                                    bg={isSelected ? "light" : "secondary"}
                                    text={isSelected ? "dark" : undefined}
                                    style={{ 
                                      fontSize: '0.85rem', 
                                      padding: '0.5rem 0.75rem',
                                      cursor: 'pointer',
                                      opacity: isSelected ? 1 : 0.6,
                                      border: isSelected ? '2px solid #adb5bd' : '2px solid transparent'
                                    }}
                                    onClick={() => toggleTag('poids', poids)}
                                    title={isSelected ? 'Cliquer pour désélectionner' : 'Cliquer pour sélectionner'}
                                  >
                                    <i className="bi bi-speedometer2 me-1"></i>
                                    {poids}
                                    {isSelected && <i className="bi bi-check-circle ms-1"></i>}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      return groups.length > 0 ? groups : (
                        <span className="text-muted">Aucune caractéristique disponible</span>
                      );
                    })()}
                  </div>
                </Card.Body>
              </Card>
            </div>
            );
          })()}

          {/* Section 2.6: Variations */}
          {categorieArticle && (() => {
            const hasSelectedTags = 
              selectedTags.type.size > 0 ||
              selectedTags.anse.size > 0 ||
              selectedTags.couleurs.size > 0 ||
              selectedTags.dimensions.size > 0 ||
              selectedTags.materiau.size > 0 ||
              selectedTags.capacite.size > 0 ||
              selectedTags.poids.size > 0;

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
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <p className="text-muted mb-0">
                        Créez des variations à partir des caractéristiques sélectionnées
                      </p>
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={handleAddVariation}
                        disabled={!hasSelectedTags}
                      >
                        <i className="bi bi-plus-circle me-2"></i>
                        Générer toutes les variations
                      </Button>
                    </div>

                    {variations.length > 0 ? (
                      <Table hover className="mb-0" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                          <col style={{ width: '63%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '10%' }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th style={{ width: '63%' }}>Caractéristiques</th>
                            <th style={{ width: '15%' }}>Prix Unitaire</th>
                            <th style={{ width: '12%' }}>Quantité</th>
                            <th style={{ width: '10%' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variations.map((variation) => (
                            <tr key={variation.id}>
                              <td style={{ width: '63%', wordWrap: 'break-word' }}>
                                <div className="d-flex flex-wrap gap-1">
                                  {Object.entries(variation.characteristics).map(([key, value]) => {
                                    if (!value) return null;
                                    const labels: { [key: string]: string } = {
                                      couleurs: 'Couleur',
                                      dimensions: 'Taille',
                                      materiau: 'Matériau',
                                      type: 'Type',
                                      anse: 'Anse',
                                      capacite: 'Capacité',
                                      poids: 'Poids'
                                    };
                                    const colors: { [key: string]: string } = {
                                      couleurs: 'warning',
                                      dimensions: 'success',
                                      materiau: 'dark',
                                      type: 'primary',
                                      anse: 'info',
                                      capacite: 'secondary',
                                      poids: 'light'
                                    };
                                    return (
                                      <Badge 
                                        key={key} 
                                        bg={colors[key] as any}
                                        text={key === 'poids' ? 'dark' : undefined}
                                      >
                                        {labels[key] || key}: {value}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </td>
                              <td style={{ width: '15%' }}>
                                <Form.Control
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={variation.prixUnitaire || prixUnitaire}
                                  onChange={(e) => {
                                    const updated = {
                                      ...variation,
                                      prixUnitaire: parseFloat(e.target.value) || prixUnitaire
                                    };
                                    handleUpdateVariation(updated);
                                  }}
                                  style={{ width: '100%' }}
                                />
                              </td>
                              <td style={{ width: '12%' }}>
                                <Form.Control
                                  type="number"
                                  min="1"
                                  value={variation.quantite || 1}
                                  onChange={(e) => {
                                    const updated = {
                                      ...variation,
                                      quantite: parseInt(e.target.value) || 1
                                    };
                                    handleUpdateVariation(updated);
                                  }}
                                  style={{ width: '100%' }}
                                />
                              </td>
                              <td style={{ width: '10%', textAlign: 'center' }}>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDeleteVariation(variation.id)}
                                  title="Supprimer"
                                  style={{ padding: '0.25rem 0.4rem' }}
                                >
                                  <i className="bi bi-trash"></i>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
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

          {/* Section 3: Prix & Quantité */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-currency-exchange me-2"></i>
              Prix & Quantité
            </h5>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                        <Form.Label>Prix Unitaire (DH) *</Form.Label>
                  <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                    value={prixUnitaire}
                    onChange={(e) => setPrixUnitaire(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                        <Form.Label>Quantité *</Form.Label>
                  <Form.Control
                          type="number"
                          min="1"
                    value={quantite}
                    onChange={(e) => setQuantite(parseInt(e.target.value) || 1)}
                          placeholder="1"
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Prix à Payer (DH)</Form.Label>
                  <Form.Control
                          type="number"
                    value={prixAPayer}
                    readOnly
                    className="bg-light"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <i className="bi bi-x-circle me-2"></i>
          Annuler
        </Button>
        <Button 
          variant="success" 
          onClick={handleSaveArticle}
          disabled={!nomArticle.trim() || !categorieArticle || prixUnitaire <= 0 || quantite <= 0}
        >
          <i className="bi bi-check-circle me-2"></i>
          {isEditMode ? 'Modifier l\'Article' : 'Enregistrer l\'Article'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddArticleModal;
