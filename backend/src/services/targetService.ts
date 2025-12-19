import prisma from '../utils/prisma.js'
import { logEvent } from '../utils/eventLogger.js'

export interface DistributorAllocation {
  distributorId: string
  weight?: number
  newSignTarget?: number
  coreOpportunity?: number
  coreRevenue?: number
  highValueOpp?: number
  highValueRevenue?: number
  note?: string
}

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
  distributorAllocations?: DistributorAllocation[]
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
  const allocations = data.distributorAllocations
  const hasAllocations = allocations && allocations.length > 0

  const target = await prisma.$transaction(async (tx) => {
    const channelTarget = await tx.channelTarget.create({
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
        allocationStatus: hasAllocations ? 'allocated' : 'pending',
      },
    })

    if (hasAllocations) {
      const distributors = await tx.distributor.findMany({
        where: {
          id: { in: allocations.map((a) => a.distributorId) },
          ownerUserId: data.userId,
          deletedAt: null,
        },
        select: { id: true, cooperationLevel: true },
      })
      if (distributors.length !== allocations.length) {
        throw new Error('存在无效或未授权的分销商，无法分配目标')
      }
      const levelMap = Object.fromEntries(distributors.map((d) => [d.id, d.cooperationLevel]))

      for (const a of allocations) {
        await tx.distributorTarget.create({
          data: {
            channelTargetId: channelTarget.id,
            distributorId: a.distributorId,
            year: channelTarget.year,
            quarter: channelTarget.quarter,
            month: channelTarget.month,
            cooperationLevel: levelMap[a.distributorId] ?? 'bronze',
            allocationWeight: a.weight ?? 1,
            allocationMethod: 'manual',
            newSignTarget: a.newSignTarget ?? 0,
            coreOpportunity: a.coreOpportunity ?? 0,
            coreRevenue: a.coreRevenue ?? 0,
            highValueOpp: a.highValueOpp ?? 0,
            highValueRevenue: a.highValueRevenue ?? 0,
            note: a.note,
          },
        })
      }
    }

    return tx.channelTarget.findUnique({
      where: { id: channelTarget.id },
      include: {
        user: { select: { id: true, username: true, name: true, role: true } },
        distributorTargets: hasAllocations
          ? { include: { distributor: { select: { id: true, name: true, region: true, cooperationLevel: true } } } }
          : false,
      },
    })
  })

  await logEvent({
    eventType: 'target_created',
    entityType: 'channel_target',
    entityId: target!.id,
    userId: data.userId,
    payload: {
      targetType: target!.targetType,
      year: target!.year,
      quarter: target!.quarter,
      month: target!.month,
      distributorCount: allocations?.length ?? 0,
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

export async function getTargetById(id: string, includeDistributorTargets = false) {
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
      ...(includeDistributorTargets && {
        distributorTargets: {
          include: {
            distributor: { select: { id: true, name: true, region: true, cooperationLevel: true } },
          },
          orderBy: { allocationWeight: 'desc' as const },
        },
      }),
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
