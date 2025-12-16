import { z } from 'zod'

// Create ticket schema
export const createTicketSchema = z.object({
  body: z.object({
    distributorId: z.string().uuid('Invalid distributor ID'),
    ticketType: z.enum(['technical', 'sales', 'policy', 'billing', 'other'], {
      errorMap: () => ({ message: 'Invalid ticket type' }),
    }),
    priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
    subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
    description: z.string().min(1, 'Description is required'),
    assignedTo: z.string().uuid('Invalid assignee ID').optional(),
  }),
})

// Update ticket schema
export const updateTicketSchema = z.object({
  body: z.object({
    ticketType: z.enum(['technical', 'sales', 'policy', 'billing', 'other']).optional(),
    priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
    subject: z.string().min(1).max(200).optional(),
    description: z.string().min(1).optional(),
    status: z.enum(['open', 'assigned', 'in_progress', 'pending', 'resolved', 'closed']).optional(),
    assignedTo: z.string().uuid('Invalid assignee ID').optional(),
    satisfactionRating: z.number().int().min(1).max(5).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid ticket ID'),
  }),
})

// Get tickets query schema
export const getTicketsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    distributorId: z.string().uuid('Invalid distributor ID').optional(),
    ticketType: z.enum(['technical', 'sales', 'policy', 'billing', 'other']).optional(),
    priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
    status: z.enum(['open', 'assigned', 'in_progress', 'pending', 'resolved', 'closed']).optional(),
    assignedTo: z.string().uuid('Invalid assignee ID').optional(),
    createdBy: z.string().uuid('Invalid creator ID').optional(),
  }),
})

// Ticket ID parameter schema
export const ticketIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ticket ID'),
  }),
})

// Add comment schema
export const addCommentSchema = z.object({
  body: z.object({
    ticketId: z.string().uuid('Invalid ticket ID'),
    content: z.string().min(1, 'Comment content is required'),
    isInternal: z.boolean().default(false),
  }),
})

// Update comment schema
export const updateCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Comment content is required'),
    isInternal: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid comment ID'),
  }),
})

// Type exports
export type CreateTicketBody = z.infer<typeof createTicketSchema>['body']
export type UpdateTicketBody = z.infer<typeof updateTicketSchema>['body']
export type UpdateTicketParams = z.infer<typeof updateTicketSchema>['params']
export type GetTicketsQuery = z.infer<typeof getTicketsSchema>['query']
export type TicketIdParam = z.infer<typeof ticketIdSchema>['params']
export type AddCommentBody = z.infer<typeof addCommentSchema>['body']
export type UpdateCommentBody = z.infer<typeof updateCommentSchema>['body']
export type UpdateCommentParams = z.infer<typeof updateCommentSchema>['params']
