import { Request, Response } from 'express'
import {
  createVisit as createVisitRecord,
  getVisits as listVisits,
  getVisitById as findVisitById,
  updateVisit as updateVisitRecord,
  deleteVisit as removeVisit,
  getDistributorVisitStats,
} from '../services/visitService.js'
import type {
  CreateVisitBody,
  GetVisitsQuery,
  UpdateVisitBody,
  VisitIdParam,
  VisitStatsParams,
} from '../schemas/visitSchema.js'

/**
 * Create a partner visit record
 * POST /api/visits
 */
export async function createVisit(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = req.body as CreateVisitBody

    const visit = await createVisitRecord({
      ...body,
      userId: req.user.userId,
    })

    return res.status(201).json({
      message: 'Visit record created successfully',
      visit,
    })
  } catch (error) {
    console.error('Create visit error:', error)
    return res.status(500).json({
      error: 'Failed to create visit record',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get visit records with filters
 * GET /api/visits
 */
export async function getVisits(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const query = req.query as unknown as GetVisitsQuery

    const result = await listVisits({
      distributorId: query.distributorId,
      userId: req.user.role === 'sales' ? req.user.userId : query.userId,
      visitType: query.visitType,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      limit: query.limit,
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('Get visits error:', error)
    return res.status(500).json({
      error: 'Failed to fetch visit records',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get visit detail
 * GET /api/visits/:id
 */
export async function getVisitById(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as VisitIdParam
    const visit = await findVisitById(params.id, req.user.userId, req.user.role)

    return res.status(200).json({ visit })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    if (error instanceof Error && error.message.includes('access denied')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Get visit detail error:', error)
    return res.status(500).json({
      error: 'Failed to fetch visit detail',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Update visit record
 * PUT /api/visits/:id
 */
export async function updateVisit(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as VisitIdParam
    const body = req.body as UpdateVisitBody

    const visit = await updateVisitRecord(params.id, body, req.user.userId, req.user.role)

    return res.status(200).json({
      message: 'Visit record updated successfully',
      visit,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    if (error instanceof Error && error.message.includes('access denied')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Update visit error:', error)
    return res.status(500).json({
      error: 'Failed to update visit record',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Delete visit record
 * DELETE /api/visits/:id
 */
export async function deleteVisit(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as VisitIdParam
    await removeVisit(params.id, req.user.userId, req.user.role)

    return res.status(200).json({
      message: 'Visit record deleted successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    if (error instanceof Error && error.message.includes('access denied')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Delete visit error:', error)
    return res.status(500).json({
      error: 'Failed to delete visit record',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get visit statistics for a distributor
 * GET /api/visits/stats/:distributorId
 */
export async function getVisitStats(req: Request, res: Response) {
  try {
    const params = req.params as unknown as VisitStatsParams
    const stats = await getDistributorVisitStats(params.distributorId)

    return res.status(200).json({
      distributorId: params.distributorId,
      stats,
    })
  } catch (error) {
    console.error('Get visit stats error:', error)
    return res.status(500).json({
      error: 'Failed to get visit statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
