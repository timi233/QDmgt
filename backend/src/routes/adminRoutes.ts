import { Router } from 'express'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { requireAdmin } from '../middlewares/adminMiddleware.js'
import { sensitiveOperationAudit } from '../middlewares/auditLogger.js'
import {
  getPendingUsers,
  getAllUsers,
  updateUserRole,
  assignUserRole,
  rejectUser,
  deleteUser,
  getLeaderScope,
  updateLeaderScope,
} from '../controllers/adminController.js'

const router = Router()

/**
 * GET /api/admin/users
 * List all users
 * Requires: Admin role
 */
router.get('/users', authenticateToken, requireAdmin, getAllUsers)

/**
 * GET /api/admin/users/pending
 * List users waiting for role assignment
 * Requires: Admin role
 */
router.get('/users/pending', authenticateToken, requireAdmin, getPendingUsers)

/**
 * PUT /api/admin/users/:id/role
 * Update user role (can change existing role)
 * Body: { role: 'sales' | 'leader' | 'admin' | null }
 * Requires: Admin role
 */
router.put('/users/:id/role', authenticateToken, requireAdmin, sensitiveOperationAudit('UPDATE_USER_ROLE'), updateUserRole)

/**
 * POST /api/admin/users/:id/assign-role
 * Assign role to user (only for users without role)
 * Body: { role: 'sales' | 'leader' }
 * Requires: Admin role
 */
router.post('/users/:id/assign-role', authenticateToken, requireAdmin, sensitiveOperationAudit('ASSIGN_USER_ROLE'), assignUserRole)

/**
 * POST /api/admin/users/:id/reject
 * Reject user registration
 * Requires: Admin role
 */
router.post('/users/:id/reject', authenticateToken, requireAdmin, sensitiveOperationAudit('REJECT_USER'), rejectUser)

/**
 * DELETE /api/admin/users/:id
 * Delete user (permanently remove from database)
 * Requires: Admin role
 */
router.delete('/users/:id', authenticateToken, requireAdmin, sensitiveOperationAudit('DELETE_USER'), deleteUser)

/**
 * GET /api/admin/users/:id/scope
 * Get leader's managed sales scope
 * Requires: Admin role
 */
router.get('/users/:id/scope', authenticateToken, requireAdmin, getLeaderScope)

/**
 * PUT /api/admin/users/:id/scope
 * Set leader's managed sales scope
 * Body: { salesIds: string[] }
 * Requires: Admin role
 */
router.put('/users/:id/scope', authenticateToken, requireAdmin, sensitiveOperationAudit('UPDATE_LEADER_SCOPE'), updateLeaderScope)

export default router
