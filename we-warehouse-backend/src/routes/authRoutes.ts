/**
 * Auth Routes
 * Login, user info, password management
 */
import { Router } from 'express';
import { AuthController, extractUser, requireAuth, AVAILABLE_PAGES } from '../controllers/authController.js';

const router = Router();

// Public: Login
router.post('/login', AuthController.login);

// Protected: Get current user info
router.get('/me', extractUser, requireAuth, AuthController.getMe);

// Protected: Change password
router.post('/change-password', extractUser, requireAuth, AuthController.changePassword);

// Public: Get available pages for admin UI
router.get('/pages', (_req, res) => {
    res.json(AVAILABLE_PAGES);
});

export default router;
