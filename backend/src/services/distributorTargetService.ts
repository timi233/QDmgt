import { Prisma } from '@prisma/client'
import prisma from '../utils/prisma.js'

// Cooperation level weights for target allocation
const LEVEL_WEIGHTS: Record<string, number> = {
  bronze: 0.6,
  silver: 1.0,
  gold: 1.3,
  platinum: 1.6,
}

interface AllocateTargetsInput {
  channelTargetId: string
  distributorIds?: string[]
  overrides?: Record<string, { weight?: number; note?: string }>
}

interface UpdateCompletionInput {
  distributorTargetId: string
  field: 'newSign' | 'coreOpp' | 'coreRev' | 'highValueOpp' | 'highValueRev'
  value: number
}

export const distributorTargetService = {
  /**
   * Allocate channel target to distributors based on cooperation level
   */
  async allocateTargets({ channelTargetId, distributorIds, overrides = {} }: AllocateTargetsInput) {
    const channelTarget = await prisma.channelTarget.findUnique({
      where: { id: channelTargetId },
      include: { user: true },
    })
    if (!channelTarget) throw new Error('Channel target not found')

    // Get distributors owned by the target owner
    const whereClause: Prisma.DistributorWhereInput = {
      ownerUserId: channelTarget.userId,
      deletedAt: null,
    }
    if (distributorIds?.length) {
      whereClause.id = { in: distributorIds }
    }

    const distributors = await prisma.distributor.findMany({ where: whereClause })
    if (!distributors.length) throw new Error('No distributors found for allocation')

    // Calculate total weight
    const totalWeight = distributors.reduce((sum, d) => {
      const override = overrides[d.id]
      return sum + (override?.weight ?? LEVEL_WEIGHTS[d.cooperationLevel] ?? 1)
    }, 0)
    if (totalWeight <= 0) throw new Error('Total allocation weight must be positive')

    // Create distributor targets
    const targets = distributors.map((d) => {
      const weight = overrides[d.id]?.weight ?? LEVEL_WEIGHTS[d.cooperationLevel] ?? 1
      const ratio = weight / totalWeight

      return {
        channelTargetId,
        distributorId: d.id,
        year: channelTarget.year,
        quarter: channelTarget.quarter,
        month: channelTarget.month,
        cooperationLevel: d.cooperationLevel,
        allocationWeight: weight,
        allocationMethod: overrides[d.id]?.weight ? 'manual' : 'auto',
        newSignTarget: channelTarget.newSignTarget * ratio,
        coreOpportunity: channelTarget.coreOpportunity * ratio,
        coreRevenue: channelTarget.coreRevenue * ratio,
        highValueOpp: channelTarget.highValueOpp * ratio,
        highValueRevenue: channelTarget.highValueRevenue * ratio,
        note: overrides[d.id]?.note,
      }
    })

    // Upsert all targets in transaction
    return prisma.$transaction(
      targets.map((t) =>
        prisma.distributorTarget.upsert({
          where: {
            channelTargetId_distributorId: {
              channelTargetId: t.channelTargetId,
              distributorId: t.distributorId,
            },
          },
          create: t,
          update: {
            allocationWeight: t.allocationWeight,
            allocationMethod: t.allocationMethod,
            newSignTarget: t.newSignTarget,
            coreOpportunity: t.coreOpportunity,
            coreRevenue: t.coreRevenue,
            highValueOpp: t.highValueOpp,
            highValueRevenue: t.highValueRevenue,
            note: t.note,
          },
        })
      )
    )
  },

  /**
   * Update completion value for a distributor target
   */
  async updateCompletion({ distributorTargetId, field, value }: UpdateCompletionInput) {
    const fieldMap: Record<string, string> = {
      newSign: 'newSignCompleted',
      coreOpp: 'coreOppCompleted',
      coreRev: 'coreRevCompleted',
      highValueOpp: 'highValueOppCompleted',
      highValueRev: 'highValueRevCompleted',
    }
    if (!fieldMap[field]) throw new Error(`Invalid field: ${field}`)

    const target = await prisma.distributorTarget.update({
      where: { id: distributorTargetId },
      data: { [fieldMap[field]]: value },
    })

    // Trigger aggregation
    await this.aggregateToChannelTarget(target.channelTargetId)
    return target
  },

  /**
   * Aggregate distributor completions to channel target
   */
  async aggregateToChannelTarget(channelTargetId: string) {
    const aggregation = await prisma.distributorTarget.aggregate({
      where: { channelTargetId },
      _sum: {
        newSignCompleted: true,
        coreOppCompleted: true,
        coreRevCompleted: true,
        highValueOppCompleted: true,
        highValueRevCompleted: true,
      },
    })

    return prisma.channelTarget.update({
      where: { id: channelTargetId },
      data: {
        newSignCompleted: aggregation._sum.newSignCompleted ?? 0,
        coreOppCompleted: aggregation._sum.coreOppCompleted ?? 0,
        coreRevCompleted: aggregation._sum.coreRevCompleted ?? 0,
        highValueOppComp: aggregation._sum.highValueOppCompleted ?? 0,
        highValueRevComp: aggregation._sum.highValueRevCompleted ?? 0,
      },
    })
  },

  /**
   * Get distributor targets for a channel target
   */
  async getByChannelTarget(channelTargetId: string) {
    return prisma.distributorTarget.findMany({
      where: { channelTargetId },
      include: { distributor: { select: { id: true, name: true, region: true, cooperationLevel: true } } },
      orderBy: { allocationWeight: 'desc' },
    })
  },

  /**
   * Get distributor targets for a specific distributor
   */
  async getByDistributor(distributorId: string, year?: number, quarter?: string) {
    const where: Prisma.DistributorTargetWhereInput = { distributorId }
    if (year) where.year = year
    if (quarter) where.quarter = quarter

    return prisma.distributorTarget.findMany({
      where,
      include: { channelTarget: true },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }, { month: 'desc' }],
    })
  },

  /**
   * Get single distributor target by ID
   */
  async getById(id: string) {
    return prisma.distributorTarget.findUnique({
      where: { id },
      include: {
        distributor: { select: { id: true, name: true, region: true, cooperationLevel: true } },
        channelTarget: true,
      },
    })
  },

  /**
   * Delete distributor target
   */
  async delete(id: string) {
    const target = await prisma.distributorTarget.delete({ where: { id } })
    await this.aggregateToChannelTarget(target.channelTargetId)
    return target
  },

  /**
   * Create target for a single distributor (bottom-up flow)
   * Auto-creates ChannelTarget if not exists
   */
  async createForDistributor(input: {
    distributorId: string
    userId: string
    year: number
    quarter?: string
    month?: number
    targetType: 'yearly' | 'quarterly' | 'monthly'
    newSignTarget?: number
    coreOpportunity?: number
    coreRevenue?: number
    highValueOpp?: number
    highValueRevenue?: number
    note?: string
  }) {
    return prisma.$transaction(async (tx) => {
      // Verify distributor ownership
      const distributor = await tx.distributor.findUnique({
        where: { id: input.distributorId },
        select: { cooperationLevel: true, ownerUserId: true, deletedAt: true },
      })
      if (!distributor || distributor.deletedAt || distributor.ownerUserId !== input.userId) {
        throw new Error('分销商不存在或不属于当前负责人')
      }

      // Find or create ChannelTarget
      let channelTarget = await tx.channelTarget.findFirst({
        where: {
          userId: input.userId,
          year: input.year,
          quarter: input.quarter ?? null,
          month: input.month ?? null,
          targetType: input.targetType,
        },
      })

      if (!channelTarget) {
        channelTarget = await tx.channelTarget.create({
          data: {
            userId: input.userId,
            year: input.year,
            quarter: input.quarter,
            month: input.month,
            targetType: input.targetType,
            allocationStatus: 'partial',
          },
        })
      }

      // Create or update distributor target
      const distributorTarget = await tx.distributorTarget.upsert({
        where: {
          channelTargetId_distributorId: {
            channelTargetId: channelTarget.id,
            distributorId: input.distributorId,
          },
        },
        create: {
          channelTargetId: channelTarget.id,
          distributorId: input.distributorId,
          year: input.year,
          quarter: input.quarter,
          month: input.month,
          cooperationLevel: distributor.cooperationLevel,
          allocationMethod: 'manual',
          allocationWeight: 1,
          newSignTarget: input.newSignTarget ?? 0,
          coreOpportunity: input.coreOpportunity ?? 0,
          coreRevenue: input.coreRevenue ?? 0,
          highValueOpp: input.highValueOpp ?? 0,
          highValueRevenue: input.highValueRevenue ?? 0,
          note: input.note,
        },
        update: {
          ...(input.newSignTarget !== undefined && { newSignTarget: input.newSignTarget }),
          ...(input.coreOpportunity !== undefined && { coreOpportunity: input.coreOpportunity }),
          ...(input.coreRevenue !== undefined && { coreRevenue: input.coreRevenue }),
          ...(input.highValueOpp !== undefined && { highValueOpp: input.highValueOpp }),
          ...(input.highValueRevenue !== undefined && { highValueRevenue: input.highValueRevenue }),
          ...(input.note !== undefined && { note: input.note }),
        },
        include: {
          distributor: { select: { id: true, name: true, region: true, cooperationLevel: true } },
          channelTarget: true,
        },
      })

      // Update channel target totals
      const aggregation = await tx.distributorTarget.aggregate({
        where: { channelTargetId: channelTarget.id },
        _sum: {
          newSignTarget: true,
          coreOpportunity: true,
          coreRevenue: true,
          highValueOpp: true,
          highValueRevenue: true,
        },
      })

      await tx.channelTarget.update({
        where: { id: channelTarget.id },
        data: {
          newSignTarget: aggregation._sum.newSignTarget ?? 0,
          coreOpportunity: aggregation._sum.coreOpportunity ?? 0,
          coreRevenue: aggregation._sum.coreRevenue ?? 0,
          highValueOpp: aggregation._sum.highValueOpp ?? 0,
          highValueRevenue: aggregation._sum.highValueRevenue ?? 0,
          allocationStatus: 'partial',
        },
      })

      return distributorTarget
    })
  },
}
