export interface Product {
  id: string;
  nom: string;
  description: string;
  prix: number;
  image: string; // Image principale (pour compatibilité)
  images: string[]; // Tableau d'images multiples
  categorie: string;
  type?: string[];
  anse?: string[];
  dimensions?: string[];
  couleurs?: string[];
  materiau?: string[];
  capacite?: string[];
  poids?: string[];
  qualite?: string[];
  manches?: string[];
  col?: string[];
  stock: number;
  fournisseur: {
    nom: string;
    ville: string;
  };
  dateCreation: Date;
  dateModification: Date;
  [key: string]: any; // Permet les caractéristiques personnalisées dynamiques
}

export interface Variation {
  id: string;
  characteristics: {
    type?: string;
    anse?: string;
    couleurs?: string;
    dimensions?: string;
    materiau?: string;
    capacite?: string;
    poids?: string;
    qualite?: string;
    manches?: string;
    col?: string;
  };
  prixUnitaire?: number;
  quantite?: number;
  image?: string;
}

export interface SubProduct {
  id: string;
  productId: string;
  nom: string;
  description: string;
  prix: number;
  image: string; // Image principale (pour compatibilité)
  images: string[]; // Tableau d'images multiples
  stock: number;
  // Caractéristiques du sous-produit
  type: string[];
  anse: string[];
  couleurs: string[];
  dimensions: string[];
  materiau: string[];
  capacite: string[];
  poids: string[];
  qualite: string[];
  manches: string[];
  col: string[];
  variations?: Variation[]; // Variations du sous-produit
  dateCreation: Date;
  dateModification: Date;
}

export interface Material {
  id: string;
  nom: string;
  description: string;
  type: string; // Type de matériel (ex: "Encre", "Papier", "Équipement")
  image: string;
  stock: number;
  stockMin: number; // Stock minimum avant alerte
  fournisseur: {
    nom: string;
    ville: string;
    contact: string;
  };
  prixUnitaire: number;
  unite: string; // Unité de mesure (ex: "Litre", "Kg", "Pièce")
  dateCreation: Date;
  dateModification: Date;
}

export interface User {
  id: string;
  email: string;
  nom: string;
  role: 'admin' | 'user';
  dateCreation: Date;
}

export interface Order {
  id: string;
  userId: string;
  products: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  dateCreation: Date;
  dateModification: Date;
}





/** Statuts d'une vente. Les clés restent celles déjà utilisées par la page. */
export type VenteStatut = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

/** État du règlement, indépendant de l'avancement de la commande. */
export type VentePaiement = 'paye' | 'impaye';

/** Client d'une vente, tel qu'il apparaît sur la facture. */
export interface VenteClient {
  nom: string;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
}

/** Nature de l'enregistrement d'où provient une ligne de vente. */
export type VenteSourceType = 'sousproduit' | 'article';

/** Ligne de facture. La désignation est figée à la vente : elle ne doit pas
 *  changer si le sous-produit ou l'article est renommé plus tard. */
export interface VenteLigne {
  /** Image propre à la ligne, en base64 ; absente si non renseignée. */
  image?: string;
  /** Origine de la ligne ; absent pour une saisie libre. */
  sourceType?: VenteSourceType;
  /** Identifiant du sous-produit ou de l'article choisi. */
  sourceId?: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
}

/** Article du catalogue, tel que stocké dans la collection « Articles ». */
export interface CatalogueArticle {
  id: string;
  referenceArticle: string;
  nom: string;
  categorieArticle?: string;
  image?: string;
  prixUnitaire: number;
  quantite?: number;
}

/** Vente enregistrée dans la collection Firestore « Ventes ». */
export interface Vente {
  id: string;
  referenceVente: string;
  client: VenteClient;
  produits: VenteLigne[];
  total: number;
  statut: VenteStatut;
  /** « Impayé » par défaut : une vente non renseignée n'est pas réglée. */
  paiement: VentePaiement;
  dateVente: Date;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}
