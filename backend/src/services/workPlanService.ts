import prisma from '../utils/prisma.js'
import { logEvent } from '../utils/eventLogger.js'

export interface CreateWorkPlanInput {
  distributorId: string
  userId: string
  year: number
  month: number
  opportunitySource?: string
  projectMgmt?: string
  channelActions?: string
  status?: 'planning' | 'executing' | 'completed'
}

export interface UpdateWorkPlanInput {
  opportunitySource?: string
  projectMgmt?: string
  channelActions?: string
  status?: 'planning' | 'executing' | 'completed'
}

export interface CreateWeeklyReviewInput {
  workPlanId: string
  weekNumber: number
  year: number
  progress?: string
  obstacles?: string
  adjustments?: string
}

export async function createWorkPlan(data: CreateWorkPlanInput) {
  const workPlan = await prisma.workPlan.create({
    data: {
      distributorId: data.distributorId,
      userId: data.userId,
      year: data.year,
      month: data.month,
      opportunitySource: data.opportunitySource,
      projectMgmt: data.projectMgmt,
      channelActions: data.channelActions,
      status: data.status || 'planning',
    },
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      weeklyReviews: true,
    },
  })

  await logEvent({
    eventType: 'work_plan_created',
    entityType: 'work_plan',
    entityId: workPlan.id,
    userId: data.userId,
    payload: {
      distributorId: data.distributorId,
      year: data.year,
      month: data.month,
    },
  })

  return workPlan
}

export async function getWorkPlans(filters: {
  distributorId?: string
  userId?: string
  year?: number
  month?: number
  status?: string
}) {
  const where: any = {}

  if (filters.distributorId) where.distributorId = filters.distributorId
  if (filters.userId) where.userId = filters.userId
  if (filters.year) where.year = filters.year
  if (filters.month) where.month = filters.month
  if (filters.status) where.status = filters.status

  const workPlans = await prisma.workPlan.findMany({
    where,
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
          channelType: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      weeklyReviews: {
        orderBy: {
          weekNumber: 'asc',
        },
      },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  return workPlans
}

export async function getWorkPlanById(id: string) {
  const workPlan = await prisma.workPlan.findUnique({
    where: { id },
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
          channelType: true,
          contactPerson: true,
          phone: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      weeklyReviews: {
        orderBy: {
          weekNumber: 'asc',
        },
      },
    },
  })

  if (!workPlan) {
    throw new Error('工作计划不存在')
  }

  return workPlan
}

export async function updateWorkPlan(
  id: string,
  data: UpdateWorkPlanInput,
  userId: string
) {
  const workPlan = await prisma.workPlan.update({
    where: { id },
    data: {
      opportunitySource: data.opportunitySource,
      projectMgmt: data.projectMgmt,
      channelActions: data.channelActions,
      status: data.status,
    },
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      weeklyReviews: true,
    },
  })

  await logEvent({
    eventType: 'work_plan_updated',
    entityType: 'work_plan',
    entityId: workPlan.id,
    userId,
    payload: {
      distributorId: workPlan.distributorId,
      status: workPlan.status,
    },
  })

  return workPlan
}

export async function deleteWorkPlan(id: string, userId: string) {
  const workPlan = await prisma.workPlan.delete({
    where: { id },
  })

  await logEvent({
    eventType: 'work_plan_deleted',
    entityType: 'work_plan',
    entityId: workPlan.id,
    userId,
    payload: {
      distributorId: workPlan.distributorId,
      year: workPlan.year,
      month: workPlan.month,
    },
  })

  return workPlan
}

export async function createWeeklyReview(data: CreateWeeklyReviewInput, userId: string) {
  const weeklyReview = await prisma.weeklyReview.create({
    data: {
      workPlanId: data.workPlanId,
      weekNumber: data.weekNumber,
      year: data.year,
      progress: data.progress,
      obstacles: data.obstacles,
      adjustments: data.adjustments,
    },
    include: {
      workPlan: {
        include: {
          distributor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  await logEvent({
    eventType: 'weekly_review_created',
    entityType: 'weekly_review',
    entityId: weeklyReview.id,
    userId,
    payload: {
      workPlanId: data.workPlanId,
      weekNumber: data.weekNumber,
      year: data.year,
    },
  })

  return weeklyReview
}

export async function updateWeeklyReview(
  id: string,
  data: {
    progress?: string
    obstacles?: string
    adjustments?: string
  },
  userId: string
) {
  const weeklyReview = await prisma.weeklyReview.update({
    where: { id },
    data: {
      progress: data.progress,
      obstacles: data.obstacles,
      adjustments: data.adjustments,
    },
  })

  await logEvent({
    eventType: 'weekly_review_updated',
    entityType: 'weekly_review',
    entityId: weeklyReview.id,
    userId,
    payload: {
      workPlanId: weeklyReview.workPlanId,
      weekNumber: weeklyReview.weekNumber,
    },
  })

  return weeklyReview
}

export async function deleteWeeklyReview(id: string, userId: string) {
  const weeklyReview = await prisma.weeklyReview.delete({
    where: { id },
  })

  await logEvent({
    eventType: 'weekly_review_deleted',
    entityType: 'weekly_review',
    entityId: weeklyReview.id,
    userId,
    payload: {
      workPlanId: weeklyReview.workPlanId,
      weekNumber: weeklyReview.weekNumber,
    },
  })

  return weeklyReview
}
