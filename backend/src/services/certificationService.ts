import prisma from '../utils/prisma.js'
import type {
  CreateCertificationBody,
  UpdateCertificationBody,
  GetCertificationsQuery,
} from '../schemas/certificationSchema.js'
import { randomBytes } from 'crypto'

/**
 * Generate unique verification code
 * Fix: Add retry logic to ensure uniqueness
 */
async function generateVerificationCode(): Promise<string> {
  const maxRetries = 10

  for (let i = 0; i < maxRetries; i++) {
    const code = randomBytes(8).toString('hex').toUpperCase()

    // Check if code already exists
    const existing = await prisma.certification.findUnique({
      where: { verificationCode: code },
    })

    if (!existing) {
      return code
    }
  }

  throw new Error('Failed to generate unique verification code after multiple attempts')
}

/**
 * Create a new certification
 */
export async function createCertification(data: CreateCertificationBody) {
  // Check if distributor exists
  const distributor = await prisma.distributor.findUnique({
    where: { id: data.distributorId },
  })

  if (!distributor) {
    throw new Error('Distributor not found')
  }

  // Check for duplicate certification (same distributor + certType + level)
  const existing = await prisma.certification.findUnique({
    where: {
      distributorId_certType_level: {
        distributorId: data.distributorId,
        certType: data.certType,
        level: data.level,
      },
    },
  })

  if (existing) {
    throw new Error('Certification already exists for this distributor with the same type and level')
  }

  const verificationCode = await generateVerificationCode()

  const certification = await prisma.certification.create({
    data: {
      ...data,
      obtainedDate: new Date(data.obtainedDate),
      expiryDate: new Date(data.expiryDate),
      examDate: data.examDate ? new Date(data.examDate) : undefined,
      verificationCode,
    },
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
          contactPerson: true,
        },
      },
    },
  })

  return certification
}

/**
 * Get certifications with filters and pagination
 */
export async function getCertifications(query: GetCertificationsQuery) {
  const { page = 1, limit = 20, distributorId, certType, level, status, expiringDays } = query

  const where: any = {}

  if (distributorId) {
    where.distributorId = distributorId
  }

  if (certType) {
    where.certType = certType
  }

  if (level) {
    where.level = level
  }

  if (status) {
    where.status = status
  }

  // Get certifications expiring within X days
  // Fix: Only set status to 'valid' if user hasn't specified a status
  if (expiringDays) {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + expiringDays)

    where.expiryDate = {
      gte: now,
      lte: futureDate,
    }

    if (!status) {
      where.status = 'valid'
    }
  }

  const [certifications, total] = await Promise.all([
    prisma.certification.findMany({
      where,
      include: {
        distributor: {
          select: {
            id: true,
            name: true,
            region: true,
            contactPerson: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { expiryDate: 'desc' },
    }),
    prisma.certification.count({ where }),
  ])

  return {
    certifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get certification by ID
 */
export async function getCertificationById(id: string) {
  const certification = await prisma.certification.findUnique({
    where: { id },
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
          contactPerson: true,
          phone: true,
        },
      },
    },
  })

  if (!certification) {
    throw new Error('Certification not found')
  }

  return certification
}

/**
 * Get certification by verification code
 */
export async function getCertificationByVerificationCode(verificationCode: string) {
  const certification = await prisma.certification.findUnique({
    where: { verificationCode },
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
          contactPerson: true,
        },
      },
    },
  })

  if (!certification) {
    throw new Error('Certification not found with this verification code')
  }

  return certification
}

/**
 * Update certification
 * Fix: Check for uniqueness conflict if key fields are being updated
 */
export async function updateCertification(id: string, data: UpdateCertificationBody) {
  const existing = await prisma.certification.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new Error('Certification not found')
  }

  // Check for uniqueness conflict if distributorId, certType, or level is being updated
  if (data.distributorId || data.certType || data.level) {
    const newDistributorId = data.distributorId ?? existing.distributorId
    const newCertType = data.certType ?? existing.certType
    const newLevel = data.level ?? existing.level

    // Only check if the combination is actually changing
    const isChanging =
      newDistributorId !== existing.distributorId ||
      newCertType !== existing.certType ||
      newLevel !== existing.level

    if (isChanging) {
      const duplicate = await prisma.certification.findUnique({
        where: {
          distributorId_certType_level: {
            distributorId: newDistributorId,
            certType: newCertType,
            level: newLevel,
          },
        },
      })

      if (duplicate && duplicate.id !== id) {
        throw new Error('Certification already exists for this distributor with the same type and level')
      }
    }
  }

  const updated = await prisma.certification.update({
    where: { id },
    data: {
      ...data,
      obtainedDate: data.obtainedDate ? new Date(data.obtainedDate) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      examDate: data.examDate ? new Date(data.examDate) : undefined,
    },
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
        },
      },
    },
  })

  return updated
}

/**
 * Delete certification
 */
export async function deleteCertification(id: string) {
  const certification = await prisma.certification.findUnique({
    where: { id },
  })

  if (!certification) {
    throw new Error('Certification not found')
  }

  await prisma.certification.delete({
    where: { id },
  })
}

/**
 * Check and update expired certifications
 */
export async function updateExpiredCertifications() {
  const now = new Date()

  const result = await prisma.certification.updateMany({
    where: {
      expiryDate: {
        lt: now,
      },
      status: 'valid',
    },
    data: {
      status: 'expired',
    },
  })

  return result.count
}

/**
 * Get certification statistics
 */
export async function getCertificationStats() {
  const [
    totalCertifications,
    validCertifications,
    expiredCertifications,
    expiringIn30Days,
    certsByLevel,
    certsByType,
  ] = await Promise.all([
    prisma.certification.count(),
    prisma.certification.count({ where: { status: 'valid' } }),
    prisma.certification.count({ where: { status: 'expired' } }),
    prisma.certification.count({
      where: {
        status: 'valid',
        expiryDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.certification.groupBy({
      by: ['level'],
      _count: { id: true },
    }),
    prisma.certification.groupBy({
      by: ['certType'],
      _count: { id: true },
    }),
  ])

  return {
    totalCertifications,
    validCertifications,
    expiredCertifications,
    expiringIn30Days,
    certsByLevel: certsByLevel.map((stat) => ({
      level: stat.level,
      count: stat._count.id,
    })),
    certsByType: certsByType.map((stat) => ({
      type: stat.certType,
      count: stat._count.id,
    })),
  }
}
