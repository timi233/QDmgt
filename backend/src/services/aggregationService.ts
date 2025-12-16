import prisma from '../utils/prisma.js'
import { setCache, CACHE_KEYS, DEFAULT_CACHE_TTL } from '../utils/redis.js'

/**
 * Dashboard KPI data structure
 */
export interface DashboardKPI {
  totalDistributors: number
  newDistributorsThisMonth: number
  totalTasks: number
  completedTasksThisMonth: number
  taskCompletionRate: number
  activeUsers: number
  updatedAt: string
}

/**
 * Region statistics
 */
export interface RegionStats {
  region: string
  count: number
  percentage: number
}

/**
 * Cooperation level statistics
 */
export interface CooperationStats {
  level: string
  count: number
  percentage: number
  totalCreditLimit: number
}

/**
 * Task statistics
 */
export interface TaskStats {
  pending: number
  inProgress: number
  completed: number
  overdue: number
  byPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
}

/**
 * Aggregate all dashboard data and cache to Redis
 */
export async function aggregateDashboardData(): Promise<void> {
  console.log('[Aggregation] Starting dashboard data aggregation...')

  try {
    // Run all aggregations in parallel
    await Promise.all([
      aggregateKPIData(),
      aggregateRegionStats(),
      aggregateCooperationStats(),
      aggregateTaskStats(),
    ])

    console.log('[Aggregation] Dashboard data aggregation completed')
  } catch (error) {
    console.error('[Aggregation] Error aggregating dashboard data:', error)
    throw error
  }
}

/**
 * Aggregate main KPI metrics
 */
export async function aggregateKPIData(): Promise<DashboardKPI> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Get all metrics in parallel
  const [
    totalDistributors,
    newDistributorsThisMonth,
    totalTasks,
    completedTasksThisMonth,
    activeUsers,
  ] = await Promise.all([
    // Total distributors
    prisma.distributor.count({
      where: { deletedAt: null },
    }),
    // New distributors this month
    prisma.distributor.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startOfMonth },
      },
    }),
    // Total tasks
    prisma.task.count({
      where: { archivedAt: null },
    }),
    // Completed tasks this month
    prisma.task.count({
      where: {
        status: 'completed',
        completedAt: { gte: startOfMonth },
      },
    }),
    // Active users (users with tasks this month)
    prisma.task.groupBy({
      by: ['assignedUserId'],
      where: {
        createdAt: { gte: startOfMonth },
      },
    }).then(groups => groups.length),
  ])

  // Calculate completion rate
  const tasksThisMonth = await prisma.task.count({
    where: {
      createdAt: { gte: startOfMonth },
    },
  })
  const taskCompletionRate = tasksThisMonth > 0
    ? Math.round((completedTasksThisMonth / tasksThisMonth) * 100)
    : 0

  const kpiData: DashboardKPI = {
    totalDistributors,
    newDistributorsThisMonth,
    totalTasks,
    completedTasksThisMonth,
    taskCompletionRate,
    activeUsers,
    updatedAt: now.toISOString(),
  }

  // Cache with 5 minute TTL
  await setCache(CACHE_KEYS.DASHBOARD_KPI, kpiData, DEFAULT_CACHE_TTL)
  console.log('[Aggregation] KPI data cached')

  return kpiData
}

/**
 * Aggregate statistics by region
 */
export async function aggregateRegionStats(): Promise<RegionStats[]> {
  const regionGroups = await prisma.distributor.groupBy({
    by: ['region'],
    where: { deletedAt: null },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
  })

  const total = regionGroups.reduce((sum, r) => sum + r._count.id, 0)

  const stats: RegionStats[] = regionGroups.map((group) => ({
    region: group.region,
    count: group._count.id,
    percentage: total > 0 ? Math.round((group._count.id / total) * 100) : 0,
  }))

  await setCache(CACHE_KEYS.DASHBOARD_REGION_STATS, stats, DEFAULT_CACHE_TTL)
  console.log('[Aggregation] Region stats cached')

  return stats
}

