import { Router } from 'express'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validateMiddleware.js'
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  addComment,
  updateComment,
  deleteComment,
  getStats,
} from '../controllers/ticketController.js'
import {
  createTicketSchema,
  updateTicketSchema,
  getTicketsSchema,
  ticketIdSchema,
  addCommentSchema,
  updateCommentSchema,
} from '../schemas/ticketSchema.js'

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Statistics route
router.get('/stats', getStats)

// Comment routes
router.post('/comments', validateBody(addCommentSchema.shape.body), addComment)
router.put(
  '/comments/:id',
  validateParams(updateCommentSchema.shape.params),
  validateBody(updateCommentSchema.shape.body),
  updateComment
)
router.delete(
  '/comments/:id',
  validateParams(updateCommentSchema.shape.params),
  deleteComment
)

// Ticket CRUD routes
router.post('/', validateBody(createTicketSchema.shape.body), createTicket)

router.get('/', validateQuery(getTicketsSchema.shape.query), getTickets)

router.get('/:id', validateParams(ticketIdSchema.shape.params), getTicketById)

router.put(
  '/:id',
  validateParams(updateTicketSchema.shape.params),
  validateBody(updateTicketSchema.shape.body),
  updateTicket
)

router.delete('/:id', validateParams(ticketIdSchema.shape.params), deleteTicket)

export default router
