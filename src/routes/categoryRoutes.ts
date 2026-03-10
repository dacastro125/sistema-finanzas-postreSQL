import { Router } from 'express';
import { getCategories, createCategory, deleteCategory } from '../controllers/categoryController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas de categorías requieren autenticación
router.use(authMiddleware);

router.get('/', getCategories);
router.post('/', createCategory);
router.delete('/:id', deleteCategory);

export default router;
