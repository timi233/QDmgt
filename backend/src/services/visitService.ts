import prisma from '../utils/prisma.js'
import { logEvent } from '../utils/eventLogger.js'

/**
 * Ensure user has access to visit record
 * Leaders can access all visits, sales can only access their own
 */
function ensureVisitAccess(visit: { userId: string }, userId: string, userRole: string) {
  if (userRole === 'leader') return
  if (visit.userId !== userId) {
    throw new Error('Visit record not found or access denied')
  }
}

export interface CreateVisitInput {
  distributorId: string
  userId: string
  visitDate: Date
  visitType: 'onsite' | 'online' | 'phone' | 'meeting'
  purpose: string
  participants?: string
  keyDiscussions?: string
  feedback?: string
  nextSteps?: string
  satisfactionScore?: number
}

export interface UpdateVisitInput {
  visitDate?: Date
  visitType?: 'onsite' | 'online' | 'phone' | 'meeting'
  purpose?: string
  participants?: string
  keyDiscussions?: string
  feedback?: string
  nextSteps?: string
  satisfactionScore?: number
}

export interface VisitQueryOptions {
  distributorId?: string
  userId?: string
  visitType?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

/**
 * Create a new partner visit record
 */
export async function createVisit(data: CreateVisitInput) {
  const visit = await prisma.partnerVisit.create({
    data: {
      distributorId: data.distributorId,
      userId: data.userId,
      visitDate: data.visitDate,
      visitType: data.visitType,
      purpose: data.purpose,
      participants: data.participants,
      keyDiscussions: data.keyDiscussions,
      feedback: data.feedback,
      nextSteps: data.nextSteps,
      satisfactionScore: data.satisfactionScore,
    },
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
        },
      },
      visitor: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
  })

  // Update distributor's lastContactDate
  await prisma.distributor.update({
    where: { id: data.distributorId },
    data: { lastContactDate: data.visitDate },
  })

  // Log event
  await logEvent({
    eventType: 'partner_visit_created',
    entityType: 'partner_visit',
    entityId: visit.id,
    userId: data.userId,
    payload: {
      distributorName: visit.distributor.name,
      visitType: visit.visitType,
      visitDate: visit.visitDate,
    },
  })

  return visit
}

/**
 * Get all visits with filters and pagination
 */
export async function getVisits(options: VisitQueryOptions) {
  const { page = 1, limit = 20, ...filters } = options

  const where: any = {}

  if (filters.distributorId) {
    where.distributorId = filters.distributorId
  }

  if (filters.userId) {
    where.userId = filters.userId
  }

  if (filters.visitType) {
    where.visitType = filters.visitType
  }

  if (filters.startDate || filters.endDate) {
    where.visitDate = {}
    if (filters.startDate) {
      where.visitDate.gte = filters.startDate
    }
    if (filters.endDate) {
      where.visitDate.lte = filters.endDate
    }
  }

  const total = await prisma.partnerVisit.count({ where })

  const visits = await prisma.partnerVisit.findMany({
    where,
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
          channelTier: true,
        },
      },
      visitor: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
    orderBy: {
      visitDate: 'desc',
    },
    skip: (page - 1) * limit,
    take: limit,
  })

  return {
    visits,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get visit by ID
 */
export async function getVisitById(id: string, userId: string, userRole: string) {
  const visit = await prisma.partnerVisit.findUnique({
    where: { id },
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
          channelTier: true,
          contactPerson: true,
          phone: true,
        },
      },
      visitor: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!visit) {
    throw new Error('Visit record not found')
  }

  ensureVisitAccess(visit, userId, userRole)
  return visit
}

/**
 * Update visit record
 */
export async function updateVisit(
  id: string,
  data: UpdateVisitInput,
  userId: string,
  userRole: string
) {
  const existing = await prisma.partnerVisit.findUnique({ where: { id } })
  if (!existing) {
    throw new Error('Visit record not found')
  }
  ensureVisitAccess(existing, userId, userRole)

  const visit = await prisma.partnerVisit.update({
    where: { id },
    data: {
      ...data,
    },
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
        },
      },
      visitor: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
  })

  // Log event
  await logEvent({
    eventType: 'partner_visit_updated',
    entityType: 'partner_visit',
    entityId: id,
    userId,
    payload: {
      distributorName: visit.distributor.name,
      updatedFields: Object.keys(data),
    },
  })

  return visit
}

/**
 * Delete visit record
 */
export async function deleteVisit(id: string, userId: string, userRole: string) {
  const existing = await prisma.partnerVisit.findUnique({ where: { id } })
  if (!existing) {
    throw new Error('Visit record not found')
  }
  ensureVisitAccess(existing, userId, userRole)

  const visit = await prisma.partnerVisit.delete({
    where: { id },
  })

  // Log event
  await logEvent({
    eventType: 'partner_visit_deleted',
    entityType: 'partner_visit',
    entityId: id,
    userId,
    payload: {
      distributorId: visit.distributorId,
      visitDate: visit.visitDate,
    },
  })

  return visit
}

/**
 * Get visit statistics for a distributor
 */
export async function getDistributorVisitStats(distributorId: string) {
  const visits = await prisma.partnerVisit.findMany({
    where: { distributorId },
    orderBy: { visitDate: 'desc' },
  })

  const totalVisits = visits.length
  const lastVisit = visits[0]
  const avgSatisfaction = visits
    .filter((v) => v.satisfactionScore !== null)
    .reduce((sum, v) => sum + (v.satisfactionScore || 0), 0) /
    (visits.filter((v) => v.satisfactionScore !== null).length || 1)

  const visitsByType = visits.reduce((acc, visit) => {
    acc[visit.visitType] = (acc[visit.visitType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    totalVisits,
    lastVisit: lastVisit
      ? {
          date: lastVisit.visitDate,
          type: lastVisit.visitType,
          purpose: lastVisit.purpose,
        }
      : null,
    avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
    visitsByType,
  }
}
