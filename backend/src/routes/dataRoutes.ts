import { Router } from 'express'
import {
  getDashboardData,
  refreshDashboardData,
  exportDistributorsToExcel,
  getImportTemplate,
  importDistributorsFromExcel,
  getAuditEvents,
  getEntityAuditEvents,
} from '../controllers/dataController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { requireRole } from '../middlewares/roleMiddleware.js'
import { validateQuery, validateBody, validateParams } from '../middlewares/validateMiddleware.js'
import { requireConfirmation } from '../middlewares/confirmationMiddleware.js'
import {
  exportDistributorsQuerySchema,
  auditEventsQuerySchema,
  entityAuditEventsParamsSchema,
  importDistributorsBodySchema,
} from '../schemas/dataSchema.js'

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Dashboard data routes
router.get('/dashboard', getDashboardData)
router.post('/dashboard/refresh', requireRole('leader'), refreshDashboardData)

// Excel import/export routes
router.get('/export/distributors', validateQuery(exportDistributorsQuerySchema), exportDistributorsToExcel)
router.get('/import/template', getImportTemplate)
// Data import requires confirmation due to potential bulk changes
router.post('/import/distributors', validateBody(importDistributorsBodySchema), requireConfirmation, importDistributorsFromExcel)

// Audit event routes (leader only)
router.get('/events', requireRole('leader'), validateQuery(auditEventsQuerySchema), getAuditEvents)
router.get('/events/:entityType/:entityId', validateParams(entityAuditEventsParamsSchema), getEntityAuditEvents)

export default router