/**
 * Aggregate statistics by cooperation level
 */
export async function aggregateCooperationStats(): Promise<CooperationStats[]> {
  const levelGroups = await prisma.distributor.groupBy({
    by: ['cooperationLevel'],
    where: { deletedAt: null },
    _count: {
      id: true,
    },
    _sum: {
      creditLimit: true,
    },
  })

  const total = levelGroups.reduce((sum, l) => sum + l._count.id, 0)

  // Sort by cooperation level order
  const levelOrder = ['bronze', 'silver', 'gold', 'platinum']
  const stats: CooperationStats[] = levelGroups
    .sort((a, b) => levelOrder.indexOf(a.cooperationLevel) - levelOrder.indexOf(b.cooperationLevel))
    .map((group) => ({
      level: group.cooperationLevel,
      count: group._count.id,
      percentage: total > 0 ? Math.round((group._count.id / total) * 100) : 0,
      totalCreditLimit: group._sum.creditLimit || 0,
    }))

  await setCache(CACHE_KEYS.DASHBOARD_COOPERATION_STATS, stats, DEFAULT_CACHE_TTL)
  console.log('[Aggregation] Cooperation stats cached')

  return stats
}

/**
 * Aggregate task statistics
 */
export async function aggregateTaskStats(): Promise<TaskStats> {
  const [statusGroups, priorityGroups] = await Promise.all([
    // Group by status
    prisma.task.groupBy({
      by: ['status'],
      where: { archivedAt: null },
      _count: {
        id: true,
      },
    }),
    // Group by priority
    prisma.task.groupBy({
      by: ['priority'],
      where: { archivedAt: null },
      _count: {
        id: true,
      },
    }),
  ])

  const statusMap = new Map(statusGroups.map((g) => [g.status, g._count.id]))
  const priorityMap = new Map(priorityGroups.map((g) => [g.priority, g._count.id]))

  const stats: TaskStats = {
    pending: statusMap.get('pending') || 0,
    inProgress: statusMap.get('in_progress') || 0,
    completed: statusMap.get('completed') || 0,
    overdue: statusMap.get('overdue') || 0,
    byPriority: {
      low: priorityMap.get('low') || 0,
      medium: priorityMap.get('medium') || 0,
      high: priorityMap.get('high') || 0,
      urgent: priorityMap.get('urgent') || 0,
    },
  }

  await setCache(CACHE_KEYS.DASHBOARD_TASK_STATS, stats, DEFAULT_CACHE_TTL)
  console.log('[Aggregation] Task stats cached')

  return stats
}

/**
 * Get cached dashboard data
 */
export async function getCachedDashboardData() {
  const { getCache } = await import('../utils/redis.js')

  const [kpi, regionStats, cooperationStats, taskStats] = await Promise.all([
    getCache<DashboardKPI>(CACHE_KEYS.DASHBOARD_KPI),
    getCache<RegionStats[]>(CACHE_KEYS.DASHBOARD_REGION_STATS),
    getCache<CooperationStats[]>(CACHE_KEYS.DASHBOARD_COOPERATION_STATS),
    getCache<TaskStats>(CACHE_KEYS.DASHBOARD_TASK_STATS),
  ])

  // If any cache is missing, trigger re-aggregation
  if (!kpi || !regionStats || !cooperationStats || !taskStats) {
    console.log('[Aggregation] Cache miss, re-aggregating...')
    await aggregateDashboardData()

    // Fetch again after aggregation
    return {
      kpi: await getCache<DashboardKPI>(CACHE_KEYS.DASHBOARD_KPI),
      regionStats: await getCache<RegionStats[]>(CACHE_KEYS.DASHBOARD_REGION_STATS),
      cooperationStats: await getCache<CooperationStats[]>(CACHE_KEYS.DASHBOARD_COOPERATION_STATS),
      taskStats: await getCache<TaskStats>(CACHE_KEYS.DASHBOARD_TASK_STATS),
    }
  }

  return {
    kpi,
    regionStats,
    cooperationStats,
    taskStats,
  }
}
