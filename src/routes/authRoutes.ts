import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { UserModel } from '../models/User';

const router = Router();

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   GET api/auth/me
// @desc    Get current user data
// @access  Private
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email
        });
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

export default router;
