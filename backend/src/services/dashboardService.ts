import prisma from '../utils/prisma.js'

export interface DashboardKPI {
  totalDistributors: number
  newDistributors: number
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  conversionRate: number
  regionDistribution: RegionData[]
  levelDistribution: LevelData[]
  taskStatusDistribution: TaskStatusData[]
}

export interface RegionData {
  region: string
  count: number
  percentage: number
}

export interface LevelData {
  level: string
  count: number
  percentage: number
}

export interface TaskStatusData {
  status: string
  count: number
  percentage: number
}

export interface DashboardFilters {
  dateRange?: {
    start: Date
    end: Date
  }
  region?: string
  cooperationLevel?: string
  ownerId?: string
}

export interface DistributorListItem {
  id: string
  name: string
  region: string
  contactPerson: string
  phone: string
  cooperationLevel: string
  creditLimit: number
  ownerName: string
  taskCount: number
  completedTaskCount: number
  createdAt: Date
}

/**
 * Get dashboard KPIs for leaders
 */
export async function getDashboardKPIs(filters: DashboardFilters = {}): Promise<DashboardKPI> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Build base where clause
  const distributorWhere: any = {
    deletedAt: null,
  }

  if (filters.region) {
    distributorWhere.region = { contains: filters.region }
  }

  if (filters.cooperationLevel) {
    distributorWhere.cooperationLevel = filters.cooperationLevel
  }

  if (filters.ownerId) {
    distributorWhere.ownerUserId = filters.ownerId
  }

  // Get total distributors count
  const totalDistributors = await prisma.distributor.count({
    where: distributorWhere,
  })

  // Get new distributors (last 30 days)
  const newDistributors = await prisma.distributor.count({
    where: {
      ...distributorWhere,
      createdAt: { gte: thirtyDaysAgo },
    },
  })

  // Get task counts
  const taskWhere: any = {}
  if (filters.dateRange) {
    taskWhere.createdAt = {
      gte: filters.dateRange.start,
      lte: filters.dateRange.end,
    }
  }

  const totalTasks = await prisma.task.count({ where: taskWhere })
  const completedTasks = await prisma.task.count({
    where: { ...taskWhere, status: 'completed' },
  })
  const pendingTasks = await prisma.task.count({
    where: { ...taskWhere, status: 'pending' },
  })
  const overdueTasks = await prisma.task.count({
    where: { ...taskWhere, status: 'overdue' },
  })

  // Calculate conversion rate (completed tasks / total tasks)
  const conversionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Get region distribution
  const regionGroups = await prisma.distributor.groupBy({
    by: ['region'],
    where: distributorWhere,
    _count: { id: true },
  })

  const regionDistribution: RegionData[] = regionGroups.map(group => ({
    region: group.region,
    count: group._count.id,
    percentage: totalDistributors > 0
      ? Math.round((group._count.id / totalDistributors) * 100)
      : 0,
  }))

  // Get cooperation level distribution
  const levelGroups = await prisma.distributor.groupBy({
    by: ['cooperationLevel'],
    where: distributorWhere,
    _count: { id: true },
  })

  const levelDistribution: LevelData[] = levelGroups.map(group => ({
    level: group.cooperationLevel,
    count: group._count.id,
    percentage: totalDistributors > 0
      ? Math.round((group._count.id / totalDistributors) * 100)
      : 0,
  }))

  // Get task status distribution
  const taskStatusGroups = await prisma.task.groupBy({
    by: ['status'],
    where: taskWhere,
    _count: { id: true },
  })

  const taskStatusDistribution: TaskStatusData[] = taskStatusGroups.map(group => ({
    status: group.status,
    count: group._count.id,
    percentage: totalTasks > 0
      ? Math.round((group._count.id / totalTasks) * 100)
      : 0,
  }))

  return {
    totalDistributors,
    newDistributors,
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    conversionRate,
    regionDistribution,
    levelDistribution,
    taskStatusDistribution,
  }
}

/**
 * Get distributors list for dashboard with aggregated task info
 */
