import { Router } from 'express'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validateMiddleware.js'
import {
  createCertification,
  getCertifications,
  getCertificationById,
  verifyCertification,
  updateCertification,
  deleteCertification,
  updateExpired,
  getStats,
} from '../controllers/certificationController.js'
import {
  createCertificationSchema,
  updateCertificationSchema,
  getCertificationsSchema,
  certificationIdSchema,
} from '../schemas/certificationSchema.js'

const router = Router()

// Public route - verify certification by code (must be before authenticateToken)
// Fix: Allow public access to verification endpoint
router.get('/verify/:code', verifyCertification)

// All other routes require authentication
router.use(authenticateToken)

// Statistics route
router.get('/stats', getStats)

// Update expired certifications (cron job or manual trigger)
router.post('/update-expired', updateExpired)

// Certification CRUD routes
router.post('/', validateBody(createCertificationSchema.shape.body), createCertification)

router.get('/', validateQuery(getCertificationsSchema.shape.query), getCertifications)

router.get('/:id', validateParams(certificationIdSchema.shape.params), getCertificationById)

router.put(
  '/:id',
  validateParams(updateCertificationSchema.shape.params),
  validateBody(updateCertificationSchema.shape.body),
  updateCertification
)

router.delete('/:id', validateParams(certificationIdSchema.shape.params), deleteCertification)

export default router
