import prisma from '../utils/prisma.js'
import { logEvent } from '../utils/eventLogger.js'

export interface CreateTargetInput {
  year: number
  quarter?: string
  month?: number
  targetType: 'yearly' | 'quarterly' | 'monthly'
  newSignTarget?: number
  coreOpportunity?: number
  coreRevenue?: number
  highValueOpp?: number
  highValueRevenue?: number
  description?: string
  userId: string
}

export interface UpdateTargetInput {
  newSignCompleted?: number
  coreOppCompleted?: number
  coreRevCompleted?: number
  highValueOppComp?: number
  highValueRevComp?: number
  description?: string
}

export async function createTarget(data: CreateTargetInput) {
  const target = await prisma.channelTarget.create({
    data: {
      year: data.year,
      quarter: data.quarter,
      month: data.month,
      targetType: data.targetType,
      newSignTarget: data.newSignTarget || 0,
      coreOpportunity: data.coreOpportunity || 0,
      coreRevenue: data.coreRevenue || 0,
      highValueOpp: data.highValueOpp || 0,
      highValueRevenue: data.highValueRevenue || 0,
      description: data.description,
      userId: data.userId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
        },
      },
    },
  })

  await logEvent({
    eventType: 'target_created',
    entityType: 'channel_target',
    entityId: target.id,
    userId: data.userId,
    payload: {
      targetType: target.targetType,
      year: target.year,
      quarter: target.quarter,
      month: target.month,
    },
  })

  return target
}

export async function getTargets(filters: {
  year?: number
  quarter?: string
  month?: number
  targetType?: string
  userId?: string
}) {
  const where: any = {}

  if (filters.year) where.year = filters.year
  if (filters.quarter) where.quarter = filters.quarter
  if (filters.month) where.month = filters.month
  if (filters.targetType) where.targetType = filters.targetType
  if (filters.userId) where.userId = filters.userId

  const targets = await prisma.channelTarget.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: [{ year: 'desc' }, { quarter: 'desc' }, { month: 'desc' }],
  })

  return targets
}

export async function getTargetById(id: string) {
  const target = await prisma.channelTarget.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
        },
      },
    },
  })

  if (!target) {
    throw new Error('目标不存在')
  }

  return target
}

export async function updateTarget(id: string, data: UpdateTargetInput, userId: string) {
  const target = await prisma.channelTarget.update({
    where: { id },
    data: {
      newSignCompleted: data.newSignCompleted,
      coreOppCompleted: data.coreOppCompleted,
      coreRevCompleted: data.coreRevCompleted,
      highValueOppComp: data.highValueOppComp,
      highValueRevComp: data.highValueRevComp,
      description: data.description,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
        },
      },
    },
  })

  await logEvent({
    eventType: 'target_updated',
    entityType: 'channel_target',
    entityId: target.id,
    userId,
    payload: {
      targetType: target.targetType,
      year: target.year,
      updates: data,
    },
  })

  return target
}

export async function deleteTarget(id: string, userId: string) {
  const target = await prisma.channelTarget.delete({
    where: { id },
  })

  await logEvent({
    eventType: 'target_deleted',
    entityType: 'channel_target',
    entityId: target.id,
    userId,
    payload: {
      targetType: target.targetType,
      year: target.year,
      quarter: target.quarter,
    },
  })

  return target
}

export async function getTargetStatistics(filters: {
  year?: number
  quarter?: string
}) {
  const where: any = {}
  if (filters.year) where.year = filters.year
  if (filters.quarter) where.quarter = filters.quarter

  const targets = await prisma.channelTarget.findMany({
    where,
  })

  const stats = {
    totalTargets: targets.length,
    totalNewSignTarget: 0,
    totalNewSignCompleted: 0,
    totalCoreRevenue: 0,
    totalCoreRevCompleted: 0,
    totalHighValueRevenue: 0,
    totalHighValueRevComp: 0,
    newSignCompletionRate: 0,
    coreRevenueCompletionRate: 0,
    highValueCompletionRate: 0,
  }

  targets.forEach((target) => {
    stats.totalNewSignTarget += target.newSignTarget
    stats.totalNewSignCompleted += target.newSignCompleted
    stats.totalCoreRevenue += target.coreRevenue
    stats.totalCoreRevCompleted += target.coreRevCompleted
    stats.totalHighValueRevenue += target.highValueRevenue
    stats.totalHighValueRevComp += target.highValueRevComp
  })

  if (stats.totalNewSignTarget > 0) {
    stats.newSignCompletionRate = (stats.totalNewSignCompleted / stats.totalNewSignTarget) * 100
  }
  if (stats.totalCoreRevenue > 0) {
    stats.coreRevenueCompletionRate = (stats.totalCoreRevCompleted / stats.totalCoreRevenue) * 100
  }
  if (stats.totalHighValueRevenue > 0) {
    stats.highValueCompletionRate = (stats.totalHighValueRevComp / stats.totalHighValueRevenue) * 100
  }

  return stats
}
