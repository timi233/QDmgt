import { Router } from 'express'
import * as performanceController from '../controllers/performanceController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { requireRole } from '../middlewares/roleMiddleware.js'

const router = Router()

// All performance routes require authentication and leader role
router.use(authenticateToken)
router.use(requireRole('leader'))

/**
 * GET /api/performance/metrics
 * Get all performance metrics
 */
router.get('/metrics', performanceController.getMetrics)

/**
 * GET /api/performance/http
 * Get HTTP performance metrics
 */
router.get('/http', performanceController.getHttpMetrics)

/**
 * GET /api/performance/database
 * Get database performance metrics
 */
router.get('/database', performanceController.getDatabaseMetrics)

/**
 * GET /api/performance/system
 * Get system resource usage
 */
router.get('/system', performanceController.getSystemInfo)

/**
 * POST /api/performance/reset
 * Reset performance metrics
 */
router.post('/reset', performanceController.resetMetrics)

export default router