export async function getDashboardDistributors(
  page: number = 1,
  limit: number = 20,
  filters: DashboardFilters = {}
): Promise<{ distributors: DistributorListItem[]; total: number; page: number; limit: number }> {
  const where: any = {
    deletedAt: null,
  }

  if (filters.region) {
    where.region = { contains: filters.region }
  }

  if (filters.cooperationLevel) {
    where.cooperationLevel = filters.cooperationLevel
  }

  if (filters.ownerId) {
    where.ownerUserId = filters.ownerId
  }

  const total = await prisma.distributor.count({ where })

  const distributors = await prisma.distributor.findMany({
    where,
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      tasks: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  })

  const formattedDistributors: DistributorListItem[] = distributors.map(d => ({
    id: d.id,
    name: d.name,
    region: d.region,
    contactPerson: d.contactPerson,
    phone: d.phone,
    cooperationLevel: d.cooperationLevel,
    creditLimit: d.creditLimit,
    ownerName: d.owner.name || d.owner.username,
    taskCount: d.tasks.length,
    completedTaskCount: d.tasks.filter(t => t.status === 'completed').length,
    createdAt: d.createdAt,
  }))

  return {
    distributors: formattedDistributors,
    total,
    page,
    limit,
  }
}

/**
 * Get sales performance rankings
 */
export async function getSalesRankings(limit: number = 10): Promise<{
  salesId: string
  salesName: string
  distributorCount: number
  taskCompletedCount: number
  conversionRate: number
}[]> {
  // Get all sales users with their distributors and tasks
  const salesUsers = await prisma.user.findMany({
    where: { role: 'sales' },
    include: {
      distributors: {
        where: { deletedAt: null },
        select: { id: true },
      },
      assignedTasks: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  })

  const rankings = salesUsers.map(user => {
    const totalTasks = user.assignedTasks.length
    const completedTasks = user.assignedTasks.filter(t => t.status === 'completed').length

    return {
      salesId: user.id,
      salesName: user.name || user.username,
      distributorCount: user.distributors.length,
      taskCompletedCount: completedTasks,
      conversionRate: totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0,
    }
  })

  // Sort by completed tasks desc
  rankings.sort((a, b) => b.taskCompletedCount - a.taskCompletedCount)

  return rankings.slice(0, limit)
}

/**
 * Get trend data for charts (last 7 days)
 */
export async function getTrendData(): Promise<{
  date: string
  distributors: number
  tasks: number
  completedTasks: number
}[]> {
  const days = 7
  const windows = Array.from({ length: days }, (_v, idx) => {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1 - idx))
    date.setHours(0, 0, 0, 0)
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    return { label: date.toISOString().split('T')[0], start: date, end: nextDate }
  })

  return Promise.all(
    windows.map(async ({ label, start, end }) => {
      const [distributorCount, taskCount, completedTaskCount] = await Promise.all([
        prisma.distributor.count({
          where: { createdAt: { gte: start, lt: end }, deletedAt: null },
        }),
        prisma.task.count({ where: { createdAt: { gte: start, lt: end } } }),
        prisma.task.count({
          where: { completedAt: { gte: start, lt: end }, status: 'completed' },
        }),
      ])

      return {
        date: label,
        distributors: distributorCount,
        tasks: taskCount,
        completedTasks: completedTaskCount,
      }
    })
  )
}

/**
 * Get enhanced channel dashboard with health status
 */
export async function getEnhancedChannelDashboard() {
  const distributors = await prisma.distributor.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      healthStatus: true,
      healthScore: true,
      channelTier: true,
      partnerType: true,
      region: true,
    },
  })

  // Health status overview
  const healthOverview = {
    healthy: distributors.filter((d) => d.healthStatus === 'healthy').length,
    warning: distributors.filter((d) => d.healthStatus === 'warning').length,
    atRisk: distributors.filter((d) => d.healthStatus === 'at_risk').length,
    dormant: distributors.filter((d) => d.healthStatus === 'dormant').length,
    avgHealthScore:
      distributors.reduce((sum, d) => sum + d.healthScore, 0) /
      (distributors.length || 1),
  }

  // Channel tier distribution
  const tierGroups = await prisma.distributor.groupBy({
    by: ['channelTier'],
    where: { deletedAt: null },
    _count: { id: true },
  })

  const tierDistribution = tierGroups.map((group) => ({
    tier: group.channelTier,
    count: group._count.id,
    percentage: distributors.length > 0
      ? Math.round((group._count.id / distributors.length) * 100)
      : 0,
  }))

  // Partner type distribution
  const typeGroups = await prisma.distributor.groupBy({
    by: ['partnerType'],
    where: { deletedAt: null },
    _count: { id: true },
  })

  const typeDistribution = typeGroups.map((group) => ({
    type: group.partnerType,
    count: group._count.id,
    percentage: distributors.length > 0
      ? Math.round((group._count.id / distributors.length) * 100)
      : 0,
  }))

  return {
    healthOverview,
    tierDistribution,
    typeDistribution,
    totalPartners: distributors.length,
  }
}

