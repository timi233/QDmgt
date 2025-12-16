import { Router } from 'express'
import * as taskController from '../controllers/taskController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'
import { requireAnyRole } from '../middlewares/roleMiddleware.js'
import { validateQuery, validateBody, validateParams } from '../middlewares/validateMiddleware.js'
import { requireConfirmation } from '../middlewares/confirmationMiddleware.js'
import {
  createTaskBodySchema,
  updateTaskBodySchema,
  updateTaskStatusBodySchema,
  assignTaskBodySchema,
  addCollaboratorBodySchema,
  removeCollaboratorParamsSchema,
  addCommentBodySchema,
  getTasksQuerySchema,
  taskIdParamSchema,
} from '../schemas/taskSchema.js'

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Task CRUD operations
router.post('/', requireAnyRole(['sales', 'leader']), validateBody(createTaskBodySchema), taskController.create)
router.get('/', requireAnyRole(['sales', 'leader']), validateQuery(getTasksQuerySchema), taskController.getAll)
router.get('/:id', requireAnyRole(['sales', 'leader']), validateParams(taskIdParamSchema), taskController.getById)
router.put('/:id', requireAnyRole(['sales', 'leader']), validateParams(taskIdParamSchema), validateBody(updateTaskBodySchema), taskController.update)

// Task status and assignment
router.put('/:id/status', requireAnyRole(['sales', 'leader']), validateParams(taskIdParamSchema), validateBody(updateTaskStatusBodySchema), taskController.updateStatus)
router.put('/:id/assign', requireAnyRole(['sales', 'leader']), validateParams(taskIdParamSchema), validateBody(assignTaskBodySchema), taskController.assign)

// Collaboration features
router.post('/:id/collaborators', requireAnyRole(['sales', 'leader']), validateParams(taskIdParamSchema), validateBody(addCollaboratorBodySchema), taskController.addCollaborator)
// Removing collaborator requires confirmation
router.delete('/:id/collaborators/:userId', requireAnyRole(['sales', 'leader']), validateParams(removeCollaboratorParamsSchema), requireConfirmation, taskController.removeCollaborator)

// Comments
router.post('/:id/comments', requireAnyRole(['sales', 'leader']), validateParams(taskIdParamSchema), validateBody(addCommentBodySchema), taskController.addComment)

export default router
