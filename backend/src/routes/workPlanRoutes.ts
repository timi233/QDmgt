import express from 'express'
import * as workPlanController from '../controllers/workPlanController.js'
import { authenticateToken as authenticate } from '../middlewares/authMiddleware.js'
import { validateQuery, validateBody, validateParams } from '../middlewares/validateMiddleware.js'
import { requireConfirmation } from '../middlewares/confirmationMiddleware.js'
import {
  createWorkPlanBodySchema,
  updateWorkPlanBodySchema,
  getWorkPlansQuerySchema,
  createWeeklyReviewBodySchema,
  updateWeeklyReviewBodySchema,
  workPlanIdParamSchema,
  weeklyReviewIdParamSchema,
} from '../schemas/workPlanSchema.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// Work plan routes
router.get('/', validateQuery(getWorkPlansQuerySchema), workPlanController.getWorkPlans)
router.get('/:id', validateParams(workPlanIdParamSchema), workPlanController.getWorkPlanById)
router.post('/', validateBody(createWorkPlanBodySchema), workPlanController.createWorkPlan)
router.put('/:id', validateParams(workPlanIdParamSchema), validateBody(updateWorkPlanBodySchema), workPlanController.updateWorkPlan)
// Deleting work plan requires confirmation
router.delete('/:id', validateParams(workPlanIdParamSchema), requireConfirmation, workPlanController.deleteWorkPlan)

// Weekly review routes
router.post('/weekly-reviews', validateBody(createWeeklyReviewBodySchema), workPlanController.createWeeklyReview)
router.put('/weekly-reviews/:id', validateParams(weeklyReviewIdParamSchema), validateBody(updateWeeklyReviewBodySchema), workPlanController.updateWeeklyReview)
// Deleting weekly review requires confirmation
router.delete('/weekly-reviews/:id', validateParams(weeklyReviewIdParamSchema), requireConfirmation, workPlanController.deleteWeeklyReview)

export default router
