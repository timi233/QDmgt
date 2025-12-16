import { Request, Response } from 'express'
import {
  updateDistributorHealthScore,
  updateAllHealthScores,
  getLatestHealthScore,
  getHealthScoreHistory,
  getDistributorsByHealthStatus,
} from '../services/healthScoreService.js'
import type {
  DistributorIdParam,
  HealthScoreHistoryQuery,
  HealthStatusParam,
} from '../schemas/healthScoreSchema.js'

/**
 * Calculate health score for a distributor
 * POST /api/health-scores/calculate/:distributorId
 */
export async function calculateForDistributor(req: Request, res: Response) {
  try {
    const params = req.params as unknown as DistributorIdParam
    const result = await updateDistributorHealthScore(params.distributorId)

    return res.status(200).json({
      message: 'Health score calculated successfully',
      distributorId: params.distributorId,
      healthScore: result,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
      })
    }

    console.error('Calculate distributor health score error:', error)
    return res.status(500).json({
      error: 'Failed to calculate health score',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Calculate health scores for all distributors
 * POST /api/health-scores/calculate-all
 */
export async function calculateAll(_req: Request, res: Response) {
  try {
    const summary = await updateAllHealthScores()

    return res.status(200).json({
      message: 'Health score recalculation started',
      summary,
    })
  } catch (error) {
    console.error('Calculate all health scores error:', error)
    return res.status(500).json({
      error: 'Failed to calculate health scores',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get latest health score for distributor
 * GET /api/health-scores/:distributorId/latest
 */
export async function getLatest(req: Request, res: Response) {
  try {
    const params = req.params as unknown as DistributorIdParam
    const healthScore = await getLatestHealthScore(params.distributorId)

    if (!healthScore) {
      return res.status(404).json({
        error: 'Health score not found',
      })
    }

    return res.status(200).json({
      distributorId: params.distributorId,
      healthScore,
    })
  } catch (error) {
    console.error('Get latest health score error:', error)
    return res.status(500).json({
      error: 'Failed to fetch health score',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get health score history
 * GET /api/health-scores/:distributorId/history
 */
export async function getHistory(req: Request, res: Response) {
  try {
    const params = req.params as unknown as DistributorIdParam
    const query = req.query as unknown as HealthScoreHistoryQuery

    const history = await getHealthScoreHistory(params.distributorId, query.limit)

    return res.status(200).json({
      distributorId: params.distributorId,
      history,
    })
  } catch (error) {
    console.error('Get health score history error:', error)
    return res.status(500).json({
      error: 'Failed to fetch health score history',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get distributors grouped by health status
 * GET /api/health-scores/by-status/:status
 */
export async function getDistributorsByStatus(req: Request, res: Response) {
  try {
    const params = req.params as unknown as HealthStatusParam
    const distributors = await getDistributorsByHealthStatus(params.status)

    return res.status(200).json({
      status: params.status,
      distributors,
    })
  } catch (error) {
    console.error('Get distributors by health status error:', error)
    return res.status(500).json({
      error: 'Failed to fetch distributors by health status',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
