import { Router } from 'express'
import {
  getKPIs,
  getDistributors,
  getRankings,
  getTrends,
  getEnhancedDashboard,
  getContributionAnalysis,
  getGrowthAnalysis,
  getVisitStats,
} from '../controllers/dashboardController.js'
import { authenticateToken as authenticate } from '../middlewares/authMiddleware.js'
import { requireRole } from '../middlewares/roleMiddleware.js'

const router = Router()

// All dashboard routes require authentication and leader role
router.use(authenticate)
router.use(requireRole('leader'))

// GET /api/dashboard/kpis - Get KPI summary
router.get('/kpis', getKPIs)

// GET /api/dashboard/distributors - Get distributors list with task info
router.get('/distributors', getDistributors)

// GET /api/dashboard/rankings - Get sales performance rankings
router.get('/rankings', getRankings)

// GET /api/dashboard/trends - Get trend data for charts
router.get('/trends', getTrends)

// GET /api/dashboard/enhanced - Get enhanced channel dashboard
router.get('/enhanced', getEnhancedDashboard)

// GET /api/dashboard/contribution - Get channel contribution analysis
router.get('/contribution', getContributionAnalysis)

// GET /api/dashboard/growth - Get channel growth analysis
router.get('/growth', getGrowthAnalysis)

// GET /api/dashboard/visits-stats - Get visit statistics overview
router.get('/visits-stats', getVisitStats)

export default router
