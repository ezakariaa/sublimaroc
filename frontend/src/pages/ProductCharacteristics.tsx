import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Table, Alert, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ProductService } from '../services/apiService';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getCharacteristicStyle, getCharacteristicIcon } from '../config/characteristics';
import { LabelService } from '../services/apiService';
import './ProductCharacteristics.css';
import CustomSelect from '../components/CustomSelect';

// Types de caractéristiques de base (définis en dehors du composant car constants)
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

const ProductCharacteristics: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productDocumentIds, setProductDocumentIds] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingCharacteristic, setEditingCharacteristic] = useState<{
    productId: string;
    characteristicType: string;
  } | null>(null);
  const [newValue, setNewValue] = useState('');
  const [showAddCharacteristicModal, setShowAddCharacteristicModal] = useState(false);
  const [selectedProductForNewChar, setSelectedProductForNewChar] = useState<string>('');
  const [newCharacteristicName, setNewCharacteristicName] = useState('');
  const [newCharacteristicKey, setNewCharacteristicKey] = useState('');
  const [showEditCharacteristicModal, setShowEditCharacteristicModal] = useState(false);
  const [editingCharacteristicKey, setEditingCharacteristicKey] = useState<string>('');
  const [editingCharacteristicLabel, setEditingCharacteristicLabel] = useState<string>('');
  const [editingValue, setEditingValue] = useState<{
    productId: string;
    characteristicType: string;
    oldValue: string;
    newValue: string;
  } | null>(null);
  const [showEditValueModal, setShowEditValueModal] = useState(false);

  // État pour les caractéristiques personnalisées ajoutées
  const [customCharacteristics, setCustomCharacteristics] = useState<Array<{ key: string; label: string }>>([]);
  
  // État pour les labels personnalisés des caractéristiques (y compris les caractéristiques de base)
  const [customLabels, setCustomLabels] = useState<Map<string, string>>(new Map());

  // Combiner les caractéristiques de base avec les caractéristiques personnalisées
  const characteristicTypes = [...baseCharacteristicTypes, ...customCharacteristics].map(charType => {
    // Si un label personnalisé existe, l'utiliser
    const customLabel = customLabels.get(charType.key);
    return customLabel ? { ...charType, label: customLabel } : charType;
  });

  // Charger les produits depuis l'API MySQL
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const productsData = await ProductService.getAllProducts();
      setProducts(productsData);

      // Charger les labels personnalisés
      const labelsData = await LabelService.getLabels().catch(() => ({}));
      const labelsMap = new Map<string, string>(Object.entries(labelsData));
      setCustomLabels(labelsMap);

      // Détecter les caractéristiques personnalisées
      const standardFields = ['id', 'nom', 'description', 'prix', 'image', 'images', 'categorie', 'stock', 'fournisseur', 'dateCreation', 'dateModification'];
      const customChars = new Map<string, string>();
      productsData.forEach(product => {
        Object.keys(product).forEach(key => {
          if (!standardFields.includes(key) && Array.isArray(product[key as keyof Product])) {
            const isBaseChar = baseCharacteristicTypes.some(ct => ct.key === key);
            if (!isBaseChar && !customChars.has(key)) {
              const customLabel = labelsMap.get(key);
              customChars.set(key, customLabel || key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
            }
          }
        });
      });
      setCustomCharacteristics(Array.from(customChars.entries()).map(([key, label]) => ({ key, label })));
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les labels personnalisés depuis l'API
  const loadCustomLabels = useCallback(async () => {
    try {
      const labelsData = await LabelService.getLabels();
      setCustomLabels(new Map<string, string>(Object.entries(labelsData)));
    } catch (error) {
      console.error('Erreur lors du chargement des labels personnalisés:', error);
    }
  }, []);

  // Charger les produits au montage du composant
  useEffect(() => {
    if (user) {
      loadProducts();
      loadCustomLabels();
    }
  }, [user, loadProducts, loadCustomLabels]);

  // Avec MySQL, l'ID du produit est directement l'identifiant — plus besoin de document Firebase
  const findProductDocumentId = useCallback((productId: string): string | null => {
    return productId;
  }, []);

  // Ajouter une nouvelle valeur à une caractéristique
  const handleAddCharacteristic = useCallback(async (productId: string, characteristicType: string) => {
    if (!newValue.trim()) {
      toast.error('Veuillez saisir une valeur');
      return;
    }

    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const currentValues = (product[characteristicType as keyof Product] as string[]) || [];
      
      // Vérifier si la valeur existe déjà
      if (currentValues.includes(newValue.trim())) {
        toast.warning('Cette valeur existe déjà');
        return;
      }

      const updatedValues = [...currentValues, newValue.trim()];
      
      // Trouver le document ID Firebase
      const documentId = findProductDocumentId(productId);
      if (!documentId) {
        console.error('Document ID non trouvé pour le produit:', productId);
        toast.error('Impossible de trouver le produit dans Firebase');
        return;
      }
      
      console.log('🔄 Mise à jour caractéristique:', { productId, documentId, characteristicType, updatedValues });
      
      // Mettre à jour le produit dans Firebase
      await ProductService.updateProduct(documentId, {
        [characteristicType]: updatedValues
      } as Partial<Product>);

      // Mettre à jour le state local directement sans recharger
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, [characteristicType]: updatedValues }
          : p
      ));

      toast.success(`Valeur "${newValue.trim()}" ajoutée avec succès`);
      setNewValue('');
      setEditingCharacteristic(null);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la caractéristique:', error);
      toast.error('Erreur lors de l\'ajout de la caractéristique');
    }
  }, [newValue, products, findProductDocumentId]);

  // Renommer une valeur d'une caractéristique
  const handleRenameValue = useCallback(async (productId: string, characteristicType: string, oldValue: string, newValue: string) => {
    if (!newValue.trim() || newValue.trim() === oldValue) {
      toast.warning('Veuillez saisir une nouvelle valeur différente');
      return;
    }

    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const currentValues = (product[characteristicType as keyof Product] as string[]) || [];
      
      // Vérifier si la nouvelle valeur existe déjà
      if (currentValues.includes(newValue.trim()) && newValue.trim() !== oldValue) {
        toast.warning('Cette valeur existe déjà');
        return;
      }

      const updatedValues = currentValues.map(v => v === oldValue ? newValue.trim() : v);
      
      // Trouver le document ID Firebase
      const documentId = findProductDocumentId(productId);
      if (!documentId) {
        console.error('Document ID non trouvé pour le produit:', productId);
        toast.error('Impossible de trouver le produit dans Firebase');
        return;
      }
      
      console.log('🔄 Renommage valeur caractéristique:', { productId, documentId, characteristicType, oldValue, newValue: newValue.trim(), updatedValues });
      
      // Mettre à jour le produit dans Firebase
      await ProductService.updateProduct(documentId, {
        [characteristicType]: updatedValues
      } as Partial<Product>);

      // Mettre à jour le state local directement sans recharger
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, [characteristicType]: updatedValues }
          : p
      ));

      toast.success(`Valeur "${oldValue}" renommée en "${newValue.trim()}" avec succès`);
      setEditingValue(null);
      setShowEditValueModal(false);
    } catch (error) {
      console.error('Erreur lors du renommage de la valeur:', error);
      toast.error('Erreur lors du renommage de la valeur');
    }
  }, [products, findProductDocumentId]);

  // Ouvrir la modale d'édition d'une valeur
  const startEditingValue = (productId: string, characteristicType: string, value: string) => {
    setEditingValue({
      productId,
      characteristicType,
      oldValue: value,
      newValue: value
    });
    setShowEditValueModal(true);
  };

  // Supprimer une valeur d'une caractéristique
  const handleRemoveCharacteristic = useCallback(async (productId: string, characteristicType: string, value: string) => {
    console.log('🗑️ Début de la suppression:', { productId, characteristicType, value });
    
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        console.error('❌ Produit non trouvé:', productId);
        toast.error('Produit non trouvé');
        return;
      }

      const currentValues = (product[characteristicType as keyof Product] as string[]) || [];
      console.log('📋 Valeurs actuelles:', currentValues);
      
      const updatedValues = currentValues.filter(v => v !== value);
      console.log('📋 Valeurs après suppression:', updatedValues);
      
      // Trouver le document ID Firebase
      const documentId = findProductDocumentId(productId);
      if (!documentId) {
        console.error('❌ Document ID non trouvé pour le produit:', productId);
        toast.error('Impossible de trouver le produit dans Firebase');
        return;
      }
      
      console.log('🔄 Suppression valeur caractéristique:', { productId, documentId, characteristicType, value, updatedValues });
      
      // Mettre à jour le produit dans Firebase
      await ProductService.updateProduct(documentId, {
        [characteristicType]: updatedValues
      } as Partial<Product>);

      console.log('✅ Mise à jour Firebase réussie');

      // Mettre à jour le state local directement sans recharger
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, [characteristicType]: updatedValues }
          : p
      ));

      console.log('✅ State local mis à jour');
      toast.success(`Valeur "${value}" supprimée avec succès`);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la caractéristique:', error);
      toast.error('Erreur lors de la suppression de la caractéristique');
    }
  }, [products, findProductDocumentId]);

  // Supprimer complètement une caractéristique du produit (même si elle n'a pas de valeurs)
  const handleDeleteCharacteristic = useCallback(async (productId: string, characteristicType: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const charTypeLabel = characteristicTypes.find(ct => ct.key === characteristicType)?.label || characteristicType;
    const currentValues = (product[characteristicType as keyof Product] as string[]) || [];
    
    // Demander confirmation
    const message = currentValues.length > 0
      ? `Êtes-vous sûr de vouloir supprimer complètement la caractéristique "${charTypeLabel}" et toutes ses valeurs pour ce produit ?`
      : `Êtes-vous sûr de vouloir supprimer la caractéristique "${charTypeLabel}" pour ce produit ?`;
    
    if (!window.confirm(message)) {
      return;
    }

    try {
      // Trouver le document ID Firebase
      const documentId = findProductDocumentId(productId);
      if (!documentId) {
        console.error('Document ID non trouvé pour le produit:', productId);
        toast.error('Impossible de trouver le produit dans Firebase');
        return;
      }
      
      console.log('🔄 Suppression de la caractéristique:', {
        productId,
        characteristicType,
        documentId,
        currentValues
      });
      
      // Retirer réellement le champ du document de CE produit uniquement.
      // Écrire null ne supprimerait pas le champ : il réapparaîtrait au rechargement.
      await ProductService.deleteProductFields(documentId!, [characteristicType]);
      
      console.log('✅ Caractéristique retirée du document Firebase');

      // Mettre à jour le state local directement sans recharger
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          const updatedProduct = { ...p };
          // Supprimer la caractéristique de l'objet produit
          delete (updatedProduct as any)[characteristicType];
          return updatedProduct;
        }
        return p;
      }));
      
      console.log('✅ State local mis à jour');

      const successMessage = currentValues.length > 0
        ? `La caractéristique "${charTypeLabel}" et toutes ses valeurs ont été supprimées avec succès`
        : `La caractéristique "${charTypeLabel}" a été supprimée avec succès`;
      
      toast.success(successMessage);
    } catch (error) {
      console.error('Erreur lors de la suppression de la caractéristique:', error);
      toast.error('Erreur lors de la suppression de la caractéristique');
    }
  }, [products, findProductDocumentId, characteristicTypes]);

  // Commencer l'édition d'une caractéristique
  const startEditing = (productId: string, characteristicType: string) => {
    setEditingCharacteristic({ productId, characteristicType });
    setNewValue('');
  };

  // Annuler l'édition
  const cancelEditing = () => {
    setEditingCharacteristic(null);
    setNewValue('');
  };

  // Éditer le nom d'une caractéristique (toutes les caractéristiques peuvent être éditées)
  const handleEditCharacteristicName = useCallback(async () => {
    if (!editingCharacteristicKey || !editingCharacteristicLabel.trim()) {
      toast.error('Veuillez saisir un nom valide');
      return;
    }

    try {
      const newLabel = editingCharacteristicLabel.trim();
      await LabelService.updateLabels({ [editingCharacteristicKey]: newLabel });

      // Vérifier si c'est une caractéristique personnalisée
      const isCustomChar = customCharacteristics.some(c => c.key === editingCharacteristicKey);
      
      if (isCustomChar) {
        // Mettre à jour le label dans la liste des caractéristiques personnalisées
        setCustomCharacteristics(prev => 
          prev.map(char => 
            char.key === editingCharacteristicKey 
              ? { ...char, label: newLabel }
              : char
          )
        );
      } else {
        // Pour les caractéristiques de base, stocker le label personnalisé
        setCustomLabels(prev => {
          const newMap = new Map(prev);
          newMap.set(editingCharacteristicKey, newLabel);
          return newMap;
        });
      }

      toast.success(`Nom de la caractéristique mis à jour avec succès`);
      setShowEditCharacteristicModal(false);
      setEditingCharacteristicKey('');
      setEditingCharacteristicLabel('');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du nom de la caractéristique:', error);
      toast.error('Erreur lors de la mise à jour du nom de la caractéristique');
    }
  }, [editingCharacteristicKey, editingCharacteristicLabel, customCharacteristics]);

  // Ouvrir la modale d'édition du nom de caractéristique
  const startEditingCharacteristicName = (charTypeKey: string) => {
    // Chercher d'abord dans les caractéristiques personnalisées
    const customChar = customCharacteristics.find(c => c.key === charTypeKey);
    if (customChar) {
      setEditingCharacteristicKey(charTypeKey);
      setEditingCharacteristicLabel(customChar.label);
      setShowEditCharacteristicModal(true);
      return;
    }
    
    // Sinon, chercher dans les caractéristiques de base
    const baseChar = baseCharacteristicTypes.find(c => c.key === charTypeKey);
    if (baseChar) {
      // Vérifier s'il y a un label personnalisé
      const customLabel = customLabels.get(charTypeKey);
      setEditingCharacteristicKey(charTypeKey);
      setEditingCharacteristicLabel(customLabel || baseChar.label);
      setShowEditCharacteristicModal(true);
    }
  };

  // Ajouter une nouvelle caractéristique à un produit
  const handleAddNewCharacteristic = useCallback(async () => {
    if (!selectedProductForNewChar || !newCharacteristicName.trim() || !newCharacteristicKey.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    // Vérifier que la clé n'existe pas déjà
    if (characteristicTypes.some(ct => ct.key === newCharacteristicKey.toLowerCase())) {
      toast.error('Cette clé de caractéristique existe déjà');
      return;
    }

    try {
      const documentId = findProductDocumentId(selectedProductForNewChar);
      if (!documentId) {
        toast.error('Impossible de trouver le produit');
        return;
      }

      const characteristicKey = newCharacteristicKey.toLowerCase();

      // Sauvegarder le label via l'API
      await LabelService.updateLabels({ [characteristicKey]: newCharacteristicName.trim() });

      // Ajouter la nouvelle caractéristique au produit via l'API
      await ProductService.updateProduct(documentId!, {
        [characteristicKey]: []
      } as any);

      // Ajouter la nouvelle caractéristique à la liste des caractéristiques personnalisées
      const newCharType = {
        key: characteristicKey,
        label: newCharacteristicName.trim()
      };
      setCustomCharacteristics(prev => [...prev, newCharType]);
      
      // Mettre à jour aussi les customLabels pour que le label soit disponible immédiatement
      setCustomLabels(prev => {
        const newMap = new Map(prev);
        newMap.set(characteristicKey, newCharacteristicName.trim());
        return newMap;
      });
      
      // Mettre à jour le state local directement sans recharger
      setProducts(prev => prev.map(p => 
        p.id === selectedProductForNewChar 
          ? { ...p, [newCharacteristicKey.toLowerCase()]: [] }
          : p
      ));

      toast.success(`Caractéristique "${newCharacteristicName.trim()}" ajoutée avec succès`);
      setShowAddCharacteristicModal(false);
      setSelectedProductForNewChar('');
      setNewCharacteristicName('');
      setNewCharacteristicKey('');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la caractéristique:', error);
      toast.error('Erreur lors de l\'ajout de la caractéristique');
    }
  }, [selectedProductForNewChar, newCharacteristicName, newCharacteristicKey, characteristicTypes, findProductDocumentId]);

  if (!user) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          Vous devez être connecté pour accéder à cette page.
        </Alert>
      </Container>
    );
  }

  return (
    <div className="product-characteristics-page">
      <Container className="py-5">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="mb-2">
                  <i className="bi bi-tags me-2"></i>
                  Gestion des Caractéristiques
                </h1>
                <p className="text-muted">
                  Gérez les caractéristiques disponibles pour chaque produit
                </p>
              </div>
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/settings')}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Retour aux Paramètres
              </Button>
            </div>
          </Col>
        </Row>

        {loading ? (
          <Row>
            <Col className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </Col>
          </Row>
        ) : products.length === 0 ? (
          <Row>
            <Col>
              <Alert variant="info">
                Aucun produit trouvé. Veuillez d'abord ajouter des produits.
              </Alert>
            </Col>
          </Row>
        ) : (
          <Row>
            {products.map((product) => (
              <Col key={product.id} md={12} className="mb-4">
                <Card>
                  <Card.Header className="bg-primary text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">
                        <i className="bi bi-box me-2"></i>
                        {product.nom}
                        <small className="ms-2 opacity-75">(ID: {product.id})</small>
                      </h5>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setSelectedProductForNewChar(product.id);
                          setShowAddCharacteristicModal(true);
                        }}
                        className="stock-header-add-product text-white text-decoration-none p-0"
                        disabled={!user}
                      >
                        <i className="bi bi-plus-circle me-1"></i>
                        Ajouter une caractéristique
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <Table bordered hover style={{ tableLayout: 'fixed', width: '100%' }}>
                      <colgroup>
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '77%' }} />
                        <col style={{ width: '10%' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th style={{ width: '13%', minWidth: '13%', maxWidth: '13%' }}>Caractéristique</th>
                          <th style={{ width: '77%', minWidth: '77%', maxWidth: '77%' }}>Valeurs</th>
                          <th style={{ width: '10%', minWidth: '10%', maxWidth: '10%' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {characteristicTypes.map((charType) => {
                          // Vérifier si la caractéristique existe dans le produit
                          const characteristicValue = product[charType.key as keyof Product];
                          // Absente du produit (undefined), ou laissée à null par
                          // l'ancienne suppression qui n'effaçait pas le champ.
                          if (characteristicValue === undefined || characteristicValue === null) {
                            return null;
                          }
                          const values = Array.isArray(characteristicValue) ? characteristicValue : [];
                          const isEditing = editingCharacteristic?.productId === product.id && 
                                           editingCharacteristic?.characteristicType === charType.key;

                          return (
                            <tr key={charType.key}>
                              <td style={{ width: '13%', minWidth: '13%', maxWidth: '13%' }}>
                                <strong>{charType.label}</strong>
                              </td>
                              <td style={{ width: '77%', minWidth: '77%', maxWidth: '77%' }}>
                                {values.length > 0 ? (
                                  <div className="d-flex flex-wrap gap-2">
                                    {values.map((value, index) => (
                                      <Badge 
                                        key={index} 
                                        bg=""
                                        className="d-flex align-items-center"
                                        style={{
                                          ...getCharacteristicStyle(charType.key),
                                          fontSize: '0.75rem',
                                          padding: '0.35rem 0.5rem',
                                          cursor: 'default',
                                          userSelect: 'none'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <i className={`bi ${getCharacteristicIcon(charType.key)} me-1`}></i>
                                        <span style={{ marginRight: '0.25rem' }}>{value}</span>
                                        <span
                                          className="ms-2"
                                          style={{ fontSize: '0.8rem', cursor: 'pointer', lineHeight: '1', display: 'inline-flex', alignItems: 'center' }}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('✏️ Clic sur éditer:', { productId: product.id, characteristicType: charType.key, value });
                                            startEditingValue(product.id, charType.key, value);
                                          }}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          title="Renommer"
                                        >
                                          <i className="bi bi-pencil"></i>
                                        </span>
                                        <span
                                          className="ms-1"
                                          style={{ fontSize: '0.8rem', cursor: 'pointer', lineHeight: '1', display: 'inline-flex', alignItems: 'center' }}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('🗑️ Clic sur supprimer:', { productId: product.id, characteristicType: charType.key, value });
                                            handleRemoveCharacteristic(product.id, charType.key, value);
                                          }}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          title="Supprimer"
                                        >
                                          <i className="bi bi-x-circle"></i>
                                        </span>
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted">Aucune valeur</span>
                                )}
                                {isEditing && (
                                  <div className="mt-2">
                                    <Form.Group className="d-flex gap-2">
                                      <Form.Control
                                        type="text"
                                        placeholder={`Ajouter une ${charType.label.toLowerCase()}`}
                                        value={newValue}
                                        onChange={(e) => setNewValue(e.target.value)}
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            handleAddCharacteristic(product.id, charType.key);
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => handleAddCharacteristic(product.id, charType.key)}
                                      >
                                        <i className="bi bi-check"></i>
                                      </Button>
                                      <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={cancelEditing}
                                      >
                                        <i className="bi bi-x"></i>
                                      </Button>
                                    </Form.Group>
                                  </div>
                                )}
                              </td>
                              <td style={{ width: '10%', minWidth: '10%', maxWidth: '10%', textAlign: 'center' }}>
                                {!isEditing ? (
                                  <div className="d-flex flex-row gap-2 justify-content-center">
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => startEditing(product.id, charType.key)}
                                      title="Ajouter"
                                    >
                                      <i className="bi bi-plus-circle"></i>
                                    </Button>
                                    <Button
                                      variant="outline-warning"
                                      size="sm"
                                      onClick={() => startEditingCharacteristicName(charType.key)}
                                      title="Éditer le nom de la caractéristique"
                                    >
                                      <i className="bi bi-pencil"></i>
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleDeleteCharacteristic(product.id, charType.key)}
                                      title="Supprimer complètement cette caractéristique du produit"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-muted">En cours...</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Container>

      {/* Modale pour ajouter une nouvelle caractéristique */}
      <Modal show={showAddCharacteristicModal} onHide={() => {
        setShowAddCharacteristicModal(false);
        setSelectedProductForNewChar('');
        setNewCharacteristicName('');
        setNewCharacteristicKey('');
      }}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-plus-circle me-2"></i>
            Ajouter une caractéristique
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Produit *</Form.Label>
              <CustomSelect
                value={selectedProductForNewChar}
                onChange={(e) => setSelectedProductForNewChar(e.target.value)}
                required
                disabled={!!selectedProductForNewChar}
              >
                <option value="">Sélectionner un produit</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.nom} (ID: {product.id})
                  </option>
                ))}
              </CustomSelect>
              {selectedProductForNewChar && (
                <Form.Text className="text-muted">
                  Produit sélectionné depuis l'en-tête du produit
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nom de la caractéristique *</Form.Label>
              <Form.Control
                type="text"
                value={newCharacteristicName}
                onChange={(e) => {
                  setNewCharacteristicName(e.target.value);
                  // Générer automatiquement la clé à partir du nom si vide
                  if (!newCharacteristicKey && e.target.value.trim()) {
                    const key = e.target.value
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9\s-]/g, '')
                      .replace(/\s+/g, '-')
                      .replace(/-+/g, '-')
                      .replace(/^-+|-+$/g, '');
                    setNewCharacteristicKey(key);
                  }
                }}
                placeholder="Ex: Taille, Format, Style..."
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Clé technique (identifiant) *</Form.Label>
              <Form.Control
                type="text"
                value={newCharacteristicKey}
                onChange={(e) => setNewCharacteristicKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="Ex: taille, format, style..."
                required
              />
              <Form.Text className="text-muted">
                La clé doit être en minuscules, sans espaces ni caractères spéciaux (utilisez des tirets)
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowAddCharacteristicModal(false);
              setSelectedProductForNewChar('');
              setNewCharacteristicName('');
              setNewCharacteristicKey('');
            }}
          >
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddNewCharacteristic}
            disabled={!selectedProductForNewChar || !newCharacteristicName.trim() || !newCharacteristicKey.trim()}
          >
            <i className="bi bi-check me-2"></i>
            Ajouter
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modale pour éditer le nom d'une caractéristique */}
      <Modal show={showEditCharacteristicModal} onHide={() => {
        setShowEditCharacteristicModal(false);
        setEditingCharacteristicKey('');
        setEditingCharacteristicLabel('');
      }}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            Éditer le nom de la caractéristique
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom de la caractéristique *</Form.Label>
              <Form.Control
                type="text"
                value={editingCharacteristicLabel}
                onChange={(e) => setEditingCharacteristicLabel(e.target.value)}
                placeholder="Ex: Taille, Format, Style..."
                required
                autoFocus
              />
              <Form.Text className="text-muted">
                Clé technique: <code>{editingCharacteristicKey}</code> (non modifiable)
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowEditCharacteristicModal(false);
              setEditingCharacteristicKey('');
              setEditingCharacteristicLabel('');
            }}
          >
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={handleEditCharacteristicName}
            disabled={!editingCharacteristicLabel.trim()}
          >
            <i className="bi bi-check me-2"></i>
            Enregistrer
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modale pour renommer une valeur */}
      <Modal show={showEditValueModal} onHide={() => {
        setShowEditValueModal(false);
        setEditingValue(null);
      }}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil me-2"></i>
            Renommer la valeur
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Ancienne valeur</Form.Label>
              <Form.Control
                type="text"
                value={editingValue?.oldValue || ''}
                disabled
                className="bg-light"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nouvelle valeur *</Form.Label>
              <Form.Control
                type="text"
                value={editingValue?.newValue || ''}
                onChange={(e) => {
                  if (editingValue) {
                    setEditingValue({
                      ...editingValue,
                      newValue: e.target.value
                    });
                  }
                }}
                placeholder="Saisissez la nouvelle valeur"
                required
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && editingValue) {
                    handleRenameValue(
                      editingValue.productId,
                      editingValue.characteristicType,
                      editingValue.oldValue,
                      editingValue.newValue
                    );
                  }
                }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowEditValueModal(false);
              setEditingValue(null);
            }}
          >
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              if (editingValue) {
                handleRenameValue(
                  editingValue.productId,
                  editingValue.characteristicType,
                  editingValue.oldValue,
                  editingValue.newValue
                );
              }
            }}
            disabled={!editingValue?.newValue?.trim() || editingValue?.newValue?.trim() === editingValue?.oldValue}
          >
            <i className="bi bi-check me-2"></i>
            Enregistrer
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProductCharacteristics;
