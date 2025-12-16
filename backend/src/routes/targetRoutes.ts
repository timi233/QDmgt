import express from 'express'
import * as targetController from '../controllers/targetController.js'
import { authenticateToken as authenticate } from '../middlewares/authMiddleware.js'
import { requireRole } from '../middlewares/roleMiddleware.js'
import { validateQuery, validateBody, validateParams } from '../middlewares/validateMiddleware.js'
import { requireConfirmation } from '../middlewares/confirmationMiddleware.js'
import {
  createTargetBodySchema,
  updateTargetBodySchema,
  getTargetsQuerySchema,
  getTargetStatisticsQuerySchema,
  targetIdParamSchema,
} from '../schemas/targetSchema.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Get target statistics (available to all authenticated users)
router.get('/statistics', validateQuery(getTargetStatisticsQuerySchema), targetController.getTargetStatistics)

// Get all targets (available to all authenticated users)
router.get('/', validateQuery(getTargetsQuerySchema), targetController.getTargets)

// Get target by ID (available to all authenticated users)
router.get('/:id', validateParams(targetIdParamSchema), targetController.getTargetById)

// Create target (leader only)
router.post('/', requireRole('leader'), validateBody(createTargetBodySchema), targetController.createTarget)

// Update target (leader only)
router.put('/:id', requireRole('leader'), validateParams(targetIdParamSchema), validateBody(updateTargetBodySchema), targetController.updateTarget)

// Delete target (leader only)
// Requires confirmation due to sensitive nature
router.delete('/:id', requireRole('leader'), validateParams(targetIdParamSchema), requireConfirmation, targetController.deleteTarget)

export default router
