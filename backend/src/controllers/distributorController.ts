import { Request, Response } from 'express'
import { z } from 'zod'
import {
  createDistributor,
  getAllDistributors,
  getDistributorById,
  updateDistributor,
  deleteDistributor,
} from '../services/distributorService.js'

// Validation schemas
const createDistributorSchema = z.object({
  name: z.string().min(2).max(50),
  region: z.string().min(2),
  contactPerson: z.string().min(2).max(20),
  phone: z.string().min(1),
  cooperationLevel: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  creditLimit: z.number().min(0).max(999999).optional(),
  tags: z.array(z.string()).max(5).optional(),
  historicalPerformance: z.string().optional(),
  notes: z.string().optional(),
})

const updateDistributorSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  region: z.string().min(2).optional(),
  contactPerson: z.string().min(2).max(20).optional(),
  phone: z.string().min(1).optional(),
  cooperationLevel: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  creditLimit: z.number().min(0).max(999999).optional(),
  tags: z.array(z.string()).max(5).optional(),
  historicalPerformance: z.string().optional(),
  notes: z.string().optional(),
})

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  region: z.string().optional(),
  cooperationLevel: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  search: z.string().optional(),
})

/**
 * Create a new distributor
 * POST /api/distributors
 */
export async function create(req: Request, res: Response) {
  try {
    // Debug: Log incoming request body
    console.log('[Distributor Create] Request body:', JSON.stringify(req.body, null, 2))

    // Validate input
    const validatedData = createDistributorSchema.parse(req.body)

    // Get user from auth middleware
    const userId = (req as any).user.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Create distributor
    const distributor = await createDistributor(validatedData, userId)

    return res.status(201).json({
      message: 'Distributor created successfully',
      distributor,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    if (error instanceof Error && error.message === 'DUPLICATE_NAME_REGION') {
      return res.status(400).json({
        error: '该区域已存在同名分销商',
        details: 'Distributor name already exists in this region',
      })
    }

    // Handle Prisma unique constraint violation (race condition fallback)
    if ((error as any)?.code === 'P2002') {
      return res.status(400).json({
        error: '该区域已存在同名分销商',
        details: 'Distributor name already exists in this region',
      })
    }

    if (error instanceof Error && error.message.includes('Validation failed')) {
      return res.status(400).json({
        error: error.message,
      })
    }

    console.error('Create distributor error:', error)
    console.error('Error details:', error instanceof Error ? error.stack : 'Unknown error')
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get all distributors with pagination and filtering
 * GET /api/distributors
 */
export async function getAll(req: Request, res: Response) {
  try {
    // Validate query parameters
    const query = querySchema.parse(req.query)

    // Get user from auth middleware
    const userId = (req as any).user.userId
    const userRole = (req as any).user.role
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get distributors
    const result = await getAllDistributors({
      userId,
      userRole,
      page: query.page,
      limit: query.limit,
      filters: {
        region: query.region,
        cooperationLevel: query.cooperationLevel,
        search: query.search,
      },
    })

    return res.status(200).json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    console.error('Get distributors error:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
}

/**
 * Get distributor by ID
 * GET /api/distributors/:id
 */
export async function getById(req: Request, res: Response) {
  try {
    const { id } = req.params

    // Get user from auth middleware
    const userId = (req as any).user.userId
    const userRole = (req as any).user.role
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get distributor
    const distributor = await getDistributorById(id, userId, userRole)

    return res.status(200).json({ distributor })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
      })
    }

    console.error('Get distributor error:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
}

/**
 * Update distributor
 * PUT /api/distributors/:id
 */
export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params

    // Validate input
    const validatedData = updateDistributorSchema.parse(req.body)

    // Get user from auth middleware
    const userId = (req as any).user.userId
    const userRole = (req as any).user.role
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Update distributor
    const distributor = await updateDistributor(id, validatedData, userId, userRole)

    return res.status(200).json({
      message: 'Distributor updated successfully',
      distributor,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    if (error instanceof Error && error.message === 'DUPLICATE_NAME_REGION') {
      return res.status(400).json({
        error: '该区域已存在同名分销商',
        details: 'Distributor name already exists in this region',
      })
    }

    // Handle Prisma unique constraint violation (race condition fallback)
    if ((error as any)?.code === 'P2002') {
      return res.status(400).json({
        error: '该区域已存在同名分销商',
        details: 'Distributor name already exists in this region',
      })
    }

    if (error instanceof Error && error.message.includes('Validation failed')) {
      return res.status(400).json({
        error: error.message,
      })
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
      })
    }

    console.error('Update distributor error:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
}

/**
 * Delete distributor (soft delete)
 * DELETE /api/distributors/:id
 */
export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params

    // Get user from auth middleware
    const userId = (req as any).user.userId
    const userRole = (req as any).user.role
    if (!userId || !userRole) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Delete distributor
    await deleteDistributor(id, userId, userRole)

    return res.status(200).json({
      message: 'Distributor deleted successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message,
      })
    }

    console.error('Delete distributor error:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
}
