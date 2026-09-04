/**
 * SUBLIMAROC - Saisie et modification d'une vente
 *
 * Écrit dans la collection Firestore « Ventes ». Les lignes peuvent être
 * choisies dans le catalogue (le prix et la désignation sont alors pré-remplis)
 * ou saisies librement. La désignation est figée à l'enregistrement : renommer
 * un produit plus tard ne doit pas réécrire les factures déjà émises.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Card, Badge } from 'react-bootstrap';
import {
  SubProduct,
  CatalogueArticle,
  Vente,
  VenteClient,
  VenteLigne,
  VenteSourceType,
  VenteStatut,
  VentePaiement,
} from '../../types';
import {
  VenteService,
  imageToDataUrl,
  FIRESTORE_IMAGE_ITEM_BUDGET,
  FIRESTORE_IMAGE_TOTAL_BUDGET,
} from '../../services/apiService';
import CustomSelect from '../CustomSelect';

interface LigneSaisie extends VenteLigne {
  /** Identifiant local de la ligne dans le formulaire. */
  ligneId: string;
  /** Fichier choisi, converti en base64 seulement à l'enregistrement. */
  imageFile: File | null;
}

interface AddVenteModalProps {
  show: boolean;
  onHide: () => void;
  onVenteSaved: () => void;
  onAlert: (type: 'success' | 'danger', message: string) => void;
  /** Sous-produits sélectionnables dans une ligne de vente. */
  subProducts: SubProduct[];
  /** Articles sélectionnables dans une ligne de vente. */
  articles: CatalogueArticle[];
  initialVente?: Vente | null;
  isEditMode?: boolean;
}

const EMPTY_CLIENT: VenteClient = {
  nom: '',
  telephone: '',
  email: '',
  adresse: '',
  ville: '',
};

const emptyLigne = (index: number): LigneSaisie => ({
  ligneId: String(index),
  image: '',
  imageFile: null,
  sourceType: undefined,
  sourceId: '',
  designation: '',
  quantite: 1,
  prixUnitaire: 0,
  total: 0,
});

