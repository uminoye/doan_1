import { Router } from 'express';
import { login, getProfile, getAllUsers, getUserById, createUser, updateUser, deleteUser, getRoles } from '../controllers/authController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Public
router.post('/login', login);

// Protected
router.get('/profile', authenticate, getProfile);
router.get('/users', authenticate, authorize('admin'), getAllUsers);
router.get('/users/:id', authenticate, getUserById);
router.post('/users', authenticate, authorize('admin'), createUser);
router.put('/users/:id', authenticate, authorize('admin'), updateUser);
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
router.get('/roles', authenticate, getRoles);

export default router;
