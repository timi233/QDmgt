import { Request, Response } from 'express'
import { z } from 'zod'
import * as taskService from '../services/taskService.js'

// Validation schemas
// Helper to handle null/empty string -> undefined transformation
const optionalUuid = z.union([
  z.string().uuid(),
  z.string().length(0),
  z.null(),
]).optional().transform(val => val || undefined)

const optionalString = z.union([
  z.string(),
  z.null(),
]).optional().transform(val => val || undefined)

const createTaskSchema = z.object({
  distributorId: optionalUuid, // Optional: task may not be linked to a distributor
  assignedUserId: optionalUuid, // Optional: defaults to creator if not provided
  title: z.string().min(1).max(200),
  description: optionalString,
  deadline: z.string().datetime(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
})

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  deadline: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue']),
  reason: z.string().optional(),
})

const assignTaskSchema = z.object({
  assignedUserId: z.string().uuid(),
  reason: z.string().optional(),
})

const addCollaboratorSchema = z.object({
  userId: z.string().uuid(),
})

const addCommentSchema = z.object({
  content: z.string().min(1).max(1000),
})

/**
 * Create a new task
 * POST /api/tasks
 */
export async function create(req: Request, res: Response) {
  try {
    console.log('[TaskController] Create task request body:', JSON.stringify(req.body, null, 2))
    const validatedData = createTaskSchema.parse(req.body)
    console.log('[TaskController] Validated data:', JSON.stringify(validatedData, null, 2))

    const task = await taskService.createTask(
      {
        ...validatedData,
        assignedUserId: validatedData.assignedUserId || req.user!.userId, // Default to creator if not provided
        deadline: new Date(validatedData.deadline),
      },
      req.user!.userId
    )

    return res.status(201).json({ task })
  } catch (error: any) {
    console.log('[TaskController] Error:', error)
    if (error instanceof z.ZodError) {
      console.log('[TaskController] Zod validation errors:', JSON.stringify(error.errors, null, 2))
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    return res.status(400).json({ error: error.message })
  }
}

/**
 * Get all tasks with filters
 * GET /api/tasks?page=1&limit=20&status=pending&priority=high&distributorId=xxx&search=keyword
 */
export async function getAll(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string
    const priority = req.query.priority as string
    const distributorId = req.query.distributorId as string
    const search = req.query.search as string

    const result = await taskService.getAllTasks({
      userId: req.user!.userId,
      userRole: req.user!.role,
      page,
      limit,
      filters: {
        status,
        priority,
        distributorId,
        search,
      },
    })

    return res.json(result)
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}

/**
 * Get task by ID
 * GET /api/tasks/:id
 */
export async function getById(req: Request, res: Response) {
  try {
    const task = await taskService.getTaskById(
      req.params.id,
      req.user!.userId,
      req.user!.role
    )

    return res.json({ task })
  } catch (error: any) {
    return res.status(404).json({ error: error.message })
  }
}

/**
 * Update task
 * PUT /api/tasks/:id
 */
export async function update(req: Request, res: Response) {
  try {
    // req.body already validated by validateBody(updateTaskBodySchema) middleware
    const updateData: any = { ...req.body }
    if (updateData.deadline) {
      updateData.deadline = new Date(updateData.deadline)
    }

    const task = await taskService.updateTask(
      req.params.id,
      updateData,
      req.user!.userId,
      req.user!.role
    )

    return res.json({ task })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    return res.status(400).json({ error: error.message })
  }
}

/**
 * Update task status
 * PUT /api/tasks/:id/status
 */
export async function updateStatus(req: Request, res: Response) {
  try {
    const validatedData = updateStatusSchema.parse(req.body)

    const task = await taskService.updateTaskStatus(
      req.params.id,
      validatedData.status,
      req.user!.userId,
      req.user!.role,
      validatedData.reason
    )

    return res.json({ task })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    return res.status(400).json({ error: error.message })
  }
}

/**
 * Assign task to another user
 * PUT /api/tasks/:id/assign
 */
export async function assign(req: Request, res: Response) {
  try {
    const validatedData = assignTaskSchema.parse(req.body)

    const task = await taskService.assignTask(
      req.params.id,
      validatedData.assignedUserId,
      req.user!.userId,
      req.user!.role,
      validatedData.reason
    )

    return res.json({ task })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    return res.status(400).json({ error: error.message })
  }
}

/**
 * Add collaborator to task
 * POST /api/tasks/:id/collaborators
 */
export async function addCollaborator(req: Request, res: Response) {
  try {
    const validatedData = addCollaboratorSchema.parse(req.body)

    const collaborator = await taskService.addCollaborator(
      req.params.id,
      validatedData.userId,
      req.user!.userId,
      req.user!.role
    )

    return res.status(201).json({ collaborator })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    return res.status(400).json({ error: error.message })
  }
}

/**
 * Remove collaborator from task
 * DELETE /api/tasks/:id/collaborators/:userId
 */
export async function removeCollaborator(req: Request, res: Response) {
  try {
    const result = await taskService.removeCollaborator(
      req.params.id,
      req.params.userId,
      req.user!.userId,
      req.user!.role
    )

    return res.json({ message: 'Collaborator removed', collaborator: result })
  } catch (error: any) {
    return res.status(400).json({ error: error.message })
  }
}

/**
 * Add comment to task
 * POST /api/tasks/:id/comments
 */
export async function addComment(req: Request, res: Response) {
  try {
    const validatedData = addCommentSchema.parse(req.body)

    const comment = await taskService.addComment(
      req.params.id,
      validatedData.content,
      req.user!.userId,
      req.user!.role
    )

    return res.status(201).json({ comment })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    return res.status(400).json({ error: error.message })
  }
}

/**
 * Delete task
 * DELETE /api/tasks/:id
 */
export async function remove(req: Request, res: Response) {
  try {
    const result = await taskService.deleteTask(
      req.params.id,
      req.user!.userId,
      req.user!.role
    )

    return res.json({ message: 'Task deleted successfully', ...result })
  } catch (error: any) {
    return res.status(400).json({ error: error.message })
  }
}
