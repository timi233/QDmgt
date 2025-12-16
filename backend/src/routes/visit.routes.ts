import { Router } from 'express'
import {
  createVisit,
  getVisits,
  getVisitById,
  updateVisit,
  deleteVisit,
  getVisitStats,
} from '../controllers/visitController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { requireAnyRole } from '../middlewares/roleMiddleware.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validateMiddleware.js'
import { requireConfirmation } from '../middlewares/confirmationMiddleware.js'
import {
  createVisitBodySchema,
  getVisitsQuerySchema,
  updateVisitBodySchema,
  visitIdParamSchema,
  visitStatsParamSchema,
} from '../schemas/visitSchema.js'

const router = Router()
const visitRoles = ['sales', 'leader']

router.use(authenticateToken)
router.use(requireAnyRole(visitRoles))

router.post('/', validateBody(createVisitBodySchema), createVisit)
router.get('/', validateQuery(getVisitsQuerySchema), getVisits)
router.get('/stats/:distributorId', validateParams(visitStatsParamSchema), getVisitStats)
router.get('/:id', validateParams(visitIdParamSchema), getVisitById)
router.put(
  '/:id',
  validateParams(visitIdParamSchema),
  validateBody(updateVisitBodySchema),
  updateVisit
)
router.delete(
  '/:id',
  validateParams(visitIdParamSchema),
  requireConfirmation,
  deleteVisit
)

export default router
