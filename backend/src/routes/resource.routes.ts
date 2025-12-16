import { Router } from 'express'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validateMiddleware.js'
import {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource,
  recordDownload,
  recordView,
  getStats,
} from '../controllers/resourceController.js'
import {
  createResourceSchema,
  updateResourceSchema,
  getResourcesSchema,
  resourceIdSchema,
  trackActionSchema,
} from '../schemas/resourceSchema.js'

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Statistics route
router.get('/stats', getStats)

// Track actions (must be before /:id routes)
router.post('/:id/download', validateParams(trackActionSchema.shape.params), recordDownload)
router.post('/:id/view', validateParams(trackActionSchema.shape.params), recordView)

// Resource CRUD routes
router.post('/', validateBody(createResourceSchema.shape.body), createResource)

router.get('/', validateQuery(getResourcesSchema.shape.query), getResources)

router.get('/:id', validateParams(resourceIdSchema.shape.params), getResourceById)

router.put(
  '/:id',
  validateParams(updateResourceSchema.shape.params),
  validateBody(updateResourceSchema.shape.body),
  updateResource
)

router.delete('/:id', validateParams(resourceIdSchema.shape.params), deleteResource)

export default router
