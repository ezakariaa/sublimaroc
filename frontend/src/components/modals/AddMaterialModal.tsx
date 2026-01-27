import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Card, Badge } from 'react-bootstrap';
import { Material } from '../../types';
import { Timestamp } from 'firebase/firestore';
import { AchatService } from '../../services/firebaseService';

interface MaterialItem {
  id: string;
  nom: string;
  description: string;
  image: string;
  imageFile: File | null;
  referenceFournisseur: string;
  prixUnitaire: number;
  quantite: number;
  prixPaye: number;
}

interface Fournisseur {
  nom: string;
  telephone: string;
  email: string;
  ville: string;
}

interface MaterialAchat {
  nom: string;
  description: string;
  image: string;
  referenceFournisseur: string;
  prixUnitaire: number;
  quantite: number;
  prixPaye: number;
}

interface Achat {
  id: string;
  referenceAchat: string;
  fournisseur: Fournisseur;
  materials: MaterialAchat[];
  dateAchat: Date;
  dateCommande: Date;
  dateLivraison: Date;
  etat: 'Reçue' | 'En cours';
  totalAchat: number;
  createdAt: any;
  updatedAt?: any;
}

interface AddMaterialModalProps {
  show: boolean;
  onHide: () => void;
  onMaterialAdded: () => void;
  onAlert: (type: 'success' | 'danger', message: string) => void;
  initialAchat?: Achat | null;
  isEditMode?: boolean;
}