const AddVenteModal: React.FC<AddVenteModalProps> = ({
  show,
  onHide,
  onVenteSaved,
  onAlert,
  subProducts,
  articles,
  initialVente,
  isEditMode = false,
}) => {
  const [client, setClient] = useState<VenteClient>(EMPTY_CLIENT);
  const [lignes, setLignes] = useState<LigneSaisie[]>([emptyLigne(1)]);
  const [statut, setStatut] = useState<VenteStatut>('pending');
  const [paiement, setPaiement] = useState<VentePaiement>('impaye');
  const [dateVente, setDateVente] = useState<Date>(new Date());
  const [referenceVente, setReferenceVente] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const generateReference = useCallback(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `SUB-VTE-${day}${month}${year}-${random}`;
  }, []);

  // Pré-remplissage en édition, réinitialisation en création
  useEffect(() => {
    if (!show) return;

    if (isEditMode && initialVente) {
      setClient({ ...EMPTY_CLIENT, ...initialVente.client });
      setLignes(
        (initialVente.produits || []).map((ligne, index) => ({
          ...ligne,
          ligneId: String(index + 1),
          imageFile: null,
        }))
      );
      setStatut(initialVente.statut || 'pending');
      setPaiement(initialVente.paiement || 'impaye');
      const date = initialVente.dateVente ? new Date(initialVente.dateVente) : new Date();
      setDateVente(isNaN(date.getTime()) ? new Date() : date);
      setReferenceVente(initialVente.referenceVente || generateReference());
      setNotes(initialVente.notes || '');
    } else {
      setClient(EMPTY_CLIENT);
      setLignes([emptyLigne(1)]);
      setStatut('pending');
      setPaiement('impaye');
      setDateVente(new Date());
      setReferenceVente(generateReference());
      setNotes('');
    }
  }, [show, isEditMode, initialVente, generateReference]);

  const updateLigne = useCallback((ligneId: string, field: keyof VenteLigne, value: any) => {
    setLignes((prev) =>
      prev.map((ligne) => {
        if (ligne.ligneId !== ligneId) return ligne;

        const updated = { ...ligne, [field]: value };

        // Changer de type vide la sélection : les identifiants des deux
        // collections ne sont pas interchangeables.
        if (field === 'sourceType') {
          updated.sourceId = '';
        }

        // Choisir un enregistrement remplit la désignation et le prix.
        // La désignation reste ensuite modifiable : elle est figée à la vente.
        if (field === 'sourceId' && value) {
          if (updated.sourceType === 'sousproduit') {
            const subProduct = subProducts.find((sp) => sp.id === value);
            if (subProduct) {
              updated.designation = subProduct.nom;
              updated.prixUnitaire = subProduct.prix || 0;
            }
          } else if (updated.sourceType === 'article') {
            const article = articles.find((a) => a.id === value);
            if (article) {
              updated.designation = article.nom;
              updated.prixUnitaire = article.prixUnitaire || 0;
            }
          }
        }

        updated.total = (updated.prixUnitaire || 0) * (updated.quantite || 0);
        return updated;
      })
    );
  }, [subProducts, articles]);

  /** Aperçu local immédiat ; la conversion en base64 attend l'enregistrement. */
  const handleImageSelected = useCallback(
    (ligneId: string, event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        onAlert('danger', 'Choisissez un fichier image (JPG, PNG ou WEBP).');
        return;
      }

      setLignes((prev) =>
        prev.map((ligne) =>
          ligne.ligneId === ligneId
            ? { ...ligne, imageFile: file, image: URL.createObjectURL(file) }
            : ligne
        )
      );
    },
    [onAlert]
  );

  const removeImage = useCallback((ligneId: string) => {
    setLignes((prev) =>
      prev.map((ligne) =>
        ligne.ligneId === ligneId ? { ...ligne, imageFile: null, image: '' } : ligne
      )
    );
  }, []);

  const addLigne = useCallback(() => {
    setLignes((prev) => [...prev, emptyLigne(prev.length + 1)]);
  }, []);

  const removeLigne = useCallback((ligneId: string) => {
    setLignes((prev) => (prev.length > 1 ? prev.filter((l) => l.ligneId !== ligneId) : prev));
  }, []);

  const total = lignes.reduce((sum, ligne) => sum + (ligne.total || 0), 0);

  const handleSave = useCallback(async () => {
    if (!client.nom.trim()) {
      onAlert('danger', 'Le nom du client est obligatoire');
      return;
    }

    const lignesValides = lignes.filter((l) => l.designation.trim());
    if (lignesValides.length === 0) {
      onAlert('danger', 'Au moins une vente avec une désignation est requise');
      return;
    }
    for (const ligne of lignesValides) {
      if (ligne.quantite <= 0) {
        onAlert('danger', `La quantité doit être supérieure à 0 (${ligne.designation})`);
        return;
      }
      if (ligne.prixUnitaire <= 0) {
        onAlert('danger', `Le prix unitaire doit être supérieur à 0 (${ligne.designation})`);
        return;
      }
    }

    // Les images sont converties ici seulement : une conversion à chaque
    // frappe aurait été inutilement coûteuse.
    const imagesParLigne: Record<string, string> = {};
    for (const ligne of lignesValides) {
      if (ligne.imageFile) {
      imagesParLigne[ligne.ligneId] = await imageToDataUrl(
        ligne.imageFile,
        FIRESTORE_IMAGE_ITEM_BUDGET
      );
      } else if (ligne.image && !ligne.image.startsWith('blob:')) {
      // Image déjà enregistrée, conservée telle quelle
      imagesParLigne[ligne.ligneId] = ligne.image;
      }
    }

    // Firestore plafonne un document à 1 Mio : vérifier avant d'écrire.
    const poidsImages = Object.values(imagesParLigne).reduce(
      (sum, url) => sum + url.length,
      0
    );
    if (poidsImages > FIRESTORE_IMAGE_TOTAL_BUDGET) {
      onAlert(
      'danger',
      `Les images pèsent ${Math.round(poidsImages / 1024)} Ko au total, pour ` +
      `${Math.round(FIRESTORE_IMAGE_TOTAL_BUDGET / 1024)} Ko autorisés dans un document Firestore. ` +
      `Retirez une image ou choisissez des fichiers plus légers.`
      );
      setSaving(false);
      return;
    }

    const venteData = {
      referenceVente,
      client: {
        nom: client.nom.trim(),
        telephone: client.telephone.trim(),
        email: client.email.trim(),
        adresse: client.adresse.trim(),
        ville: client.ville.trim(),
      },
      // Firestore rejette toute valeur `undefined` : les champs d'origine ne
      // sont posés que pour une ligne réellement liée à un enregistrement.
      produits: lignesValides.map((ligne) => {
        const base = {
          designation: ligne.designation.trim(),
          quantite: ligne.quantite,
          prixUnitaire: ligne.prixUnitaire,
          total: ligne.prixUnitaire * ligne.quantite,
        };
        const image = imagesParLigne[ligne.ligneId];
        const avecImage = image ? { ...base, image } : base;

        return ligne.sourceType && ligne.sourceId
          ? { ...avecImage, sourceType: ligne.sourceType, sourceId: ligne.sourceId }
          : avecImage;
      }),
      total: lignesValides.reduce((sum, l) => sum + l.prixUnitaire * l.quantite, 0),
      statut,
      paiement,
      dateVente: isNaN(dateVente.getTime()) ? new Date() : dateVente,
      notes: notes.trim(),
    };

    setSaving(true);
    try {

      if (isEditMode && initialVente) {
        await VenteService.updateVente(initialVente.id, venteData);
        onAlert('success', `Vente modifiée ! Total : ${venteData.total.toFixed(2)} DH`);
      } else {
        await VenteService.createVente(venteData);
        onAlert('success', `Vente enregistrée ! Total : ${venteData.total.toFixed(2)} DH`);
      }
      onVenteSaved();
      onHide();
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement de la vente:', error);
      onAlert('danger', (error as Error)?.message || 'Erreur lors de l\'enregistrement de la vente');
    } finally {
      setSaving(false);
    }
  }, [client, lignes, referenceVente, statut, paiement, dateVente, notes, isEditMode, initialVente, onAlert, onVenteSaved, onHide]);

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className={`bi ${isEditMode ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`}></i>
          {isEditMode ? 'Modifier la Vente' : 'Nouvelle Vente'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto', padding: '1.5rem' }}>
        <Form>
          {referenceVente && (
            <Card className="bg-primary text-white mb-4">
              <Card.Body className="py-3">
                <div className="d-flex align-items-center">
                  <i className="bi bi-receipt me-2" style={{ fontSize: '1.2rem' }}></i>
                  <div>
                    <h6 className="mb-1">Référence de Vente</h6>
                    <h4 className="mb-0 font-monospace">{referenceVente}</h4>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Section 1 : Client */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-person me-2"></i>
              Section 1: Informations Client
            </h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nom du client *</Form.Label>
                  <Form.Control
                    type="text"
                    value={client.nom}
                    onChange={(e) => setClient((prev) => ({ ...prev, nom: e.target.value }))}
                    placeholder="Ex: Société ABC"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Téléphone</Form.Label>
                  <Form.Control
                    type="tel"
                    value={client.telephone}
                    onChange={(e) => setClient((prev) => ({ ...prev, telephone: e.target.value }))}
                    placeholder="Ex: +212 6 12 34 56 78"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={client.email}
                    onChange={(e) => setClient((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Ex: contact@client.com"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Adresse</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={client.adresse}
                    onChange={(e) => setClient((prev) => ({ ...prev, adresse: e.target.value }))}
                    placeholder="Adresse de facturation"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Ville</Form.Label>
                  <Form.Control
                    type="text"
                    value={client.ville}
                    onChange={(e) => setClient((prev) => ({ ...prev, ville: e.target.value }))}
                    placeholder="Ex: Casablanca"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Section 2 : Lignes vendues */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-cart me-2"></i>
              Section 2: Produits Vendus
            </h5>

            {lignes.map((ligne, index) => (
              <Card key={ligne.ligneId} className="mb-3">
                <Card.Header
                  className="d-flex justify-content-between align-items-center"
                  style={{ backgroundColor: '#424272', color: '#ffffff' }}
                >
                  <h6 className="mb-0" style={{ color: '#ffffff' }}>
                    <i className="bi bi-box-seam me-2"></i>
                    Vente {index + 1}
                  </h6>
                  {lignes.length > 1 && (
                    <Button variant="outline-danger" size="sm" onClick={() => removeLigne(ligne.ligneId)}>
                      <i className="bi bi-trash"></i>
                    </Button>
                  )}
                </Card.Header>
                <Card.Body style={{ padding: '1.25rem' }}>
                  <Row>
                    <Col md={2}>
                      <Form.Group className="mb-3">
                        <Form.Label>Type</Form.Label>
                        <CustomSelect
                          value={ligne.sourceType || ''}
                          onChange={(e) =>
                            updateLigne(
                              ligne.ligneId,
                              'sourceType',
                              (e.target.value || undefined) as VenteSourceType | undefined
                            )
                          }
                        >
                          <option value="">Saisie libre</option>
                          <option value="sousproduit">Produit</option>
                          <option value="article">Article</option>
                        </CustomSelect>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          {ligne.sourceType === 'article'
                            ? 'Article'
                            : ligne.sourceType === 'sousproduit'
                            ? 'Produit'
                            : 'Enregistrement'}
                        </Form.Label>
                        <CustomSelect
                          value={ligne.sourceId || ''}
                          onChange={(e) => updateLigne(ligne.ligneId, 'sourceId', e.target.value)}
                          disabled={!ligne.sourceType}
                        >
                          <option value="">
                            {ligne.sourceType ? 'Sélectionner…' : 'Choisissez un type'}
                          </option>
                          {ligne.sourceType === 'sousproduit' &&
                            subProducts.map((subProduct) => (
                              <option key={subProduct.id} value={subProduct.id}>
                                {subProduct.nom}
                                {subProduct.prix ? ` — ${subProduct.prix} DH` : ''}
                              </option>
                            ))}
                          {ligne.sourceType === 'article' &&
                            articles.map((article) => (
                              <option key={article.id} value={article.id}>
                                {article.nom}
                                {article.prixUnitaire ? ` — ${article.prixUnitaire} DH` : ''}
                              </option>
                            ))}
                        </CustomSelect>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Désignation *</Form.Label>
                        <Form.Control
                          type="text"
                          value={ligne.designation}
                          onChange={(e) => updateLigne(ligne.ligneId, 'designation', e.target.value)}
                          placeholder="Ex: Mug personnalisé"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Row>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Qté *</Form.Label>
                            <Form.Control
                              type="number"
                              min="1"
                              value={ligne.quantite}
                              onChange={(e) =>
                                updateLigne(ligne.ligneId, 'quantite', parseInt(e.target.value) || 1)
                              }
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>P.U. (DH) *</Form.Label>
                            <Form.Control
                              type="number"
                              min="0"
                              step="0.01"
                              value={ligne.prixUnitaire}
                              onChange={(e) =>
                                updateLigne(ligne.ligneId, 'prixUnitaire', parseFloat(e.target.value) || 0)
                              }
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group className="mb-3">
                            <Form.Label>Total</Form.Label>
                            <Form.Control type="number" value={ligne.total} readOnly className="bg-light" />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Col>
                  </Row>

                  {/* Image de la vente */}
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-0">
                        <Form.Label>Image</Form.Label>
                        <div className="d-flex align-items-center gap-3">
                          {ligne.image ? (
                            <img
                              src={ligne.image}
                              alt={ligne.designation || `Vente ${index + 1}`}
                              className="vente-ligne-thumb"
                            />
                          ) : (
                            <div className="vente-ligne-thumb vente-ligne-thumb-empty">
                              <i className="bi bi-image"></i>
                            </div>
                          )}

                          <div className="d-flex gap-2">
                            <Form.Control
                              type="file"
                              accept="image/*"
                              id={`vente-image-${ligne.ligneId}`}
                              style={{ display: 'none' }}
                              onChange={(e) =>
                                handleImageSelected(
                                  ligne.ligneId,
                                  e as React.ChangeEvent<HTMLInputElement>
                                )
                              }
                            />
                            <Form.Label
                              htmlFor={`vente-image-${ligne.ligneId}`}
                              className="btn btn-outline-primary btn-sm mb-0"
                            >
                              <i className="bi bi-upload me-1"></i>
                              {ligne.image ? 'Changer' : 'Choisir une image'}
                            </Form.Label>

                            {ligne.image && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => removeImage(ligne.ligneId)}
                              >
                                <i className="bi bi-trash me-1"></i>
                                Retirer
                              </Button>
                            )}
                          </div>
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}

            <div className="text-center">
              <Button variant="outline-primary" onClick={addLigne} className="mb-3">
                <i className="bi bi-plus-circle me-2"></i>
                Ajouter une vente
              </Button>
            </div>
          </div>

          {/* Section 3 : Statut et date */}
          <div className="mb-4">
            <h5 className="text-primary mb-3">
              <i className="bi bi-calendar-event me-2"></i>
              Section 3 : Statut, Paiement et Date
            </h5>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Date de vente *</Form.Label>
                  <Form.Control
                    type="date"
                    value={
                      dateVente && !isNaN(dateVente.getTime())
                        ? dateVente.toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) => setDateVente(new Date(e.target.value))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Statut *</Form.Label>
                  <CustomSelect
                    value={statut}
                    onChange={(e) => setStatut(e.target.value as VenteStatut)}
                    required
                  >
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmée</option>
                    <option value="shipped">Expédiée</option>
                    <option value="delivered">Livrée</option>
                    <option value="cancelled">Annulée</option>
                  </CustomSelect>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Paiement *</Form.Label>
                  <CustomSelect
                    value={paiement}
                    onChange={(e) => setPaiement(e.target.value as VentePaiement)}
                    required
                  >
                    <option value="impaye">Impayé</option>
                    <option value="paye">Payé</option>
                  </CustomSelect>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Notes (visibles sur la facture)</Form.Label>
                  <Form.Control
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Paiement à 30 jours"
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          {/* Résumé */}
          <div className="mb-2">
            <h5 className="text-success mb-3">
              <i className="bi bi-calculator me-2"></i>
              Résumé
            </h5>
            <Card className="bg-light">
              <Card.Body style={{ padding: '1.25rem' }}>
                <Row>
                  <Col md={6}>
                    <p className="mb-1"><strong>Client :</strong> {client.nom || 'Non renseigné'}</p>
                    <p className="mb-0"><strong>Ventes :</strong> {lignes.filter((l) => l.designation.trim()).length}</p>
                  </Col>
                  <Col md={6}>
                    <p className="mb-0">
                      <strong>Total :</strong>
                      <Badge bg="success" className="ms-2">{total.toFixed(2)} DH</Badge>
                    </p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </div>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>
          <i className="bi bi-x-circle me-2"></i>
          Annuler
        </Button>
        <Button
          variant="success"
          onClick={handleSave}
          disabled={saving || !client.nom.trim() || lignes.filter((l) => l.designation.trim()).length === 0}
        >
          <i className="bi bi-check-circle me-2"></i>
          {saving ? 'Enregistrement…' : isEditMode ? 'Mettre à jour la Vente' : 'Enregistrer la Vente'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddVenteModal;
