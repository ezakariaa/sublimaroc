import { Request, Response } from 'express';
import { ProductService } from '../services/firebaseService';
import { ApiResponse, Product } from '../types';

export class ProductController {
  // Récupérer tous les produits
  static async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const products = await ProductService.getAllProducts();
      
      const response: ApiResponse<Product[]> = {
        success: true,
        data: products,
        message: `${products.length} produit(s) récupéré(s) avec succès`
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
      
      res.status(500).json(response);
    }
  }

  // Récupérer un produit par ID
  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'ID du produit requis'
        };
        res.status(400).json(response);
        return;
      }

      const product = await ProductService.getProductById(id);
      
      if (!product) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Produit non trouvé'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<Product> = {
        success: true,
        data: product,
        message: 'Produit récupéré avec succès'
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
      
      res.status(500).json(response);
    }
  }

  // Créer un nouveau produit
  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const productData = req.body;
      
      // Validation basique
      if (!productData.nom || !productData.prix) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Nom et prix sont requis'
        };
        res.status(400).json(response);
        return;
      }

      const productId = await ProductService.createProduct(productData);
      
      const response: ApiResponse<{ id: string }> = {
        success: true,
        data: { id: productId },
        message: 'Produit créé avec succès'
      };
      
      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
      
      res.status(500).json(response);
    }
  }

  // Mettre à jour un produit
  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'ID du produit requis'
        };
        res.status(400).json(response);
        return;
      }

      await ProductService.updateProduct(id, updateData);
      
      const response: ApiResponse<null> = {
        success: true,
        message: 'Produit mis à jour avec succès'
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
      
      res.status(500).json(response);
    }
  }

  // Supprimer un produit
  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'ID du produit requis'
        };
        res.status(400).json(response);
        return;
      }

      await ProductService.deleteProduct(id);
      
      const response: ApiResponse<null> = {
        success: true,
        message: 'Produit supprimé avec succès'
      };
      
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
      
      res.status(500).json(response);
    }
  }
}




