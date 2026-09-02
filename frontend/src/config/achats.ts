/**
 * SUBLIMAROC - Variantes de la page d'achats
 *
 * Les matériels et les consommables se saisissent exactement de la même façon :
 * une seule page (`pages/Achats.tsx`) et une seule modale
 * (`components/modals/AddMaterialModal.tsx`) servent les deux, paramétrées par
 * la variante décrite ici. Seuls changent la collection Firestore ciblée,
 * le dossier des images, le préfixe des références et les libellés.
 */

import {
  AchatService,
  ConsommableService,
  AutreDepenseService,
} from '../services/apiService';

export type AchatVariant = 'materiel' | 'consommable' | 'autredepense';

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
    pageTitle: "Gestion d'Achat Matériel",
    pageSubtitle: "Gérez vos commandes et achats de matériel auprès des fournisseurs",
    statTotalLabel: 'Matériel Acheté',
    listTitle: 'Liste du Matériel Acheté',
    emptyTitle: 'Aucun article trouvé',
    loadingLabel: 'Chargement des articles...',
    badgeLabel: 'Matériel',
    referencePrefix: 'SUB-ACH',
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
    getAll: () => ConsommableService.getAllConsommables(),
    create: (data) => ConsommableService.createConsommable(data),
    update: (id, data) => ConsommableService.updateConsommable(id, data),
    remove: (id) => ConsommableService.deleteConsommable(id),
  },

  autredepense: {
    key: 'autredepense',
    singular: 'Dépense',
    singularLower: 'dépense',
    plural: 'Dépenses',
    pluralLower: 'dépenses',
    pageTitle: 'Gestion des Autres Dépenses',
    pageSubtitle:
      'Loyer, électricité, internet, produits d\'entretien… toute dépense hors matériels, consommables et articles',
    statTotalLabel: 'Dépenses Enregistrées',
    listTitle: 'Liste des Autres Dépenses',
    emptyTitle: 'Aucune dépense trouvée',
    loadingLabel: 'Chargement des dépenses...',
    badgeLabel: 'Dépense',
    referencePrefix: 'SUB-DEP',
    getAll: () => AutreDepenseService.getAllAutresDepenses(),
    create: (data) => AutreDepenseService.createAutreDepense(data),
    update: (id, data) => AutreDepenseService.updateAutreDepense(id, data),
    remove: (id) => AutreDepenseService.deleteAutreDepense(id),
  },
};

/** Personnes pouvant être enregistrées comme acheteur d'un achat. */
export const ACHETEURS = ['Zakaria', 'Hamza'];

/**
 * Compte Firebase de chaque acheteur, pour afficher sa photo de profil.
 *
 * La valeur stockée dans un achat reste le prénom : ce lien ne sert qu'à
 * l'affichage, et un acheteur sans compte garde simplement son icône.
 */
export const ACHETEUR_COMPTES: Record<string, string> = {
  Zakaria: 'amqAHrpeXJNj9RZz1NCm7todNWE3', // elo.zakaria@gmail.com
  Hamza: 'aSFfk1Uu1JQkR0lydbAK6l9nbUt1', // rchiad.med.hamza@gmail.com
};
