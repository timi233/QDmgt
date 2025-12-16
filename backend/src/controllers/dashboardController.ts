import { Request, Response } from 'express'
import {
  getDashboardKPIs,
  getDashboardDistributors,
  getSalesRankings,
  getTrendData,
  getEnhancedChannelDashboard,
  getChannelContribution,
  getChannelGrowth,
  getVisitStatistics,
  DashboardFilters,
} from '../services/dashboardService.js'

/**
 * Get dashboard KPIs
 * GET /api/dashboard/kpis
 */
export async function getKPIs(req: Request, res: Response) {
  try {
    const { region, cooperationLevel, ownerId, startDate, endDate } = req.query

    const filters: DashboardFilters = {}

    if (region) {
      filters.region = region as string
    }

    if (cooperationLevel) {
      filters.cooperationLevel = cooperationLevel as string
    }

    if (ownerId) {
      filters.ownerId = ownerId as string
    }

    if (startDate && endDate) {
      filters.dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string),
      }
    }

    const kpis = await getDashboardKPIs(filters)

    res.json({
      success: true,
      data: kpis,
    })
  } catch (error: any) {
    console.error('Get KPIs error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard KPIs',
      message: error.message,
    })
  }
}

/**
 * Get dashboard distributors list
 * GET /api/dashboard/distributors
 */
export async function getDistributors(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const { region, cooperationLevel, ownerId } = req.query

    const filters: DashboardFilters = {}

    if (region) {
      filters.region = region as string
    }

    if (cooperationLevel) {
      filters.cooperationLevel = cooperationLevel as string
    }

    if (ownerId) {
      filters.ownerId = ownerId as string
    }

    const result = await getDashboardDistributors(page, limit, filters)

    res.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('Get dashboard distributors error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard distributors',
      message: error.message,
    })
  }
}

/**
 * Get sales rankings
 * GET /api/dashboard/rankings
 */
export async function getRankings(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 10
    const rankings = await getSalesRankings(limit)

    res.json({
      success: true,
      data: rankings,
    })
  } catch (error: any) {
    console.error('Get rankings error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get sales rankings',
      message: error.message,
    })
  }
}

/**
 * Get trend data for charts
 * GET /api/dashboard/trends
 */
export async function getTrends(_req: Request, res: Response) {
  try {
    const trends = await getTrendData()

    res.json({
      success: true,
      data: trends,
    })
  } catch (error: any) {
    console.error('Get trends error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get trend data',
      message: error.message,
    })
  }
}

/**
 * Get enhanced channel dashboard
 * GET /api/dashboard/enhanced
 */
export async function getEnhancedDashboard(_req: Request, res: Response) {
  try {
    const dashboard = await getEnhancedChannelDashboard()

    res.json({
      success: true,
      data: dashboard,
    })
  } catch (error: any) {
    console.error('Get enhanced dashboard error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get enhanced dashboard data',
      message: error.message,
    })
  }
}

/**
 * Get channel contribution insights
 * GET /api/dashboard/contribution
 */
export async function getContributionAnalysis(_req: Request, res: Response) {
  try {
    const contribution = await getChannelContribution()

    res.json({
      success: true,
      data: contribution,
    })
  } catch (error: any) {
    console.error('Get contribution analysis error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get contribution analysis',
      message: error.message,
    })
  }
}

/**
 * Get channel growth metrics
 * GET /api/dashboard/growth
 */
export async function getGrowthAnalysis(_req: Request, res: Response) {
  try {
    const growth = await getChannelGrowth()

    res.json({
      success: true,
      data: growth,
    })
  } catch (error: any) {
    console.error('Get growth analysis error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get growth analysis',
      message: error.message,
    })
  }
}

/**
 * Get visit statistics snapshot
 * GET /api/dashboard/visits-stats
 */
export async function getVisitStats(_req: Request, res: Response) {
  try {
    const stats = await getVisitStatistics()

    res.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    console.error('Get visit stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get visit statistics',
      message: error.message,
    })
  }
}
