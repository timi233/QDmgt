import { Router } from 'express'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { requireAnyRole } from '../middlewares/roleMiddleware.js'
import { validateQuery, validateBody, validateParams } from '../middlewares/validateMiddleware.js'
import { requireConfirmation } from '../middlewares/confirmationMiddleware.js'
import {
  create,
  getAll,
  getById,
  update,
  remove,
} from '../controllers/distributorController.js'
import {
  createDistributorBodySchema,
  updateDistributorBodySchema,
  getDistributorsQuerySchema,
  uuidParamSchema,
} from '../schemas/distributorSchema.js'

const router = Router()

// All distributor routes require authentication
// Sales and leaders can access these routes
const distributorRoles = ['sales', 'leader']

// Create new distributor
router.post(
  '/',
  authenticateToken,
  requireAnyRole(distributorRoles),
  validateBody(createDistributorBodySchema),
  create
)

// Get all distributors (with permission filtering)
router.get(
  '/',
  authenticateToken,
  requireAnyRole(distributorRoles),
  validateQuery(getDistributorsQuerySchema),
  getAll
)

// Get distributor by ID (with permission filtering)
router.get(
  '/:id',
  authenticateToken,
  requireAnyRole(distributorRoles),
  validateParams(uuidParamSchema),
  getById
)

// Update distributor (with permission filtering)
router.put(
  '/:id',
  authenticateToken,
  requireAnyRole(distributorRoles),
  validateParams(uuidParamSchema),
  validateBody(updateDistributorBodySchema),
  update
)

// Delete distributor (with permission filtering)
// Requires confirmation due to sensitive nature
router.delete(
  '/:id',
  authenticateToken,
  requireAnyRole(distributorRoles),
  validateParams(uuidParamSchema),
  requireConfirmation,
  remove
)

export default router
