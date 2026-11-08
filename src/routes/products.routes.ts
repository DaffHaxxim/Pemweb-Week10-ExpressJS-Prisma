import { Router } from 'express';
import {
  createProduct,
  getProductById,
  getProducts,
  updateProduct,
} from '../controllers/products.controller.js';

const router = Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/', updateProduct);

export default router;
