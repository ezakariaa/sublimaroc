export interface Product {
  id: string;
  nom: string;
  description: string;
  prix: number;
  image: string;
  type: string[];
  anse: string[];
  dimensions: string[];
  couleurs: string[];
  materiau: string[];
  capacite: string[];
  poids: string[];
  stock: number;
  dateCreation: Date;
  dateModification: Date;
}

export interface SubProduct {
  id: string;
  productId: string;
  nom: string;
  description: string;
  prix: number;
  image: string;
  stock: number;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductFilters {
  search?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}




