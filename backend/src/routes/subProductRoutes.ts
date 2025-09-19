import { Router } from 'express';
import { SubProductController } from '../controllers/subProductController';

const router = Router();

// Routes pour les sous-produits
router.get('/product/:productId', SubProductController.getSubProductsByProductId);
router.post('/', SubProductController.createSubProduct);
router.put('/:id', SubProductController.updateSubProduct);
router.delete('/:id', SubProductController.deleteSubProduct);

export { router as subProductRoutes };




