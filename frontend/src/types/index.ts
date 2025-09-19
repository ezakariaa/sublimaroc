export interface Product {
  id: string;
  nom: string;
  description: string;
  prix: number;
  image: string;
  categorie: string;
  type: string[];
  anse: string[];
  dimensions: string[];
  couleurs: string[];
  materiau: string[];
  capacite: string[];
  poids: string[];
  stock: number;
  fournisseur: {
    nom: string;
    ville: string;
  };
  dateCreation: Date;
  dateModification: Date;
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




