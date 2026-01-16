import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Card, Badge } from 'react-bootstrap';
import { Timestamp } from 'firebase/firestore';
import { AchatService } from '../../services/firebaseService';

interface ArticleItem {
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

interface ArticleAchat {
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
  articles: ArticleAchat[];
  dateAchat: Date;
  dateCommande: Date;
  dateLivraison: Date;
  etat: 'Reçue' | 'En cours';
  totalAchat: number;
  createdAt: any;
  updatedAt?: any;
}

interface AddArticleModalProps {
  show: boolean;
  onHide: () => void;
  onArticleAdded: () => void;
  onAlert: (type: 'success' | 'danger', message: string) => void;
  initialAchat?: Achat | null;
  isEditMode?: boolean;
}

const AddArticleModal: React.FC<AddArticleModalProps> = ({
  show,
  onHide,
  onArticleAdded,
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
    return `SUB-ART-${day}${month}${year}-${randomNumbers}`;
  }, []);

  const [articles, setArticles] = useState<ArticleItem[]>([
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
      
      // Initialiser les articles
      const formattedArticles: ArticleItem[] = initialAchat.articles.map((article, index) => ({
        id: (index + 1).toString(),
        nom: article.nom,
        description: article.description,
        image: article.image,
        imageFile: null,
        referenceFournisseur: article.referenceFournisseur,
        prixUnitaire: article.prixUnitaire,
        quantite: article.quantite,
        prixPaye: article.prixPaye
      }));
      
      setArticles(formattedArticles);
      
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
  }, [isEditMode, initialAchat?.id, show, generateReferenceAchat]);

