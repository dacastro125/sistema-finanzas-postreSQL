import { Router } from 'express';
import { getCredits, createCredit, payCreditInstallment, deleteCredit } from '../controllers/creditController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getCredits);
router.post('/', createCredit);
router.put('/:id/pay', payCreditInstallment);
router.delete('/:id', deleteCredit);

export default router;
