import { Router } from 'express'
import { distributorTargetController } from '../controllers/distributorTargetController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'

const router = Router()

// All routes require authentication
router.use(authenticateToken)

// Allocate targets from channel target to distributors
router.post('/allocate', distributorTargetController.allocate)

// Get distributor targets by channel target
router.get('/channel/:channelTargetId', distributorTargetController.getByChannelTarget)

// Get distributor targets by distributor
router.get('/distributor/:distributorId', distributorTargetController.getByDistributor)

// Trigger aggregation for a channel target
router.post('/aggregate/:channelTargetId', distributorTargetController.aggregate)

// Get single distributor target
router.get('/:id', distributorTargetController.getById)

// Update completion for a distributor target
router.patch('/:id/completion', distributorTargetController.updateCompletion)

// Delete distributor target
router.delete('/:id', distributorTargetController.delete)

// Create target for a specific distributor (bottom-up flow)
router.post('/for-distributor/:distributorId', distributorTargetController.createForDistributor)

export default router
