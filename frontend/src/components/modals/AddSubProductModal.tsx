import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { Product, SubProduct } from '../../types';
import { SubProductService, ProductService, ImageService } from '../../services/firebaseService';
import { Timestamp } from 'firebase/firestore';

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
  // États pour les données du sous-produit
  const [newSubProduct, setNewSubProduct] = useState({
    nom: '',
    description: '',
    prix: 0,
    quantite: 0,
    image: '',
    imageFile: null as File | null,
    imageFiles: [] as File[],
    categorie: ''
  });

  // États pour la gestion des données
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  // État pour les caractéristiques sélectionnées du sous-produit
  const [selectedCharacteristics, setSelectedCharacteristics] = useState({
    type: [] as string[],
    anse: [] as string[],
    couleurs: [] as string[],
    dimensions: [] as string[],
    materiau: [] as string[],
    capacite: [] as string[],
    poids: [] as string[]
  });

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
    if (isEditMode && initialSubProduct) {
      console.log('🔧 Mode édition activé pour le sous-produit:', initialSubProduct);
      
      setNewSubProduct({
        nom: initialSubProduct.nom || '',
        description: initialSubProduct.description || '',
        prix: initialSubProduct.prix || 0,
        quantite: initialSubProduct.stock || 0,
        image: initialSubProduct.image || '',
        imageFile: null,
        imageFiles: [],
        categorie: initialSubProduct.productId || ''
      });

      // Initialiser les images prévisualisées
      const existingImages = initialSubProduct.images || [];
      if (existingImages.length > 0) {
        setPreviewImages(existingImages);
      } else if (initialSubProduct.image && initialSubProduct.image !== '/mug.webp') {
        setPreviewImages([initialSubProduct.image]);
      } else {
        setPreviewImages([]);
      }

      // Initialiser les caractéristiques
      const characteristics = {
        type: Array.isArray(initialSubProduct.type) ? initialSubProduct.type : [],
        anse: Array.isArray(initialSubProduct.anse) ? initialSubProduct.anse : [],
        couleurs: Array.isArray(initialSubProduct.couleurs) ? initialSubProduct.couleurs : [],
        dimensions: Array.isArray(initialSubProduct.dimensions) ? initialSubProduct.dimensions : [],
        materiau: Array.isArray(initialSubProduct.materiau) ? initialSubProduct.materiau : [],
        capacite: Array.isArray(initialSubProduct.capacite) ? initialSubProduct.capacite : [],
        poids: Array.isArray(initialSubProduct.poids) ? initialSubProduct.poids : []
      };
      
      console.log('🏷️ Caractéristiques initialisées:', characteristics);
      setSelectedCharacteristics(characteristics);

      // Trouver et définir le produit parent pour afficher ses caractéristiques
      const parentProduct = products.find(p => p.id === initialSubProduct.productId);
      if (parentProduct) {
        setSelectedProduct(parentProduct);
      }
    }
  }, [isEditMode, initialSubProduct, products]);

  // Calculer le prix total automatiquement
  const prixTotal = newSubProduct.prix * newSubProduct.quantite;

  // Gérer le changement de catégorie
  const handleCategoryChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
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
        poids: []
      });
    }
  };

  // Gérer la sélection/désélection d'un tag
  const handleTagToggle = (category: keyof typeof selectedCharacteristics, tagValue: string) => {
    setSelectedCharacteristics(prev => {
      const currentTags = prev[category];
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

  // Gérer l'upload d'image
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      // Vérifier chaque fichier
      for (const file of files) {
        // Vérifier le type de fichier
        if (!file.type.startsWith('image/')) {
          onAlert('danger', 'Veuillez sélectionner uniquement des fichiers image valides');
          return;
        }

        // Vérifier la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          onAlert('danger', 'Un ou plusieurs fichiers sont trop volumineux. Taille maximale: 5MB par fichier');
          return;
        }
      }

      // Ajouter les nouveaux fichiers aux fichiers existants
      setNewSubProduct(prev => ({
        ...prev,
        imageFiles: [...prev.imageFiles, ...files]
      }));

      // Créer les URLs de prévisualisation
      const newPreviewUrls = files.map(file => URL.createObjectURL(file));
      setPreviewImages(prev => [...prev, ...newPreviewUrls]);
    }
  }, [onAlert]);

  // Supprimer une image de la liste
  const removeImage = useCallback((index: number) => {
    setNewSubProduct(prev => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, i) => i !== index)
    }));
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddSubProduct = useCallback(async () => {
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
      // Gestion des images multiples
      let imageUrls: string[] = [];
      let mainImageUrl = '/mug.webp';

      if (newSubProduct.imageFiles.length > 0) {
        // Uploader les nouvelles images vers Firebase Storage
        console.log(`📤 Upload de ${newSubProduct.imageFiles.length} images vers Firebase Storage...`);
        imageUrls = await ImageService.uploadSubProductImages(
          selectedProduct.id, 
          isEditMode && initialSubProduct ? initialSubProduct.id : 'temp', 
          newSubProduct.imageFiles
        );
        
        // La première image devient l'image principale
        if (imageUrls.length > 0) {
          mainImageUrl = imageUrls[0];
        }
      } else if (isEditMode && initialSubProduct) {
        // En mode édition, conserver les images existantes
        imageUrls = initialSubProduct.images || [];
        if (imageUrls.length > 0) {
          mainImageUrl = imageUrls[0];
        } else if (initialSubProduct.image && initialSubProduct.image !== '/mug.webp') {
          mainImageUrl = initialSubProduct.image;
          imageUrls = [initialSubProduct.image];
        }
      }

      // Créer le sous-produit avec les caractéristiques sélectionnées
      const subProductData = {
        nom: newSubProduct.nom.trim(),
        description: newSubProduct.description.trim(),
        prix: newSubProduct.prix,
        stock: newSubProduct.quantite,
        image: mainImageUrl, // Image principale
        images: imageUrls, // Toutes les images
        productId: selectedProduct.id,
        // Ajouter les caractéristiques sélectionnées
        type: selectedCharacteristics.type,
        anse: selectedCharacteristics.anse,
        couleurs: selectedCharacteristics.couleurs,
        dimensions: selectedCharacteristics.dimensions,
        materiau: selectedCharacteristics.materiau,
        capacite: selectedCharacteristics.capacite,
        poids: selectedCharacteristics.poids,
        dateCreation: isEditMode && initialSubProduct ? 
          (initialSubProduct.dateCreation instanceof Date ? 
            initialSubProduct.dateCreation : 
            (initialSubProduct.dateCreation as any)?.toDate ? 
              (initialSubProduct.dateCreation as any).toDate() : 
              new Date()) : 
          new Date(),
        dateModification: new Date()
      };

      if (isEditMode && initialSubProduct) {
        // Mode édition - mettre à jour le sous-produit existant
        await SubProductService.updateSubProduct(initialSubProduct.productId, initialSubProduct.id, subProductData);
        onAlert('success', 'Sous-produit mis à jour avec succès');
      } else {
        // Mode création - créer un nouveau sous-produit
        await SubProductService.createSubProduct(subProductData);
        onAlert('success', 'Sous-produit ajouté avec succès');
      }
      
      // Réinitialiser le formulaire
      setNewSubProduct({
        nom: '',
        description: '',
        prix: 0,
        quantite: 0,
        image: '',
        imageFile: null,
        imageFiles: [],
        categorie: ''
      });
      setPreviewImages([]);
      setSelectedProduct(null);
      setSelectedCharacteristics({
        type: [],
        anse: [],
        couleurs: [],
        dimensions: [],
        materiau: [],
        capacite: [],
        poids: []
      });
      
      onHide();
      onSubProductAdded();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du sous-produit:', error);
      onAlert('danger', 'Erreur lors de la mise à jour du sous-produit');
    }
  }, [
    newSubProduct, 
    selectedProduct, 
    onAlert, 
    onHide, 
    onSubProductAdded, 
    initialSubProduct, 
    isEditMode, 
    selectedCharacteristics.type, 
    selectedCharacteristics.anse, 
    selectedCharacteristics.couleurs, 
    selectedCharacteristics.dimensions, 
    selectedCharacteristics.materiau, 
    selectedCharacteristics.capacite, 
    selectedCharacteristics.poids
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
                  <div className="border rounded p-3">
                    {/* Zone d'upload */}
                    <div className="text-center mb-3">
                      <Form.Control
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="w-auto"
                      />
                      <small className="text-muted d-block mt-1">
                        Vous pouvez sélectionner plusieurs images (JPG, PNG, WEBP - max 5MB chacune)
                      </small>
                    </div>

                    {/* Affichage des images */}
                    {previewImages.length > 0 ? (
                      <div className="row g-2">
                        {previewImages.map((imageUrl, index) => (
                          <div key={index} className="col-6 col-md-4">
                            <div className="position-relative">
                              <img
                                src={imageUrl}
                                alt={`Aperçu ${index + 1}`}
                                className="img-fluid rounded border"
                                style={{ 
                                  width: '100%', 
                                  height: '100px', 
                                  objectFit: 'cover' 
                                }}
                              />
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="position-absolute top-0 end-0 m-1"
                                style={{ 
                                  width: '24px', 
                                  height: '24px', 
                                  padding: '0',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onClick={() => removeImage(index)}
                              >
                                <i className="bi bi-x" style={{ fontSize: '12px' }}></i>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted py-3">
                        <i className="bi bi-image display-6 mb-2"></i>
                        <p className="mb-0">Aucune image sélectionnée</p>
                        <small>Les images seront stockées dans Firebase Storage</small>
                      </div>
                    )}
                  </div>
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
                
                <Row>
                  {/* Type */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="d-flex align-items-center justify-content-between">
                        <span>Type</span>
                        <button
                          type="button"
                          className="add-feature-btn"
                          onClick={() => {
                            // Pré-remplir avec les types existants du produit
                            const existingTypes = selectedProduct.type || [];
                            if (existingTypes.length > 0) {
                              // Ajouter automatiquement le premier type disponible
                              const firstType = existingTypes[0];
                              // Ici on pourrait ajouter une logique pour ajouter des tags
                              console.log('Ajouter un type:', firstType);
                            }
                          }}
                          title="Ajouter un type"
                        >
                        </button>
                      </Form.Label>
                      <div className="tags-container">
                        {selectedProduct.type && selectedProduct.type.map((type, index) => {
                          const isSelected = selectedCharacteristics.type.includes(type);
                          return (
                            <span 
                              key={index} 
                              className={`tag-badge ${isSelected ? 'bg-primary' : 'bg-outline-primary'}`}
                              onClick={() => handleTagToggle('type', type)}
                              style={{ cursor: 'pointer' }}
                            >
                              {type}
                              {isSelected && <i className="bi bi-check ms-1"></i>}
                            </span>
                          );
                        })}
                        {(!selectedProduct.type || selectedProduct.type.length === 0) && (
                          <span className="text-muted">Aucun type défini</span>
                        )}
                      </div>
                    </Form.Group>
                  </Col>

                  {/* Anse */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="d-flex align-items-center justify-content-between">
                        <span>Anse</span>
                        <button
                          type="button"
                          className="add-feature-btn"
                          onClick={() => {
                            const existingAnses = selectedProduct.anse || [];
                            if (existingAnses.length > 0) {
                              const firstAnse = existingAnses[0];
                              console.log('Ajouter une anse:', firstAnse);
                            }
                          }}
                          title="Ajouter une anse"
                        >
                        </button>
                      </Form.Label>
                      <div className="tags-container">
                        {selectedProduct.anse && selectedProduct.anse.map((anse, index) => {
                          const isSelected = selectedCharacteristics.anse.includes(anse);
                          return (
                            <span 
                              key={index} 
                              className={`tag-badge ${isSelected ? 'bg-info' : 'bg-outline-info'}`}
                              onClick={() => handleTagToggle('anse', anse)}
                              style={{ cursor: 'pointer' }}
                            >
                              {anse}
                              {isSelected && <i className="bi bi-check ms-1"></i>}
                            </span>
                          );
                        })}
                        {(!selectedProduct.anse || selectedProduct.anse.length === 0) && (
                          <span className="text-muted">Aucune anse définie</span>
                        )}
                      </div>
                    </Form.Group>
                  </Col>

                  {/* Couleurs */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="d-flex align-items-center justify-content-between">
                        <span>Couleurs</span>
                        <button
                          type="button"
                          className="add-feature-btn"
                          onClick={() => {
                            const existingCouleurs = selectedProduct.couleurs || [];
                            if (existingCouleurs.length > 0) {
                              const firstCouleur = existingCouleurs[0];
                              console.log('Ajouter une couleur:', firstCouleur);
                            }
                          }}
                          title="Ajouter une couleur"
                        >
                        </button>
                      </Form.Label>
                      <div className="tags-container">
                        {selectedProduct.couleurs && selectedProduct.couleurs.map((couleur, index) => {
                          const isSelected = selectedCharacteristics.couleurs.includes(couleur);
                          return (
                            <span 
                              key={index} 
                              className={`tag-badge ${isSelected ? 'bg-warning' : 'bg-outline-warning'}`}
                              onClick={() => handleTagToggle('couleurs', couleur)}
                              style={{ cursor: 'pointer' }}
                            >
                              {couleur}
                              {isSelected && <i className="bi bi-check ms-1"></i>}
                            </span>
                          );
                        })}
                        {(!selectedProduct.couleurs || selectedProduct.couleurs.length === 0) && (
                          <span className="text-muted">Aucune couleur définie</span>
                        )}
                      </div>
                    </Form.Group>
                  </Col>

                  {/* Dimensions */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="d-flex align-items-center justify-content-between">
                        <span>Dimensions</span>
                        <button
                          type="button"
                          className="add-feature-btn"
                          onClick={() => {
                            const existingDimensions = selectedProduct.dimensions || [];
                            if (existingDimensions.length > 0) {
                              const firstDimension = existingDimensions[0];
                              console.log('Ajouter une dimension:', firstDimension);
                            }
                          }}
                          title="Ajouter une dimension"
                        >
                        </button>
                      </Form.Label>
                      <div className="tags-container">
                        {selectedProduct.dimensions && selectedProduct.dimensions.map((dim, index) => {
                          const isSelected = selectedCharacteristics.dimensions.includes(dim);
                          return (
                            <span 
                              key={index} 
                              className={`tag-badge ${isSelected ? 'bg-success' : 'bg-outline-success'}`}
                              onClick={() => handleTagToggle('dimensions', dim)}
                              style={{ cursor: 'pointer' }}
                            >
                              {dim}
                              {isSelected && <i className="bi bi-check ms-1"></i>}
                            </span>
                          );
                        })}
                        {(!selectedProduct.dimensions || selectedProduct.dimensions.length === 0) && (
                          <span className="text-muted">Aucune dimension définie</span>
                        )}
                      </div>
                    </Form.Group>
                  </Col>

                  {/* Matériaux */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="d-flex align-items-center justify-content-between">
                        <span>Matériaux</span>
                        <button
                          type="button"
                          className="add-feature-btn"
                          onClick={() => {
                            const existingMateriaux = selectedProduct.materiau || [];
                            if (existingMateriaux.length > 0) {
                              const firstMateriau = existingMateriaux[0];
                              console.log('Ajouter un matériau:', firstMateriau);
                            }
                          }}
                          title="Ajouter un matériau"
                        >
                        </button>
                      </Form.Label>
                      <div className="tags-container">
                        {selectedProduct.materiau && selectedProduct.materiau.map((materiau, index) => {
                          const isSelected = selectedCharacteristics.materiau.includes(materiau);
                          return (
                            <span 
                              key={index} 
                              className={`tag-badge ${isSelected ? 'bg-dark' : 'bg-outline-dark'}`}
                              onClick={() => handleTagToggle('materiau', materiau)}
                              style={{ cursor: 'pointer' }}
                            >
                              {materiau}
                              {isSelected && <i className="bi bi-check ms-1"></i>}
                            </span>
                          );
                        })}
                        {(!selectedProduct.materiau || selectedProduct.materiau.length === 0) && (
                          <span className="text-muted">Aucun matériau défini</span>
                        )}
                      </div>
                    </Form.Group>
                  </Col>

                  {/* Capacité */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="d-flex align-items-center justify-content-between">
                        <span>Capacité</span>
                        <button
                          type="button"
                          className="add-feature-btn"
                          onClick={() => {
                            const existingCapacites = selectedProduct.capacite || [];
                            if (existingCapacites.length > 0) {
                              const firstCapacite = existingCapacites[0];
                              console.log('Ajouter une capacité:', firstCapacite);
                            }
                          }}
                          title="Ajouter une capacité"
                        >
                        </button>
                      </Form.Label>
                      <div className="tags-container">
                        {selectedProduct.capacite && selectedProduct.capacite.map((cap, index) => {
                          const isSelected = selectedCharacteristics.capacite.includes(cap);
                          return (
                            <span 
                              key={index} 
                              className={`tag-badge ${isSelected ? 'bg-secondary' : 'bg-outline-secondary'}`}
                              onClick={() => handleTagToggle('capacite', cap)}
                              style={{ cursor: 'pointer' }}
                            >
                              {cap}
                              {isSelected && <i className="bi bi-check ms-1"></i>}
                            </span>
                          );
                        })}
                        {(!selectedProduct.capacite || selectedProduct.capacite.length === 0) && (
                          <span className="text-muted">Aucune capacité définie</span>
                        )}
                      </div>
                    </Form.Group>
                  </Col>

                  {/* Poids */}
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label className="d-flex align-items-center justify-content-between">
                        <span>Poids</span>
                        <button
                          type="button"
                          className="add-feature-btn"
                          onClick={() => {
                            const existingPoids = selectedProduct.poids || [];
                            if (existingPoids.length > 0) {
                              const firstPoids = existingPoids[0];
                              console.log('Ajouter un poids:', firstPoids);
                            }
                          }}
                          title="Ajouter un poids"
                        >
                        </button>
                      </Form.Label>
                      <div className="tags-container">
                        {selectedProduct.poids && selectedProduct.poids.map((poids, index) => {
                          const isSelected = selectedCharacteristics.poids.includes(poids);
                          return (
                            <span 
                              key={index} 
                              className={`tag-badge ${isSelected ? 'bg-light text-dark' : 'bg-outline-light text-dark'}`}
                              onClick={() => handleTagToggle('poids', poids)}
                              style={{ cursor: 'pointer' }}
                            >
                              {poids}
                              {isSelected && <i className="bi bi-check ms-1"></i>}
                            </span>
                          );
                        })}
                        {(!selectedProduct.poids || selectedProduct.poids.length === 0) && (
                          <span className="text-muted">Aucun poids défini</span>
                        )}
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            ) : (
              <div className="p-3 bg-light rounded text-center">
                <i className="bi bi-info-circle me-2"></i>
                Sélectionnez une catégorie pour voir ses caractéristiques
              </div>
            )}
          </div>

          {/* Section 3: Prix */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-currency-exchange me-2"></i>
              Section 3: Prix et Quantité
            </h5>
            
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
