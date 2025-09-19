import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { Product } from '../../types';
import { ProductService } from '../../services/firebaseService';
import AddTagModal from './AddTagModal';
import { Timestamp } from 'firebase/firestore';

interface AddProductModalProps {
  show: boolean;
  onHide: () => void;
  onProductAdded: () => void;
  onAlert: (type: 'success' | 'danger', message: string) => void;
  initialProduct?: Product;
  isEditMode?: boolean;
}

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
    image: '',
    imageFile: null as File | null,
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
    prix: 0,
    stock: 0
  });

  // Initialiser les valeurs en mode édition
  useEffect(() => {
    if (isEditMode && initialProduct) {
      console.log('🔧 Mode édition activé pour le produit:', initialProduct);
      console.log('📊 Données du produit:', {
        type: initialProduct.type,
        anse: initialProduct.anse,
        couleurs: initialProduct.couleurs,
        dimensions: initialProduct.dimensions,
        materiau: initialProduct.materiau,
        capacite: initialProduct.capacite,
        poids: initialProduct.poids
      });
      
      setNewProduct({
        nom: initialProduct.nom || '',
        categorie: initialProduct.categorie || '',
        image: initialProduct.image || '',
        imageFile: null,
        description: initialProduct.description || '',
        fournisseur: {
          nom: initialProduct.fournisseur?.nom || '',
          ville: initialProduct.fournisseur?.ville || ''
        },
        type: Array.isArray(initialProduct.type) ? initialProduct.type.join(', ') : '',
        anse: Array.isArray(initialProduct.anse) ? initialProduct.anse.join(', ') : '',
        couleurs: Array.isArray(initialProduct.couleurs) ? initialProduct.couleurs.join(', ') : '',
        dimensions: Array.isArray(initialProduct.dimensions) ? initialProduct.dimensions.join(', ') : '',
        materiau: Array.isArray(initialProduct.materiau) ? initialProduct.materiau.join(', ') : '',
        capacite: Array.isArray(initialProduct.capacite) ? initialProduct.capacite.join(', ') : '',
        poids: Array.isArray(initialProduct.poids) ? initialProduct.poids.join(', ') : '',
        prix: initialProduct.prix || 0,
        stock: initialProduct.stock || 0
      });

      // Initialiser les tags visuels avec les données du produit
      const initialTags = {
        type: Array.isArray(initialProduct.type) ? initialProduct.type : [],
        anse: Array.isArray(initialProduct.anse) ? initialProduct.anse : [],
        couleurs: Array.isArray(initialProduct.couleurs) ? initialProduct.couleurs : [],
        dimensions: Array.isArray(initialProduct.dimensions) ? initialProduct.dimensions : [],
        materiau: Array.isArray(initialProduct.materiau) ? initialProduct.materiau : [],
        capacite: Array.isArray(initialProduct.capacite) ? initialProduct.capacite : [],
        poids: Array.isArray(initialProduct.poids) ? initialProduct.poids : []
      };
      
      console.log('🏷️ Tags initialisés:', initialTags);
      setTags(initialTags);
    }
  }, [isEditMode, initialProduct]);

  // Réinitialiser les états quand la modale se ferme
  useEffect(() => {
    if (!show) {
      setNewProduct({
        nom: '',
        categorie: '',
        image: '',
        imageFile: null,
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
        poids: []
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
    poids: [] as string[]
  });

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        onAlert('danger', 'Format de fichier non supporté. Utilisez JPG, JPEG, PNG ou WEBP.');
        return;
      }
      
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        onAlert('danger', 'Le fichier est trop volumineux. Taille maximale: 5MB.');
        return;
      }

      setNewProduct(prev => ({
        ...prev,
        imageFile: file,
        image: URL.createObjectURL(file) // Pour l'aperçu
      }));
    }
  }, [onAlert]);

  const handleImageDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      // Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        onAlert('danger', 'Format de fichier non supporté. Utilisez JPG, JPEG, PNG ou WEBP.');
        return;
      }
      
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        onAlert('danger', 'Le fichier est trop volumineux. Taille maximale: 5MB.');
        return;
      }

      setNewProduct(prev => ({
        ...prev,
        imageFile: file,
        image: URL.createObjectURL(file) // Pour l'aperçu
      }));
    }
  }, [onAlert]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const removeImage = useCallback(() => {
    setNewProduct(prev => ({
      ...prev,
      imageFile: null,
      image: ''
    }));
  }, []);

  const openTagModal = useCallback((field: keyof typeof newProduct) => {
    setCurrentTagField(field);
    setTagInputValue('');
    setShowTagModal(true);
  }, []);

  const addTagFromModal = useCallback(() => {
    const tagValue = tagInputValue.trim();
    
    if (tagValue) {
      // Vérifier que currentTagField est un champ de caractéristique valide
      const characteristicFields = ['type', 'anse', 'couleurs', 'dimensions', 'materiau', 'capacite', 'poids'];
      
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
      

      // Gestion intelligente de l'image
      let imageUrl = '/mug.webp';
      
      // Si une image a été sélectionnée
      if (newProduct.image && newProduct.image !== '/placeholder-product.jpg' && newProduct.image !== '/mug.webp') {
        if (newProduct.image.startsWith('blob:')) {
          // Convertir l'image blob en base64 pour la sauvegarder
          try {
            const response = await fetch(newProduct.image);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = () => {
              // L'image sera sauvegardée en base64
              imageUrl = reader.result as string;
            };
            reader.readAsDataURL(blob);
            
            // Attendre que la conversion soit terminée
            await new Promise((resolve) => {
              reader.onloadend = resolve;
            });
          } catch (error) {
            console.error('Erreur lors de la conversion de l\'image:', error);
            imageUrl = '/mug.webp';
          }
        } else {
          imageUrl = newProduct.image;
        }
      }
      
      console.log('Image URL utilisée:', imageUrl);
      
      // Préparer les données du produit avec les tags
      const productData = {
        nom: newProduct.nom.trim(),
        categorie: newProduct.categorie.trim(),
        image: imageUrl,
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

      console.log('Données envoyées à Firebase:', productData);

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
        image: '',
        imageFile: null,
        description: '',
        fournisseur: { nom: '', ville: '' },
        type: '',
        anse: '',
        couleurs: '',
        dimensions: '',
        materiau: '',
        capacite: '',
        poids: '',
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
        poids: []
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
  }, [newProduct, onAlert, onHide, onProductAdded]);

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
                      rows={3}
                      value={newProduct.description}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Décrivez le produit..."
                    />
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Image du produit</Form.Label>
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
                        justifyContent: 'center'
                      }}
                    >
                      {newProduct.image ? (
                        <div className="text-center">
                          <img 
                            src={newProduct.image} 
                            alt="Aperçu" 
                            style={{ 
                              maxWidth: '100px', 
                              maxHeight: '100px', 
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
              </Row>
            </div>

            {/* Section 2: Caractéristiques */}
            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <i className="bi bi-gear me-2"></i>
                Section 2: Caractéristiques
              </h5>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Form.Label className="mb-0">Type</Form.Label>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => openTagModal('type')}
                        className="p-1"
                        style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          lineHeight: '1'
                        }}
                      >
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                    
                    {/* Zone des tags */}
                    <div 
                      className="border rounded p-2"
                      style={{ 
                        minHeight: '38px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        alignItems: 'center'
                      }}
                    >
                      {tags.type.length > 0 ? (
                        tags.type.map((tag, index) => (
                          <span 
                            key={index} 
                            className="badge bg-primary d-flex align-items-center gap-1"
                            style={{ fontSize: '0.75rem' }}
                          >
                            {tag}
                            <i 
                              className="bi bi-x" 
                              style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                              onClick={() => removeTag('type', tag)}
                            ></i>
                          </span>
                        ))
                      ) : (
                        <span className="text-muted small">Aucun type sélectionné</span>
                      )}
                    </div>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Form.Label className="mb-0">Anse</Form.Label>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => openTagModal('anse')}
                        className="p-1"
                        style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          lineHeight: '1'
                        }}
                      >
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                    
                    {/* Zone des tags */}
                    <div 
                      className="border rounded p-2"
                      style={{ 
                        minHeight: '38px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        alignItems: 'center'
                      }}
                    >
                      {tags.anse.length > 0 ? (
                        tags.anse.map((tag, index) => (
                          <span 
                            key={index} 
                            className="badge bg-info d-flex align-items-center gap-1"
                            style={{ fontSize: '0.75rem' }}
                          >
                            {tag}
                            <i 
                              className="bi bi-x" 
                              style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                              onClick={() => removeTag('anse', tag)}
                            ></i>
                          </span>
                        ))
                      ) : (
                        <span className="text-muted small">Aucune anse sélectionnée</span>
                      )}
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Form.Label className="mb-0">Couleurs</Form.Label>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => openTagModal('couleurs')}
                        className="p-1"
                        style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          lineHeight: '1'
                        }}
                      >
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                    
                    {/* Zone des tags */}
                    <div 
                      className="border rounded p-2"
                      style={{ 
                        minHeight: '38px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        alignItems: 'center'
                      }}
                    >
                      {tags.couleurs.length > 0 ? (
                        tags.couleurs.map((tag, index) => (
                          <span 
                            key={index} 
                            className="badge bg-warning d-flex align-items-center gap-1"
                            style={{ fontSize: '0.75rem' }}
                          >
                            {tag}
                            <i 
                              className="bi bi-x" 
                              style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                              onClick={() => removeTag('couleurs', tag)}
                            ></i>
                          </span>
                        ))
                      ) : (
                        <span className="text-muted small">Aucune couleur sélectionnée</span>
                      )}
                    </div>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Form.Label className="mb-0">Tailles ou Dimensions</Form.Label>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => openTagModal('dimensions')}
                        className="p-1"
                        style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          lineHeight: '1'
                        }}
                      >
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                    
                    {/* Zone des tags */}
                    <div 
                      className="border rounded p-2"
                      style={{ 
                        minHeight: '38px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        alignItems: 'center'
                      }}
                    >
                      {tags.dimensions.length > 0 ? (
                        tags.dimensions.map((tag, index) => (
                          <span 
                            key={index} 
                            className="badge bg-success d-flex align-items-center gap-1"
                            style={{ fontSize: '0.75rem' }}
                          >
                            {tag}
                            <i 
                              className="bi bi-x" 
                              style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                              onClick={() => removeTag('dimensions', tag)}
                            ></i>
                          </span>
                        ))
                      ) : (
                        <span className="text-muted small">Aucune dimension sélectionnée</span>
                      )}
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Form.Label className="mb-0">Matériaux</Form.Label>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => openTagModal('materiau')}
                        className="p-1"
                        style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          lineHeight: '1'
                        }}
                      >
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                    
                    {/* Zone des tags */}
                    <div 
                      className="border rounded p-2"
                      style={{ 
                        minHeight: '38px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        alignItems: 'center'
                      }}
                    >
                      {tags.materiau.length > 0 ? (
                        tags.materiau.map((tag, index) => (
                          <span 
                            key={index} 
                            className="badge bg-secondary d-flex align-items-center gap-1"
                            style={{ fontSize: '0.75rem' }}
                          >
                            {tag}
                            <i 
                              className="bi bi-x" 
                              style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                              onClick={() => removeTag('materiau', tag)}
                            ></i>
                          </span>
                        ))
                      ) : (
                        <span className="text-muted small">Aucun matériau sélectionné</span>
                      )}
                    </div>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Form.Label className="mb-0">Capacité</Form.Label>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => openTagModal('capacite')}
                        className="p-1"
                        style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          lineHeight: '1'
                        }}
                      >
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                    
                    {/* Zone des tags */}
                    <div 
                      className="border rounded p-2"
                      style={{ 
                        minHeight: '38px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        alignItems: 'center'
                      }}
                    >
                      {tags.capacite.length > 0 ? (
                        tags.capacite.map((tag, index) => (
                          <span 
                            key={index} 
                            className="badge bg-dark d-flex align-items-center gap-1"
                            style={{ fontSize: '0.75rem' }}
                          >
                            {tag}
                            <i 
                              className="bi bi-x" 
                              style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                              onClick={() => removeTag('capacite', tag)}
                            ></i>
                          </span>
                        ))
                      ) : (
                        <span className="text-muted small">Aucune capacité sélectionnée</span>
                      )}
                    </div>
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