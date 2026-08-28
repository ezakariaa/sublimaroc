/**
 * SUBLIMAROC - Variantes de la page d'achats
 *
 * Les matériels et les consommables se saisissent exactement de la même façon :
 * une seule page (`pages/Achats.tsx`) et une seule modale
 * (`components/modals/AddMaterialModal.tsx`) servent les deux, paramétrées par
 * la variante décrite ici. Seuls changent la collection Firestore ciblée,
 * le dossier des images, le préfixe des références et les libellés.
 */

import { AchatService, ConsommableService } from '../services/apiService';

export type AchatVariant = 'materiel' | 'consommable';

export interface AchatVariantConfig {
  key: AchatVariant;

  // Libellés
  /** « Matériel » / « Consommable » */
  singular: string;
  /** « matériel » / « consommable » */
  singularLower: string;
  /** « Matériels » / « Consommables » */
  plural: string;
  /** « matériels » / « consommables » */
  pluralLower: string;
  pageTitle: string;
  pageSubtitle: string;
  statTotalLabel: string;
  listTitle: string;
  emptyTitle: string;
  loadingLabel: string;
  /** Badge affiché à côté de la référence dans le tableau. */
  badgeLabel: string;

  /** Préfixe des références générées : SUB-ACH-… / SUB-CON-… */
  referencePrefix: string;
  /** Dossier Firebase Storage des images. */
  imageFolder: string;

  // Accès Firestore
  getAll: () => Promise<any[]>;
  create: (data: any) => Promise<string>;
  update: (id: string, data: any) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const ACHAT_VARIANTS: Record<AchatVariant, AchatVariantConfig> = {
  materiel: {
    key: 'materiel',
    singular: 'Matériel',
    singularLower: 'matériel',
    plural: 'Matériels',
    pluralLower: 'matériels',
    pageTitle: 'Gestion des Achats',
    pageSubtitle: "Gérez vos commandes et achats d'articles auprès des fournisseurs",
    statTotalLabel: 'Total Articles',
    listTitle: 'Liste des Articles',
    emptyTitle: 'Aucun article trouvé',
    loadingLabel: 'Chargement des articles...',
    badgeLabel: 'Matériel',
    referencePrefix: 'SUB-ACH',
    imageFolder: 'images/materiels',
    getAll: () => AchatService.getAllAchats(),
    create: (data) => AchatService.createAchat(data),
    update: (id, data) => AchatService.updateAchat(id, data),
    remove: (id) => AchatService.deleteAchat(id),
  },

  consommable: {
    key: 'consommable',
    singular: 'Consommable',
    singularLower: 'consommable',
    plural: 'Consommables',
    pluralLower: 'consommables',
    pageTitle: 'Gestion des Consommables',
    pageSubtitle: 'Gérez vos achats de consommables auprès des fournisseurs',
    statTotalLabel: 'Total Consommables',
    listTitle: 'Liste des Consommables',
    emptyTitle: 'Aucun consommable trouvé',
    loadingLabel: 'Chargement des consommables...',
    badgeLabel: 'Consommable',
    referencePrefix: 'SUB-CON',
    imageFolder: 'images/consommables',
    getAll: () => ConsommableService.getAllConsommables(),
    create: (data) => ConsommableService.createConsommable(data),
    update: (id, data) => ConsommableService.updateConsommable(id, data),
    remove: (id) => ConsommableService.deleteConsommable(id),
  },
};
