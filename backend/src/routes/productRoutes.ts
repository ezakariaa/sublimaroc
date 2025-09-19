import { Router } from 'express';
import { ProductController } from '../controllers/productController';

const router = Router();

// Routes pour les produits
router.get('/', ProductController.getAllProducts);
router.get('/:id', ProductController.getProductById);
router.post('/', ProductController.createProduct);
router.put('/:id', ProductController.updateProduct);
router.delete('/:id', ProductController.deleteProduct);

export { router as productRoutes };