/**
 * Get channel contribution analysis (80-20 rule)
 */
export async function getChannelContribution() {
  const distributors = await prisma.distributor.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      quarterlyCompleted: true,
    },
    orderBy: {
      quarterlyCompleted: 'desc',
    },
  })

  const totalRevenue = distributors.reduce(
    (sum, d) => sum + d.quarterlyCompleted,
    0
  )

  const top20Count = Math.ceil(distributors.length * 0.2)
  const top20Partners = distributors.slice(0, top20Count)
  const top20Revenue = top20Partners.reduce(
    (sum, d) => sum + d.quarterlyCompleted,
    0
  )

  const top50Count = Math.ceil(distributors.length * 0.5)
  const top50Partners = distributors.slice(0, top50Count)
  const top50Revenue = top50Partners.reduce(
    (sum, d) => sum + d.quarterlyCompleted,
    0
  )

  return {
    total: {
      partners: distributors.length,
      revenue: totalRevenue,
    },
    top20: {
      partners: top20Count,
      revenue: top20Revenue,
      percentage: totalRevenue > 0
        ? Math.round((top20Revenue / totalRevenue) * 100)
        : 0,
    },
    top50: {
      partners: top50Count,
      revenue: top50Revenue,
      percentage: totalRevenue > 0
        ? Math.round((top50Revenue / totalRevenue) * 100)
        : 0,
    },
  }
}

/**
 * Get channel growth analysis
 */
export async function getChannelGrowth() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  // New partners
  const newPartners = await prisma.distributor.count({
    where: {
      deletedAt: null,
      createdAt: { gte: thirtyDaysAgo },
    },
  })

  // Upgraded partners (improved tier in last 30 days)
  // This would require tracking tier history, simplified version:
  const upgradedPartners = 0 // TODO: Implement tier history tracking

  // Churned partners (deleted in last 30 days)
  const churnedPartners = await prisma.distributor.count({
    where: {
      deletedAt: { gte: thirtyDaysAgo, lte: now },
    },
  })

  // Total partners
  const totalPartners = await prisma.distributor.count({
    where: { deletedAt: null },
  })

  // Churn rate
  const churnRate = totalPartners > 0
    ? Math.round((churnedPartners / totalPartners) * 100 * 10) / 10
    : 0

  // Growth rate (compare current month to previous month)
  const currentMonthPartners = await prisma.distributor.count({
    where: {
      deletedAt: null,
      createdAt: { gte: thirtyDaysAgo },
    },
  })

  const previousMonthPartners = await prisma.distributor.count({
    where: {
      deletedAt: null,
      createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
    },
  })

  const growthRate = previousMonthPartners > 0
    ? Math.round(
        ((currentMonthPartners - previousMonthPartners) /
          previousMonthPartners) *
          100 *
          10
      ) / 10
    : 0

  return {
    newPartners,
    upgradedPartners,
    churnedPartners,
    churnRate,
    growthRate,
    totalPartners,
  }
}

/**
 * Get visit statistics
 */
export async function getVisitStatistics() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const totalVisits = await prisma.partnerVisit.count({
    where: {
      visitDate: { gte: thirtyDaysAgo },
    },
  })

  const visitsByType = await prisma.partnerVisit.groupBy({
    by: ['visitType'],
    where: {
      visitDate: { gte: thirtyDaysAgo },
    },
    _count: { id: true },
  })

  const visitsWithSatisfaction = await prisma.partnerVisit.findMany({
    where: {
      visitDate: { gte: thirtyDaysAgo },
      satisfactionScore: { not: null },
    },
    select: {
      satisfactionScore: true,
    },
  })

  const avgSatisfaction = visitsWithSatisfaction.length > 0
    ? visitsWithSatisfaction.reduce(
        (sum, v) => sum + (v.satisfactionScore || 0),
        0
      ) / visitsWithSatisfaction.length
    : 0

  return {
    totalVisits,
    visitsByType: visitsByType.map((v) => ({
      type: v.visitType,
      count: v._count.id,
    })),
    avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
    satisfactionResponses: visitsWithSatisfaction.length,
  }
}
