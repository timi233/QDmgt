import { Router } from 'express'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validateMiddleware.js'
import {
  createTraining,
  getTrainings,
  getTrainingById,
  updateTraining,
  deleteTraining,
  registerParticipant,
  getParticipants,
  updateParticipant,
  deleteParticipant,
  getStats,
} from '../controllers/trainingController.js'
import {
  createTrainingSchema,
  updateTrainingSchema,
  getTrainingsSchema,
  trainingIdSchema,
  registerParticipantSchema,
  updateParticipantSchema,
  getParticipantsSchema,
} from '../schemas/trainingSchema.js'

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Training statistics
router.get('/stats', getStats)

// Participant routes
router.post(
  '/participants',
  validateBody(registerParticipantSchema.shape.body),
  registerParticipant
)

router.get(
  '/participants',
  validateQuery(getParticipantsSchema.shape.query),
  getParticipants
)

router.put(
  '/participants/:id',
  validateParams(updateParticipantSchema.shape.params),
  validateBody(updateParticipantSchema.shape.body),
  updateParticipant
)

router.delete(
  '/participants/:id',
  validateParams(updateParticipantSchema.shape.params),
  deleteParticipant
)

// Training CRUD routes
router.post('/', validateBody(createTrainingSchema.shape.body), createTraining)

router.get('/', validateQuery(getTrainingsSchema.shape.query), getTrainings)

router.get('/:id', validateParams(trainingIdSchema.shape.params), getTrainingById)

router.put(
  '/:id',
  validateParams(updateTrainingSchema.shape.params),
  validateBody(updateTrainingSchema.shape.body),
  updateTraining
)

router.delete('/:id', validateParams(trainingIdSchema.shape.params), deleteTraining)

export default router
