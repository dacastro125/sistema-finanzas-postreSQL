import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getDashboardSummary);

export default router;
