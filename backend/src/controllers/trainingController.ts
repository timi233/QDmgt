import { Request, Response } from 'express'
import {
  createTraining as createTrainingRecord,
  getTrainings as listTrainings,
  getTrainingById as findTrainingById,
  updateTraining as updateTrainingRecord,
  deleteTraining as removeTraining,
  registerParticipant as registerParticipantRecord,
  getParticipants as listParticipants,
  updateParticipant as updateParticipantRecord,
  deleteParticipant as removeParticipant,
  getTrainingStats,
} from '../services/trainingService.js'
import type {
  CreateTrainingBody,
  UpdateTrainingBody,
  UpdateTrainingParams,
  GetTrainingsQuery,
  TrainingIdParam,
  RegisterParticipantBody,
  UpdateParticipantBody,
  UpdateParticipantParams,
  GetParticipantsQuery,
} from '../schemas/trainingSchema.js'

/**
 * Create a new training
 * POST /api/trainings
 */
export async function createTraining(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = req.body as CreateTrainingBody

    const training = await createTrainingRecord({
      ...body,
      createdBy: req.user.userId,
    })

    return res.status(201).json({
      message: 'Training created successfully',
      training,
    })
  } catch (error) {
    console.error('Create training error:', error)
    return res.status(500).json({
      error: 'Failed to create training',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get trainings with filters
 * GET /api/trainings
 */
export async function getTrainings(req: Request, res: Response) {
  try {
    const query = req.query as unknown as GetTrainingsQuery

    const result = await listTrainings(query)

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Get trainings error:', error)
    return res.status(500).json({
      error: 'Failed to fetch trainings',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get training detail
 * GET /api/trainings/:id
 */
export async function getTrainingById(req: Request, res: Response) {
  try {
    const params = req.params as unknown as TrainingIdParam
    const training = await findTrainingById(params.id)

    return res.status(200).json({
      success: true,
      training,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    console.error('Get training detail error:', error)
    return res.status(500).json({
      error: 'Failed to fetch training detail',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Update training
 * PUT /api/trainings/:id
 */
export async function updateTraining(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as UpdateTrainingParams
    const body = req.body as UpdateTrainingBody

    const training = await updateTrainingRecord(params.id, body, req.user.userId)

    return res.status(200).json({
      message: 'Training updated successfully',
      training,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('Only the training creator')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Update training error:', error)
    return res.status(500).json({
      error: 'Failed to update training',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Delete training
 * DELETE /api/trainings/:id
 */
export async function deleteTraining(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as TrainingIdParam
    await removeTraining(params.id, req.user.userId)

    return res.status(200).json({
      message: 'Training deleted successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('Only the training creator')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Delete training error:', error)
    return res.status(500).json({
      error: 'Failed to delete training',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Register a participant for training
 * POST /api/trainings/participants
 */
export async function registerParticipant(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const body = req.body as RegisterParticipantBody

    const participant = await registerParticipantRecord(body, req.user.userId, req.user.role)

    return res.status(201).json({
      message: 'Participant registered successfully',
      participant,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('Only the training creator')) {
      return res.status(403).json({ error: error.message })
    }

    if (
      error instanceof Error &&
      (error.message.includes('already registered') || error.message.includes('reached maximum'))
    ) {
      return res.status(400).json({ error: error.message })
    }

    console.error('Register participant error:', error)
    return res.status(500).json({
      error: 'Failed to register participant',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get training participants
 * GET /api/trainings/participants
 */
export async function getParticipants(req: Request, res: Response) {
  try {
    const query = req.query as unknown as GetParticipantsQuery

    const result = await listParticipants(query)

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Get participants error:', error)
    return res.status(500).json({
      error: 'Failed to fetch participants',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Update participant
 * PUT /api/trainings/participants/:id
 */
export async function updateParticipant(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as UpdateParticipantParams
    const body = req.body as UpdateParticipantBody

    const participant = await updateParticipantRecord(
      params.id,
      body,
      req.user.userId,
      req.user.role
    )

    return res.status(200).json({
      message: 'Participant updated successfully',
      participant,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('Only the training creator')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Update participant error:', error)
    return res.status(500).json({
      error: 'Failed to update participant',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Delete participant
 * DELETE /api/trainings/participants/:id
 */
export async function deleteParticipant(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const params = req.params as unknown as UpdateParticipantParams
    await removeParticipant(params.id, req.user.userId, req.user.role)

    return res.status(200).json({
      message: 'Participant removed successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('Only the training creator')) {
      return res.status(403).json({ error: error.message })
    }

    console.error('Delete participant error:', error)
    return res.status(500).json({
      error: 'Failed to remove participant',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get training statistics
 * GET /api/trainings/stats
 */
export async function getStats(_req: Request, res: Response) {
  try {
    const stats = await getTrainingStats()

    return res.status(200).json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Get training stats error:', error)
    return res.status(500).json({
      error: 'Failed to get training statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
