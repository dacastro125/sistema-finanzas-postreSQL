import { Router } from 'express';
import { getBudgetsWithProgress, upsertBudget, deleteBudget } from '../controllers/budgetController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getBudgetsWithProgress);
router.post('/', upsertBudget);
router.delete('/:id', deleteBudget);

export default router;