  // Réinitialiser les états quand la modale se ferme (seulement si pas en mode édition)
  useEffect(() => {
    if (!show && !isEditMode) {
      setArticles([
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

  // Mettre à jour un article
  const updateArticle = useCallback((id: string, field: keyof ArticleItem, value: any) => {
    setArticles(prev => prev.map(article => {
      if (article.id === id) {
        const updatedArticle = { ...article, [field]: value };
        
        // Recalculer le prix payé si prix unitaire ou quantité change
        if (field === 'prixUnitaire' || field === 'quantite') {
          updatedArticle.prixPaye = calculatePrixPaye(
            field === 'prixUnitaire' ? value : updatedArticle.prixUnitaire,
            field === 'quantite' ? value : updatedArticle.quantite
          );
        }
        
        return updatedArticle;
      }
      return article;
    }));
  }, [calculatePrixPaye]);

  // Ajouter un nouvel article
  const addArticle = useCallback(() => {
    const newId = (articles.length + 1).toString();
    const newArticle: ArticleItem = {
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
    setArticles(prev => [...prev, newArticle]);
  }, [articles.length]);

  // Supprimer un article
  const removeArticle = useCallback((id: string) => {
    if (articles.length > 1) {
      setArticles(prev => prev.filter(article => article.id !== id));
    }
  }, [articles.length]);

  // Gestion de l'upload d'image
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>, articleId: string) => {
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

      updateArticle(articleId, 'imageFile', file);
      updateArticle(articleId, 'image', URL.createObjectURL(file));
    }
  }, [onAlert, updateArticle]);

  // Gestion du drag & drop d'image
  const handleImageDrop = useCallback((event: React.DragEvent<HTMLDivElement>, articleId: string) => {
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

      updateArticle(articleId, 'imageFile', file);
      updateArticle(articleId, 'image', URL.createObjectURL(file));
    }
  }, [onAlert, updateArticle]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // Supprimer une image
  const removeImage = useCallback((articleId: string) => {
    updateArticle(articleId, 'imageFile', null);
    updateArticle(articleId, 'image', '');
  }, [updateArticle]);

  // Sauvegarder les achats
  const handleSavePurchases = useCallback(async () => {
    try {
      // Validation des champs obligatoires
      if (!fournisseur.nom.trim()) {
        onAlert('danger', 'Le nom du fournisseur est obligatoire');
        return;
      }

      const validArticles = articles.filter(article => article.nom.trim());
      if (validArticles.length === 0) {
        onAlert('danger', 'Au moins un article avec un nom est requis');
        return;
      }

      // Vérifier que tous les articles ont les champs requis
      for (const article of validArticles) {
        if (!article.nom.trim()) {
          onAlert('danger', 'Le nom de l\'article est obligatoire pour tous les articles');
          return;
        }
        if (article.prixUnitaire <= 0) {
          onAlert('danger', 'Le prix unitaire doit être supérieur à 0 pour tous les articles');
          return;
        }
        if (article.quantite <= 0) {
          onAlert('danger', 'La quantité doit être supérieure à 0 pour tous les articles');
          return;
        }
      }

      // Préparer les données pour Firebase
      const achatData = {
        referenceAchat: referenceAchat,
        fournisseur: {
          nom: fournisseur.nom.trim(),
          telephone: fournisseur.telephone.trim(),
          email: fournisseur.email.trim(),
          ville: fournisseur.ville.trim()
        },
        articles: validArticles.map(article => ({
          nom: article.nom.trim(),
          description: article.description.trim(),
          image: article.image, // URL temporaire pour l'aperçu
          imageFile: article.imageFile, // Fichier à uploader
          referenceFournisseur: article.referenceFournisseur.trim(),
          prixUnitaire: article.prixUnitaire,
          quantite: article.quantite,
          prixPaye: article.prixPaye
        })),
        dateAchat: new Date(),
        dateCommande: isNaN(dateCommande.getTime()) ? new Date() : dateCommande,
        dateLivraison: isNaN(dateLivraison.getTime()) ? new Date() : dateLivraison,
        etat: etat, // Utiliser la valeur actuelle de l'état
        totalAchat: validArticles.reduce((sum, article) => sum + article.prixPaye, 0),
        createdAt: Timestamp.now()
      };

      console.log('Données à sauvegarder:', achatData);
      console.log('🔍 État actuel avant sauvegarde:', etat);
      console.log('🔍 État dans achatData:', achatData.etat);
      console.log('🔍 Type de etat:', typeof etat);
      console.log('🔍 Valeur exacte de etat:', JSON.stringify(etat));

      if (isEditMode && initialAchat) {
        // Mode édition : mettre à jour l'achat existant
        console.log('🔄 Mise à jour de l\'achat:', initialAchat.id);
        await AchatService.updateAchatArticle(initialAchat.id, achatData);
        console.log('✅ Mise à jour terminée, affichage de l\'alerte...');
        onAlert('success', `Achat modifié avec succès ! Total: ${achatData.totalAchat.toFixed(2)} DH`);
      } else {
        // Mode création : créer un nouvel achat
        console.log('🆕 Création d\'un nouvel achat');
        await AchatService.createAchatArticle(achatData);
        console.log('✅ Création terminée, affichage de l\'alerte...');
        onAlert('success', `Achat enregistré avec succès ! Total: ${achatData.totalAchat.toFixed(2)} DH`);
      }
      
      console.log('🔄 Appel de onArticleAdded...');
      onArticleAdded();
      console.log('🔄 Appel de onHide...');
      onHide();
      console.log('🎉 Fonction handleSavePurchases terminée avec succès');

    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'achat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement de l\'achat';
      onAlert('danger', errorMessage);
    }
  }, [articles, fournisseur, onAlert, onArticleAdded, onHide, referenceAchat, isEditMode, initialAchat, dateCommande, dateLivraison, etat]);

  return (
    <Modal 
      show={show} 
      onHide={onHide}
      size="xl"
    >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className={`bi ${isEditMode ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`}></i>
            {isEditMode ? 'Modifier l\'Achat d\'Articles' : 'Nouvel Article Acheté'}
          </Modal.Title>
        </Modal.Header>
      <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <Form>
          {/* Référence d'Achat */}
          {referenceAchat && (
            <div className="mb-4">
              <Card className="bg-primary text-white">
                <Card.Body className="py-3">
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

          {/* Section 1: Informations Article */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-bag me-2"></i>
              Section 1: Informations Article
            </h5>
            
            {articles.map((article, index) => (
              <Card key={article.id} className="mb-3">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    <i className="bi bi-bag me-2"></i>
                    Article {index + 1}
                  </h6>
                  {articles.length > 1 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeArticle(article.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  )}
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nom de l'article *</Form.Label>
                        <Form.Control
                          type="text"
                          value={article.nom}
                          onChange={(e) => updateArticle(article.id, 'nom', e.target.value)}
                          placeholder="Ex: T-shirt blanc"
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={article.description}
                          onChange={(e) => updateArticle(article.id, 'description', e.target.value)}
                          placeholder="Description de l'article..."
                        />
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Image de l'article</Form.Label>
                        <div
                          className="image-upload-zone"
                          onDrop={(e) => handleImageDrop(e, article.id)}
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
                          {article.image ? (
                            <div className="text-center">
                              <img 
                                src={article.image} 
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
                                  onClick={() => removeImage(article.id)}
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
                                onChange={(e) => handleImageUpload(e as React.ChangeEvent<HTMLInputElement>, article.id)}
                                style={{ display: 'none' }}
                                id={`image-upload-${article.id}`}
                              />
                              <Form.Label 
                                htmlFor={`image-upload-${article.id}`}
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
                          value={article.referenceFournisseur}
                          onChange={(e) => updateArticle(article.id, 'referenceFournisseur', e.target.value)}
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
                          value={article.prixUnitaire}
                          onChange={(e) => updateArticle(article.id, 'prixUnitaire', parseFloat(e.target.value) || 0)}
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
                          value={article.quantite}
                          onChange={(e) => updateArticle(article.id, 'quantite', parseInt(e.target.value) || 1)}
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
                          value={article.prixPaye}
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
                onClick={addArticle}
                className="mb-3"
              >
                <i className="bi bi-plus-circle me-2"></i>
                Ajouter un autre article
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
            <Card className="bg-light">
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <p><strong>Nombre d'articles:</strong> {articles.filter(a => a.nom.trim()).length}</p>
                    <p><strong>Fournisseur:</strong> {fournisseur.nom || 'Non renseigné'}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Total à payer:</strong> 
                      <Badge bg="success" className="ms-2">
                        {articles.reduce((sum, article) => sum + article.prixPaye, 0).toFixed(2)} DH
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
          disabled={!fournisseur.nom.trim() || articles.filter(a => a.nom.trim()).length === 0}
        >
          <i className="bi bi-check-circle me-2"></i>
          {isEditMode ? 'Mettre à jour l\'Achat' : 'Enregistrer l\'Achat'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddArticleModal;


