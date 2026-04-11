import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { aiController } from '../controllers/aiController';

const router = Router();

router.post('/chat', authMiddleware as any, aiController.chat);

export default router;
