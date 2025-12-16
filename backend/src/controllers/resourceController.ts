import { Request, Response } from 'express'
import {
  createResource as createResourceRecord,
  getResources as listResources,
  getResourceById as findResourceById,
  updateResource as updateResourceRecord,
  deleteResource as removeResource,
  trackDownload,
  trackView,
  getResourceStats,
} from '../services/resourceService.js'
import type {
  CreateResourceBody,
  UpdateResourceBody,
  UpdateResourceParams,
  GetResourcesQuery,
  ResourceIdParam,
  TrackActionParam,
} from '../schemas/resourceSchema.js'

/**
 * Create a new resource
 * POST /api/resources
 */
export async function createResource(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = req.body as CreateResourceBody

    const resource = await createResourceRecord(
      {
        ...body,
        createdBy: req.user.userId,
      },
      req.user.role
    )

    return res.status(201).json({
      message: 'Resource created successfully',
      resource,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Create resource error:', error)
    return res.status(500).json({
      error: 'Failed to create resource',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get resources with filters
 * GET /api/resources
 */
export async function getResources(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const query = req.query as unknown as GetResourcesQuery

    const result = await listResources(query, req.user.role)

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Get resources error:', error)
    return res.status(500).json({
      error: 'Failed to fetch resources',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get resource detail
 * GET /api/resources/:id
 */
export async function getResourceById(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as ResourceIdParam
    const resource = await findResourceById(params.id, req.user.role)

    return res.status(200).json({
      success: true,
      resource,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Get resource detail error:', error)
    return res.status(500).json({
      error: 'Failed to fetch resource detail',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Update resource
 * PUT /api/resources/:id
 */
export async function updateResource(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as UpdateResourceParams
    const body = req.body as UpdateResourceBody

    const resource = await updateResourceRecord(params.id, body, req.user.userId)

    return res.status(200).json({
      message: 'Resource updated successfully',
      resource,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (
      error instanceof Error &&
      (error.message.includes('Only the resource creator') ||
        error.message.includes('Access denied'))
    ) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Update resource error:', error)
    return res.status(500).json({
      error: 'Failed to update resource',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Delete resource
 * DELETE /api/resources/:id
 */
export async function deleteResource(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as ResourceIdParam
    await removeResource(params.id, req.user.userId)

    return res.status(200).json({
      message: 'Resource deleted successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (
      error instanceof Error &&
      (error.message.includes('Only the resource creator') ||
        error.message.includes('Access denied'))
    ) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Delete resource error:', error)
    return res.status(500).json({
      error: 'Failed to delete resource',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Track resource download
 * POST /api/resources/:id/download
 */
export async function recordDownload(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as TrackActionParam
    await trackDownload(params.id, req.user.role)

    return res.status(200).json({
      message: 'Download tracked successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Track download error:', error)
    return res.status(500).json({
      error: 'Failed to track download',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Track resource view
 * POST /api/resources/:id/view
 */
export async function recordView(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as TrackActionParam
    await trackView(params.id, req.user.role)

    return res.status(200).json({
      message: 'View tracked successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Track view error:', error)
    return res.status(500).json({
      error: 'Failed to track view',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get resource statistics
 * GET /api/resources/stats
 */
export async function getStats(_req: Request, res: Response) {
  try {
    const stats = await getResourceStats()

    return res.status(200).json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Get resource stats error:', error)
    return res.status(500).json({
      error: 'Failed to get resource statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