const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  show,
  onHide,
  onMaterialAdded,
  onAlert,
  initialAchat,
  isEditMode = false
}) => {
  // Fonction pour générer la référence d'achat
  const generateReferenceAchat = useCallback(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const randomNumbers = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `SUB-ACH-${day}${month}${year}-${randomNumbers}`;
  }, []);

  const [materials, setMaterials] = useState<MaterialItem[]>([
    {
      id: '1',
      nom: '',
      description: '',
      image: '',
      imageFile: null,
      referenceFournisseur: '',
      prixUnitaire: 0,
      quantite: 1,
      prixPaye: 0
    }
  ]);

  const [fournisseur, setFournisseur] = useState<Fournisseur>({
    nom: '',
    telephone: '',
    email: '',
    ville: ''
  });

  const [referenceAchat, setReferenceAchat] = useState<string>('');
  const [dateCommande, setDateCommande] = useState<Date>(new Date());
  const [dateLivraison, setDateLivraison] = useState<Date>(new Date());
  const [etat, setEtat] = useState<'Reçue' | 'En cours'>('En cours');

  // Initialiser les données en mode édition
  useEffect(() => {
    if (isEditMode && initialAchat) {
      console.log('🔧 Mode édition activé pour l\'achat:', initialAchat);
      
      // Initialiser la référence d'achat
      setReferenceAchat(initialAchat.referenceAchat || '');
      
      // Initialiser les dates et l'état avec validation
      const commandeDate = initialAchat.dateCommande ? new Date(initialAchat.dateCommande) : new Date();
      const livraisonDate = initialAchat.dateLivraison ? new Date(initialAchat.dateLivraison) : new Date();
      
      setDateCommande(isNaN(commandeDate.getTime()) ? new Date() : commandeDate);
      setDateLivraison(isNaN(livraisonDate.getTime()) ? new Date() : livraisonDate);
      setEtat(initialAchat.etat || 'En cours');
      
      // Initialiser les matériels
      const formattedMaterials: MaterialItem[] = initialAchat.materials.map((material, index) => ({
        id: (index + 1).toString(),
        nom: material.nom,
        description: material.description,
        image: material.image || '', // URL Firebase existante ou vide
        imageFile: null, // Pas de fichier au départ en mode édition
        referenceFournisseur: material.referenceFournisseur,
        prixUnitaire: material.prixUnitaire,
        quantite: material.quantite,
        prixPaye: material.prixPaye
      }));
      
      console.log('🔧 Matériels initialisés en mode édition:', formattedMaterials.map((m, idx) => ({
        index: idx,
        nom: m.nom,
        image: m.image,
        hasImageFile: !!m.imageFile
      })));
      
      setMaterials(formattedMaterials);
      
      // Initialiser le fournisseur
      setFournisseur({
        nom: initialAchat.fournisseur.nom,
        telephone: initialAchat.fournisseur.telephone,
        email: initialAchat.fournisseur.email,
        ville: initialAchat.fournisseur.ville
      });
    } else if (!isEditMode && show) {
      // Générer une nouvelle référence pour un nouvel achat
      setReferenceAchat(generateReferenceAchat());
    }
  }, [isEditMode, initialAchat?.id, show, generateReferenceAchat]); // Utiliser initialAchat?.id au lieu de initialAchat

  // Réinitialiser les états quand la modale se ferme (seulement si pas en mode édition)
  useEffect(() => {
    if (!show && !isEditMode) {
      setMaterials([
        {
          id: '1',
          nom: '',
          description: '',
          image: '',
          imageFile: null,
          referenceFournisseur: '',
          prixUnitaire: 0,
          quantite: 1,
          prixPaye: 0
        }
      ]);
      setFournisseur({
        nom: '',
        telephone: '',
        email: '',
        ville: ''
      });
      setReferenceAchat('');
      setDateCommande(new Date());
      setDateLivraison(new Date());
      setEtat('En cours');
    }
  }, [show, isEditMode]);

  // Calculer automatiquement le prix payé
  const calculatePrixPaye = useCallback((prixUnitaire: number, quantite: number) => {
    return prixUnitaire * quantite;
  }, []);

  // Mettre à jour un matériel
  const updateMaterial = useCallback((id: string, field: keyof MaterialItem, value: any) => {
    setMaterials(prev => prev.map(material => {
      if (material.id === id) {
        const updatedMaterial = { ...material, [field]: value };
        
        // Recalculer le prix payé si prix unitaire ou quantité change
        if (field === 'prixUnitaire' || field === 'quantite') {
          updatedMaterial.prixPaye = calculatePrixPaye(
            field === 'prixUnitaire' ? value : updatedMaterial.prixUnitaire,
            field === 'quantite' ? value : updatedMaterial.quantite
          );
        }
        
        return updatedMaterial;
      }
      return material;
    }));
  }, [calculatePrixPaye]);

  // Ajouter un nouveau matériel
  const addMaterial = useCallback(() => {
    const newId = (materials.length + 1).toString();
    const newMaterial: MaterialItem = {
      id: newId,
      nom: '',
      description: '',
      image: '',
      imageFile: null,
      referenceFournisseur: '',
      prixUnitaire: 0,
      quantite: 1,
      prixPaye: 0
    };
    setMaterials(prev => [...prev, newMaterial]);
  }, [materials.length]);

  // Supprimer un matériel
  const removeMaterial = useCallback((id: string) => {
    if (materials.length > 1) {
      setMaterials(prev => prev.filter(material => material.id !== id));
    }
  }, [materials.length]);

  // Gestion de l'upload d'image
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>, materialId: string) => {
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

      console.log(`📁 Fichier sélectionné pour matériel ${materialId}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        isFile: file instanceof File
      });

      const blobUrl = URL.createObjectURL(file);
      console.log(`🖼️ URL blob créée: ${blobUrl}`);
      
      updateMaterial(materialId, 'imageFile', file);
      updateMaterial(materialId, 'image', blobUrl);
    }
  }, [onAlert, updateMaterial]);

  // Gestion du drag & drop d'image
  const handleImageDrop = useCallback((event: React.DragEvent<HTMLDivElement>, materialId: string) => {
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

      updateMaterial(materialId, 'imageFile', file);
      updateMaterial(materialId, 'image', URL.createObjectURL(file));
    }
  }, [onAlert, updateMaterial]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // Supprimer une image
  const removeImage = useCallback((materialId: string) => {
    updateMaterial(materialId, 'imageFile', null);
    updateMaterial(materialId, 'image', '');
  }, [updateMaterial]);

  // Sauvegarder les achats
  const handleSavePurchases = useCallback(async () => {
    try {
      // Validation des champs obligatoires
      if (!fournisseur.nom.trim()) {
        onAlert('danger', 'Le nom du fournisseur est obligatoire');
        return;
      }

      const validMaterials = materials.filter(material => material.nom.trim());
      if (validMaterials.length === 0) {
        onAlert('danger', 'Au moins un matériel avec un nom est requis');
        return;
      }

      // Vérifier que tous les matériels ont les champs requis
      for (const material of validMaterials) {
        if (!material.nom.trim()) {
          onAlert('danger', 'Le nom du matériel est obligatoire pour tous les matériels');
          return;
        }
        if (material.prixUnitaire <= 0) {
          onAlert('danger', 'Le prix unitaire doit être supérieur à 0 pour tous les matériels');
          return;
        }
        if (material.quantite <= 0) {
          onAlert('danger', 'La quantité doit être supérieure à 0 pour tous les matériels');
          return;
        }
      }

      // Convertir les images blob en base64 avant de sauvegarder (comme pour les produits)
      const materialsWithBase64 = await Promise.all(
        validMaterials.map(async (material) => {
          let imageBase64 = material.image || '';
          
          // Si l'image est une URL blob, la convertir en base64
          if (material.image && material.image.startsWith('blob:')) {
            try {
              console.log(`🔄 Conversion blob vers base64 pour matériel: ${material.nom}`);
              const response = await fetch(material.image);
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
              
              imageBase64 = await base64Promise;
              console.log(`✅ Image convertie en base64 pour ${material.nom}`);
            } catch (error) {
              console.error('❌ Erreur lors de la conversion de l\'image:', error);
              // En cas d'erreur, garder l'image vide
              imageBase64 = '';
            }
          } else if (material.imageFile && material.imageFile instanceof File) {
            // Si on a un fichier directement, le convertir en base64
            try {
              console.log(`🔄 Conversion fichier vers base64 pour matériel: ${material.nom}`);
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
                reader.readAsDataURL(material.imageFile!);
              });
              
              imageBase64 = await base64Promise;
              console.log(`✅ Fichier converti en base64 pour ${material.nom}`);
            } catch (error) {
              console.error('❌ Erreur lors de la conversion du fichier:', error);
              imageBase64 = '';
            }
          } else if (material.image && !material.image.startsWith('blob:') && !material.image.startsWith('data:image')) {
            // Si c'est déjà une URL Firebase Storage ou autre URL, la garder telle quelle
            // (pour la compatibilité avec les anciennes données)
            imageBase64 = material.image;
          }
          
          return {
            nom: material.nom.trim(),
            description: material.description.trim(),
            image: imageBase64, // Stocker l'image en base64 ou URL existante
            referenceFournisseur: material.referenceFournisseur.trim(),
            prixUnitaire: material.prixUnitaire,
            quantite: material.quantite,
            prixPaye: material.prixPaye
          };
        })
      );

      // Préparer les données pour Firebase
      const achatData = {
        referenceAchat: referenceAchat,
        fournisseur: {
          nom: fournisseur.nom.trim(),
          telephone: fournisseur.telephone.trim(),
          email: fournisseur.email.trim(),
          ville: fournisseur.ville.trim()
        },
        materials: materialsWithBase64,
        dateAchat: new Date(),
        dateCommande: isNaN(dateCommande.getTime()) ? new Date() : dateCommande,
        dateLivraison: isNaN(dateLivraison.getTime()) ? new Date() : dateLivraison,
        etat: etat, // Utiliser la valeur actuelle de l'état
        totalAchat: validMaterials.reduce((sum, material) => sum + material.prixPaye, 0),
        createdAt: Timestamp.now()
      };

      console.log('Données à sauvegarder:', achatData);
      console.log('🔍 État actuel avant sauvegarde:', etat);
      console.log('🔍 État dans achatData:', achatData.etat);
      console.log('🔍 Type de etat:', typeof etat);
      console.log('🔍 Valeur exacte de etat:', JSON.stringify(etat));
      
      // Log des images pour déboguer
      console.log('🖼️ Images des matériels (base64):', achatData.materials.map((m: any, idx: number) => ({
        index: idx,
        nom: m.nom,
        hasImage: !!m.image,
        imageType: m.image ? (m.image.startsWith('data:image') ? 'base64' : m.image.startsWith('blob:') ? 'blob' : 'url') : 'none',
        imageLength: m.image ? m.image.length : 0
      })));

      if (isEditMode && initialAchat) {
        // Mode édition : mettre à jour l'achat existant
        console.log('🔄 Mise à jour de l\'achat:', initialAchat.id);
        await AchatService.updateAchat(initialAchat.id, achatData);
        console.log('✅ Mise à jour terminée, affichage de l\'alerte...');
        onAlert('success', `Achat modifié avec succès ! Total: ${achatData.totalAchat.toFixed(2)} DH`);
      } else {
        // Mode création : créer un nouvel achat
        console.log('🆕 Création d\'un nouvel achat');
        await AchatService.createAchat(achatData);
        console.log('✅ Création terminée, affichage de l\'alerte...');
        onAlert('success', `Achat enregistré avec succès ! Total: ${achatData.totalAchat.toFixed(2)} DH`);
      }
      
      console.log('🔄 Appel de onMaterialAdded...');
      onMaterialAdded();
      console.log('🔄 Appel de onHide...');
      onHide();
      console.log('🎉 Fonction handleSavePurchases terminée avec succès');

    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'achat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement de l\'achat';
      onAlert('danger', errorMessage);
    }
  }, [materials, fournisseur, onAlert, onMaterialAdded, onHide, referenceAchat, isEditMode, initialAchat, dateCommande, dateLivraison, etat]);

  return (
    <Modal 
      show={show} 
      onHide={onHide}
      size="xl"
    >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`bi ${isEditMode ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`}></i>
            {isEditMode ? 'Modifier l\'Achat de Matériel' : 'Nouveau Matériel Acheté'}
          </Modal.Title>
        </Modal.Header>
      <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto', padding: '1.5rem' }}>
        <Form>
          {/* Référence d'Achat */}
          {referenceAchat && (
            <div className="mb-4">
              <Card className="bg-primary text-white" style={{ marginBottom: '1rem' }}>
                <Card.Body className="py-3" style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-tag-fill me-2" style={{ fontSize: '1.2rem' }}></i>
                    <div>
                      <h6 className="mb-1">Référence d'Achat</h6>
                      <h4 className="mb-0 font-monospace">{referenceAchat}</h4>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          )}

          {/* Section 1: Informations Matériel */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-box me-2"></i>
              Section 1: Informations Matériel
            </h5>
            
            {materials.map((material, index) => (
              <Card key={material.id} className="mb-3">
                <Card.Header className="d-flex justify-content-between align-items-center" style={{ backgroundColor: '#424272', color: '#ffffff' }}>
                  <h6 className="mb-0" style={{ color: '#ffffff' }}>
                    <i className="bi bi-box-seam me-2" style={{ color: '#ffffff' }}></i>
                    Matériel {index + 1}
                  </h6>
                  {materials.length > 1 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeMaterial(material.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  )}
                </Card.Header>
                <Card.Body style={{ padding: '1.25rem' }}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nom du matériel *</Form.Label>
                        <Form.Control
                          type="text"
                          value={material.nom}
                          onChange={(e) => updateMaterial(material.id, 'nom', e.target.value)}
                          placeholder="Ex: Encre noire HP"
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={material.description}
                          onChange={(e) => updateMaterial(material.id, 'description', e.target.value)}
                          placeholder="Description du matériel..."
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Image du matériel</Form.Label>
                        <div
                          className="image-upload-zone"
                          onDrop={(e) => handleImageDrop(e, material.id)}
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
                          {material.image ? (
                            <div className="text-center">
                              <img 
                                src={material.image} 
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
                                  onClick={() => removeImage(material.id)}
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
                                onChange={(e) => handleImageUpload(e as React.ChangeEvent<HTMLInputElement>, material.id)}
                                style={{ display: 'none' }}
                                id={`image-upload-${material.id}`}
                              />
                              <Form.Label 
                                htmlFor={`image-upload-${material.id}`}
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
                  
                  {/* 2ème ligne : 4 colonnes sur toute la largeur */}
                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Référence Fournisseur</Form.Label>
                        <Form.Control
                          type="text"
                          value={material.referenceFournisseur}
                          onChange={(e) => updateMaterial(material.id, 'referenceFournisseur', e.target.value)}
                          placeholder="REF-FOUR-001"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Prix Unitaire (DH) *</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                          value={material.prixUnitaire}
                          onChange={(e) => updateMaterial(material.id, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Quantité *</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          value={material.quantite}
                          onChange={(e) => updateMaterial(material.id, 'quantite', parseInt(e.target.value) || 1)}
                          placeholder="1"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Prix Payé (DH)</Form.Label>
                        <Form.Control
                          type="number"
                          value={material.prixPaye}
                          readOnly
                          className="bg-light"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}

            <div className="text-center">
              <Button
                variant="outline-primary"
                onClick={addMaterial}
                className="mb-3"
              >
                <i className="bi bi-plus-circle me-2"></i>
                Ajouter un autre matériel
              </Button>
            </div>
          </div>

          {/* Section 2: Fournisseur */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-building me-2"></i>
              Section 2: Informations Fournisseur
            </h5>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nom du fournisseur *</Form.Label>
                  <Form.Control
                    type="text"
                    value={fournisseur.nom}
                    onChange={(e) => setFournisseur(prev => ({ ...prev, nom: e.target.value }))}
                    placeholder="Ex: Fournisseur ABC"
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Téléphone</Form.Label>
                  <Form.Control
                    type="tel"
                    value={fournisseur.telephone}
                    onChange={(e) => setFournisseur(prev => ({ ...prev, telephone: e.target.value }))}
                    placeholder="Ex: +212 6 12 34 56 78"
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={fournisseur.email}
                    onChange={(e) => setFournisseur(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Ex: contact@fournisseur.com"
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Ville</Form.Label>
                  <Form.Control
                    type="text"
                    value={fournisseur.ville}
                    onChange={(e) => setFournisseur(prev => ({ ...prev, ville: e.target.value }))}
                    placeholder="Ex: Casablanca"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Section 3: Dates */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-calendar-event me-2"></i>
              Section 3: Dates et État
            </h5>
            
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Date de Commande *</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateCommande && !isNaN(dateCommande.getTime()) ? dateCommande.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateCommande(new Date(e.target.value))}
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Date de Livraison *</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateLivraison && !isNaN(dateLivraison.getTime()) ? dateLivraison.toISOString().split('T')[0] : ''}
                    onChange={(e) => setDateLivraison(new Date(e.target.value))}
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>État *</Form.Label>
                  <Form.Select
                    value={etat}
                    onChange={(e) => {
                      const newEtat = e.target.value as 'Reçue' | 'En cours';
                      console.log('🔄 Changement d\'état:', newEtat);
                      setEtat(newEtat);
                      console.log('✅ État mis à jour dans le state:', newEtat);
                    }}
                    required
                  >
                    <option value="En cours">En cours</option>
                    <option value="Reçue">Reçue</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Date d'Achat</Form.Label>
                  <Form.Control
                    type="date"
                    value={new Date().toISOString().split('T')[0]}
                    readOnly
                    className="bg-light"
                  />
                  <Form.Text className="text-muted">
                    Générée automatiquement
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Résumé */}
          <div className="mb-4">
            <h5 className="text-success mb-3">
              <i className="bi bi-calculator me-2"></i>
              Résumé de l'Achat
            </h5>
            <Card className="bg-light" style={{ marginTop: '1rem' }}>
              <Card.Body style={{ padding: '1.25rem' }}>
                <Row>
                  <Col md={6}>
                    <p><strong>Nombre de matériels:</strong> {materials.filter(m => m.nom.trim()).length}</p>
                    <p><strong>Fournisseur:</strong> {fournisseur.nom || 'Non renseigné'}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Total à payer:</strong> 
                      <Badge bg="success" className="ms-2">
                        {materials.reduce((sum, material) => sum + material.prixPaye, 0).toFixed(2)} DH
                      </Badge>
                    </p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
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
          onClick={handleSavePurchases}
          disabled={!fournisseur.nom.trim() || materials.filter(m => m.nom.trim()).length === 0}
        >
          <i className="bi bi-check-circle me-2"></i>
          {isEditMode ? 'Mettre à jour l\'Achat' : 'Enregistrer l\'Achat'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddMaterialModal;
