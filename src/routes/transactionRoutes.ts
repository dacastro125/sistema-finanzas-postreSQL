import { Router } from 'express';
import { getTransactions, createTransaction, deleteTransaction, updateTransaction, bulkCreateTransactions } from '../controllers/transactionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas de transacciones requieren autenticación
router.use(authMiddleware);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);
router.post('/bulk', bulkCreateTransactions);

export default router;
