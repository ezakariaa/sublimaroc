import { Request, Response } from 'express';
import { SubProductService } from '../services/firebaseService';
import { ApiResponse, SubProduct } from '../types';

export class SubProductController {
  // Récupérer les sous-produits d'un produit
  static async getSubProductsByProductId(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'ID du produit requis'
        };
        res.status(400).json(response);
        return;
      }

      const subProducts = await SubProductService.getSubProductsByProductId(productId);
      
      const response: ApiResponse<SubProduct[]> = {
        success: true,
        data: subProducts,
        message: `${subProducts.length} sous-produit(s) récupéré(s) avec succès`
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

  // Créer un nouveau sous-produit
  static async createSubProduct(req: Request, res: Response): Promise<void> {
    try {
      const subProductData = req.body;
      
      // Validation basique
      if (!subProductData.nom || !subProductData.productId) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Nom et ID du produit sont requis'
        };
        res.status(400).json(response);
        return;
      }

      const subProductId = await SubProductService.createSubProduct(subProductData);
      
      const response: ApiResponse<{ id: string }> = {
        success: true,
        data: { id: subProductId },
        message: 'Sous-produit créé avec succès'
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

  // Mettre à jour un sous-produit
  static async updateSubProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'ID du sous-produit requis'
        };
        res.status(400).json(response);
        return;
      }

      await SubProductService.updateSubProduct(id, updateData);
      
      const response: ApiResponse<null> = {
        success: true,
        message: 'Sous-produit mis à jour avec succès'
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

  // Supprimer un sous-produit
  static async deleteSubProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'ID du sous-produit requis'
        };
        res.status(400).json(response);
        return;
      }

      await SubProductService.deleteSubProduct(id);
      
      const response: ApiResponse<null> = {
        success: true,
        message: 'Sous-produit supprimé avec succès'
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




