import { Request, Response } from 'express'
import {
  createTicket as createTicketRecord,
  getTickets as listTickets,
  getTicketById as findTicketById,
  updateTicket as updateTicketRecord,
  deleteTicket as removeTicket,
  addComment as addTicketComment,
  updateComment as updateTicketComment,
  deleteComment as removeComment,
  getTicketStats,
} from '../services/ticketService.js'
import type {
  CreateTicketBody,
  UpdateTicketBody,
  UpdateTicketParams,
  GetTicketsQuery,
  TicketIdParam,
  AddCommentBody,
  UpdateCommentBody,
  UpdateCommentParams,
} from '../schemas/ticketSchema.js'

/**
 * Create a new support ticket
 * POST /api/tickets
 */
export async function createTicket(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = req.body as CreateTicketBody

    const ticket = await createTicketRecord({
      ...body,
      createdBy: req.user.userId,
    })

    return res.status(201).json({
      message: 'Support ticket created successfully',
      ticket,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    console.error('Create ticket error:', error)
    return res.status(500).json({
      error: 'Failed to create support ticket',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get tickets with filters
 * GET /api/tickets
 */
export async function getTickets(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const query = req.query as unknown as GetTicketsQuery

    const result = await listTickets(query, req.user.userId, req.user.role)

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Get tickets error:', error)
    return res.status(500).json({
      error: 'Failed to fetch tickets',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get ticket detail
 * GET /api/tickets/:id
 */
export async function getTicketById(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as TicketIdParam
    const ticket = await findTicketById(params.id, req.user.userId, req.user.role)

    return res.status(200).json({
      success: true,
      ticket,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('permission')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Get ticket detail error:', error)
    return res.status(500).json({
      error: 'Failed to fetch ticket detail',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Update ticket
 * PUT /api/tickets/:id
 */
export async function updateTicket(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as UpdateTicketParams
    const body = req.body as UpdateTicketBody

    const ticket = await updateTicketRecord(params.id, body, req.user.userId, req.user.role)

    return res.status(200).json({
      message: 'Ticket updated successfully',
      ticket,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('permission')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Update ticket error:', error)
    return res.status(500).json({
      error: 'Failed to update ticket',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Delete ticket
 * DELETE /api/tickets/:id
 */
export async function deleteTicket(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as TicketIdParam
    await removeTicket(params.id, req.user.userId, req.user.role)

    return res.status(200).json({
      message: 'Ticket deleted successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('Only the ticket creator')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Delete ticket error:', error)
    return res.status(500).json({
      error: 'Failed to delete ticket',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Add comment to ticket
 * POST /api/tickets/comments
 */
export async function addComment(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = req.body as AddCommentBody

    const comment = await addTicketComment(
      {
        ...body,
        userId: req.user.userId,
      },
      req.user.role
    )

    return res.status(201).json({
      message: 'Comment added successfully',
      comment,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('permission')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Add comment error:', error)
    return res.status(500).json({
      error: 'Failed to add comment',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Update comment
 * PUT /api/tickets/comments/:id
 */
export async function updateComment(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as UpdateCommentParams
    const body = req.body as UpdateCommentBody

    const comment = await updateTicketComment(params.id, body, req.user.userId)

    return res.status(200).json({
      message: 'Comment updated successfully',
      comment,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('Only the comment author')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Update comment error:', error)
    return res.status(500).json({
      error: 'Failed to update comment',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Delete comment
 * DELETE /api/tickets/comments/:id
 */
export async function deleteComment(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as UpdateCommentParams
    await removeComment(params.id, req.user.userId, req.user.role)

    return res.status(200).json({
      message: 'Comment deleted successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('Only the comment author')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Delete comment error:', error)
    return res.status(500).json({
      error: 'Failed to delete comment',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get ticket statistics
 * GET /api/tickets/stats
 */
export async function getStats(_req: Request, res: Response) {
  try {
    const stats = await getTicketStats()

    return res.status(200).json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Get ticket stats error:', error)
    return res.status(500).json({
      error: 'Failed to get ticket statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
