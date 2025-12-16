import { Router } from 'express'
import {
  calculateForDistributor,
  calculateAll,
  getLatest,
  getHistory,
  getDistributorsByStatus,
} from '../controllers/healthScoreController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { requireAnyRole } from '../middlewares/roleMiddleware.js'
import { validateParams, validateQuery } from '../middlewares/validateMiddleware.js'
import {
  distributorIdParamSchema,
  healthStatusParamSchema,
  healthScoreHistoryQuerySchema,
} from '../schemas/healthScoreSchema.js'

const router = Router()

router.use(authenticateToken)

router.post(
  '/calculate/:distributorId',
  requireAnyRole(['leader']),
  validateParams(distributorIdParamSchema),
  calculateForDistributor
)

router.post('/calculate-all', requireAnyRole(['leader']), calculateAll)

router.get(
  '/by-status/:status',
  requireAnyRole(['sales', 'leader']),
  validateParams(healthStatusParamSchema),
  getDistributorsByStatus
)

router.get(
  '/:distributorId/latest',
  requireAnyRole(['sales', 'leader']),
  validateParams(distributorIdParamSchema),
  getLatest
)

router.get(
  '/:distributorId/history',
  requireAnyRole(['sales', 'leader']),
  validateParams(distributorIdParamSchema),
  validateQuery(healthScoreHistoryQuerySchema),
  getHistory
)

export default router
