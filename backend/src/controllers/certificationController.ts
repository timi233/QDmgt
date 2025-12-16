import { Request, Response } from 'express'
import {
  createCertification as createCertificationRecord,
  getCertifications as listCertifications,
  getCertificationById as findCertificationById,
  getCertificationByVerificationCode,
  updateCertification as updateCertificationRecord,
  deleteCertification as removeCertification,
  updateExpiredCertifications,
  getCertificationStats,
} from '../services/certificationService.js'
import type {
  CreateCertificationBody,
  UpdateCertificationBody,
  UpdateCertificationParams,
  GetCertificationsQuery,
  CertificationIdParam,
} from '../schemas/certificationSchema.js'

/**
 * Create a new certification
 * POST /api/certifications
 */
export async function createCertification(req: Request, res: Response) {
  try {
    const body = req.body as CreateCertificationBody

    const certification = await createCertificationRecord(body)

    return res.status(201).json({
      message: 'Certification created successfully',
      certification,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message })
    }

    console.error('Create certification error:', error)
    return res.status(500).json({
      error: 'Failed to create certification',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get certifications with filters
 * GET /api/certifications
 */
export async function getCertifications(req: Request, res: Response) {
  try {
    const query = req.query as unknown as GetCertificationsQuery

    const result = await listCertifications(query)

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Get certifications error:', error)
    return res.status(500).json({
      error: 'Failed to fetch certifications',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get certification detail
 * GET /api/certifications/:id
 */
export async function getCertificationById(req: Request, res: Response) {
  try {
    const params = req.params as unknown as CertificationIdParam
    const certification = await findCertificationById(params.id)

    return res.status(200).json({
      success: true,
      certification,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    console.error('Get certification detail error:', error)
    return res.status(500).json({
      error: 'Failed to fetch certification detail',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Verify certification by verification code
 * GET /api/certifications/verify/:code
 */
export async function verifyCertification(req: Request, res: Response) {
  try {
    const { code } = req.params
    const certification = await getCertificationByVerificationCode(code)

    return res.status(200).json({
      success: true,
      certification,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    console.error('Verify certification error:', error)
    return res.status(500).json({
      error: 'Failed to verify certification',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Update certification
 * PUT /api/certifications/:id
 */
export async function updateCertification(req: Request, res: Response) {
  try {
    const params = req.params as unknown as UpdateCertificationParams
    const body = req.body as UpdateCertificationBody

    const certification = await updateCertificationRecord(params.id, body)

    return res.status(200).json({
      message: 'Certification updated successfully',
      certification,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message })
    }

    console.error('Update certification error:', error)
    return res.status(500).json({
      error: 'Failed to update certification',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Delete certification
 * DELETE /api/certifications/:id
 */
export async function deleteCertification(req: Request, res: Response) {
  try {
    const params = req.params as unknown as CertificationIdParam
    await removeCertification(params.id)

    return res.status(200).json({
      message: 'Certification deleted successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }

    console.error('Delete certification error:', error)
    return res.status(500).json({
      error: 'Failed to delete certification',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Update expired certifications
 * POST /api/certifications/update-expired
 */
export async function updateExpired(_req: Request, res: Response) {
  try {
    const count = await updateExpiredCertifications()

    return res.status(200).json({
      message: `Updated ${count} expired certifications`,
      count,
    })
  } catch (error) {
    console.error('Update expired certifications error:', error)
    return res.status(500).json({
      error: 'Failed to update expired certifications',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Get certification statistics
 * GET /api/certifications/stats
 */
export async function getStats(_req: Request, res: Response) {
  try {
    const stats = await getCertificationStats()

    return res.status(200).json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Get certification stats error:', error)
    return res.status(500).json({
      error: 'Failed to get certification statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
