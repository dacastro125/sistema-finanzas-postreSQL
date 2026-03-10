import { Router } from 'express';
import { getAccounts, createAccount, deleteAccount, updateAccount } from '../controllers/accountController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas de cuentas requieren autenticación
router.use(authMiddleware);

router.get('/', getAccounts);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;
