import { Router } from 'express'
import * as backupController from '../controllers/backupController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { requireRole } from '../middlewares/roleMiddleware.js'
import { requireConfirmation } from '../middlewares/confirmationMiddleware.js'

const router = Router()

// All backup routes require authentication and leader role
router.use(authenticateToken)
router.use(requireRole('leader'))

/**
 * GET /api/backup/list
 * List all available backups
 */
router.get('/list', backupController.list)

/**
 * GET /api/backup/stats
 * Get database statistics
 */
router.get('/stats', backupController.stats)

/**
 * GET /api/backup/verify/:filename
 * Verify backup integrity
 */
router.get('/verify/:filename', backupController.verify)

/**
 * POST /api/backup/create
 * Create a new backup
 */
router.post('/create', backupController.create)

/**
 * POST /api/backup/restore
 * Restore database from backup
 * Requires confirmation due to critical nature
 */
router.post('/restore', requireConfirmation, backupController.restore)

/**
 * DELETE /api/backup/:filename
 * Delete a backup file
 * Requires confirmation
 */
router.delete('/:filename', requireConfirmation, backupController.remove)

export default router
