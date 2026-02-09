/**
 * Admin Routes
 * Users, Roles, Departments management (protected by requireRole)
 */
import { Router } from 'express';
import { PermissionController } from '../controllers/permissionController.js';
import { extractUser, requireAuth, requireRole } from '../controllers/authController.js';

const router = Router();

// Apply auth middleware to all admin routes
router.use(extractUser, requireAuth);

// ============== Users ==============
router.get('/users', requireRole('super_admin', 'manager'), PermissionController.listUsers);
router.post('/users', requireRole('super_admin'), PermissionController.createUser);
router.put('/users/:id', requireRole('super_admin'), PermissionController.updateUser);
router.delete('/users/:id', requireRole('super_admin'), PermissionController.deleteUser);
router.post('/users/:id/roles', requireRole('super_admin'), PermissionController.assignRoles);
router.put('/users/:id/reset-password', requireRole('super_admin'), PermissionController.resetPassword);

// ============== Roles ==============
router.get('/roles', requireRole('super_admin', 'manager'), PermissionController.listRoles);
router.post('/roles', requireRole('super_admin'), PermissionController.createRole);
router.put('/roles/:id', requireRole('super_admin'), PermissionController.updateRole);
router.delete('/roles/:id', requireRole('super_admin'), PermissionController.deleteRole);

// ============== Departments ==============
router.get('/departments', requireRole('super_admin', 'manager'), PermissionController.listDepartments);
router.post('/departments', requireRole('super_admin'), PermissionController.createDepartment);
router.put('/departments/:id', requireRole('super_admin'), PermissionController.updateDepartment);
router.delete('/departments/:id', requireRole('super_admin'), PermissionController.deleteDepartment);

export default router;
