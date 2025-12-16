import prisma from '../utils/prisma.js'

export interface HealthScoreDimensions {
  performance: {
    score: number
    revenueGrowth: number
    targetAchievement: number
    orderFrequency: number
  }
  engagement: {
    score: number
    productLinesCount: number
    trainingParticipation: number
  }
  activity: {
    score: number
    lastOrderDays: number
    lastContactDays: number
    responseRate: number
  }
  satisfaction: {
    score: number
    avgSatisfactionRating: number
    complaintCount: number
  }
}

export interface HealthScoreResult {
  overallScore: number
  dimensions: HealthScoreDimensions
  healthStatus: 'healthy' | 'warning' | 'at_risk' | 'dormant'
  alerts: string[]
  recommendations: string[]
}

/**
 * Calculate partner health score
 */
export async function calculateHealthScore(
  distributorId: string
): Promise<HealthScoreResult> {
  const distributor = await prisma.distributor.findUnique({
    where: { id: distributorId },
    include: {
      tasks: {
        select: {
          status: true,
          createdAt: true,
        },
      },
      visits: {
        orderBy: { visitDate: 'desc' },
        take: 10,
      },
    },
  })

  if (!distributor) {
    throw new Error('Distributor not found')
  }

  const now = new Date()
  const alerts: string[] = []
  const recommendations: string[] = []

  // 1. Performance dimension (30 points)
  const performanceMetrics = {
    revenueGrowth: 0, // TODO: Calculate based on historical data
    targetAchievement: distributor.quarterlyTarget > 0
      ? (distributor.quarterlyCompleted / distributor.quarterlyTarget) * 100
      : 0,
    orderFrequency: 0, // TODO: Calculate based on order history
  }

  let performanceScore = 0
  // Target achievement (20 points)
  if (performanceMetrics.targetAchievement >= 100) performanceScore += 20
  else if (performanceMetrics.targetAchievement >= 80) performanceScore += 16
  else if (performanceMetrics.targetAchievement >= 60) performanceScore += 12
  else if (performanceMetrics.targetAchievement >= 40) performanceScore += 8
  else performanceScore += 4

  // Revenue growth (10 points)
  if (performanceMetrics.revenueGrowth >= 50) performanceScore += 10
  else if (performanceMetrics.revenueGrowth >= 30) performanceScore += 8
  else if (performanceMetrics.revenueGrowth >= 10) performanceScore += 6
  else if (performanceMetrics.revenueGrowth >= 0) performanceScore += 3

  // Performance alerts
  if (performanceMetrics.targetAchievement < 50) {
    alerts.push('目标完成率低于50%，需要重点关注')
    recommendations.push('建议增加拜访频率，了解业绩不佳原因')
  }

  // 2. Engagement dimension (25 points)
  const productLinesCount = distributor.productLines
    ? distributor.productLines.split(',').filter((p) => p.trim()).length
    : 0
  const trainingParticipation = 0 // TODO: Calculate from training records

  let engagementScore = 0
  // Product lines (15 points)
  if (productLinesCount >= 5) engagementScore += 15
  else if (productLinesCount >= 3) engagementScore += 12
  else if (productLinesCount >= 2) engagementScore += 8
  else if (productLinesCount >= 1) engagementScore += 5

  // Training participation (10 points)
  if (trainingParticipation >= 80) engagementScore += 10
  else if (trainingParticipation >= 60) engagementScore += 7
  else if (trainingParticipation >= 40) engagementScore += 4

  const engagementMetrics = {
    productLinesCount,
    trainingParticipation,
  }

  // Engagement alerts
  if (productLinesCount < 2) {
    alerts.push('代理产品线较少，合作深度不足')
    recommendations.push('建议引导伙伴拓展更多产品线')
  }

  // 3. Activity dimension (25 points)
  const lastContactDays = distributor.lastContactDate
    ? Math.floor(
        (now.getTime() - new Date(distributor.lastContactDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 999
  const lastOrderDays = 999 // TODO: Calculate from order history
  const responseRate = 0 // TODO: Calculate from communication records

  let activityScore = 0
  // Last contact (12 points)
  if (lastContactDays <= 7) activityScore += 12
  else if (lastContactDays <= 14) activityScore += 10
  else if (lastContactDays <= 30) activityScore += 7
  else if (lastContactDays <= 60) activityScore += 4
  else if (lastContactDays <= 90) activityScore += 2

  // Last order (10 points)
  if (lastOrderDays <= 30) activityScore += 10
  else if (lastOrderDays <= 60) activityScore += 7
  else if (lastOrderDays <= 90) activityScore += 4
  else if (lastOrderDays <= 180) activityScore += 2

  // Response rate (3 points)
  if (responseRate >= 90) activityScore += 3
  else if (responseRate >= 70) activityScore += 2
  else if (responseRate >= 50) activityScore += 1

  const activityMetrics = {
    lastOrderDays,
    lastContactDays,
    responseRate,
  }

  // Activity alerts
  if (lastContactDays > 60) {
    alerts.push(`已经${lastContactDays}天未联系，有流失风险`)
    recommendations.push('建议立即安排拜访或电话沟通')
  }
  if (lastOrderDays > 90) {
    alerts.push(`已经${lastOrderDays}天未下单，处于沉睡状态`)
    recommendations.push('建议了解原因，制定激活计划')
  }

  // 4. Satisfaction dimension (20 points)
  const recentVisits = distributor.visits.slice(0, 5)
  const satisfactionScores = recentVisits
    .filter((v) => v.satisfactionScore !== null)
    .map((v) => v.satisfactionScore as number)
  const avgSatisfactionRating = satisfactionScores.length > 0
    ? satisfactionScores.reduce((sum, score) => sum + score, 0) /
      satisfactionScores.length
    : 0
  const complaintCount = 0 // TODO: Calculate from complaint records

  let satisfactionScore = 0
  // Average satisfaction (15 points)
  if (avgSatisfactionRating >= 4.5) satisfactionScore += 15
  else if (avgSatisfactionRating >= 4.0) satisfactionScore += 12
  else if (avgSatisfactionRating >= 3.5) satisfactionScore += 9
  else if (avgSatisfactionRating >= 3.0) satisfactionScore += 6
  else if (avgSatisfactionRating > 0) satisfactionScore += 3

  // Complaint count (5 points - deduction)
  if (complaintCount === 0) satisfactionScore += 5
  else if (complaintCount <= 2) satisfactionScore += 3
  else if (complaintCount <= 5) satisfactionScore += 1

  const satisfactionMetrics = {
    avgSatisfactionRating,
    complaintCount,
  }

  // Satisfaction alerts
  if (avgSatisfactionRating < 3.5 && avgSatisfactionRating > 0) {
    alerts.push('伙伴满意度较低，需要改进服务')
    recommendations.push('建议进行深度访谈，了解不满原因')
  }

  // Calculate overall score
  const overallScore = performanceScore + engagementScore + activityScore + satisfactionScore

  // Determine health status
  let healthStatus: 'healthy' | 'warning' | 'at_risk' | 'dormant'
  if (overallScore >= 75) healthStatus = 'healthy'
  else if (overallScore >= 50) healthStatus = 'warning'
  else if (overallScore >= 25) healthStatus = 'at_risk'
  else healthStatus = 'dormant'

  // Dormant specific alerts
  if (lastContactDays > 180 || lastOrderDays > 180) {
    healthStatus = 'dormant'
    alerts.push('伙伴已进入沉睡状态')
    recommendations.push('建议评估是否值得继续投入资源')
  }

  return {
    overallScore: Math.round(overallScore),
    dimensions: {
      performance: {
        score: Math.round(performanceScore),
        ...performanceMetrics,
      },
      engagement: {
        score: Math.round(engagementScore),
        ...engagementMetrics,
      },
      activity: {
        score: Math.round(activityScore),
        ...activityMetrics,
      },
      satisfaction: {
        score: Math.round(satisfactionScore),
        ...satisfactionMetrics,
      },
    },
    healthStatus,
    alerts,
    recommendations,
  }
}

/**
 * Save health score to database
 */
export async function saveHealthScore(
  distributorId: string,
  scoreData: HealthScoreResult
) {
  const healthScore = await prisma.partnerHealthScore.create({
    data: {
      distributorId,
      overallScore: scoreData.overallScore,
      healthStatus: scoreData.healthStatus,

      performanceScore: scoreData.dimensions.performance.score,
      revenueGrowth: scoreData.dimensions.performance.revenueGrowth,
      targetAchievement: scoreData.dimensions.performance.targetAchievement,
      orderFrequency: scoreData.dimensions.performance.orderFrequency,

      engagementScore: scoreData.dimensions.engagement.score,
      productLinesCount: scoreData.dimensions.engagement.productLinesCount,
      trainingParticipation: scoreData.dimensions.engagement.trainingParticipation,

      activityScore: scoreData.dimensions.activity.score,
      lastOrderDays: scoreData.dimensions.activity.lastOrderDays,
      lastContactDays: scoreData.dimensions.activity.lastContactDays,
      responseRate: scoreData.dimensions.activity.responseRate,

      satisfactionScore: scoreData.dimensions.satisfaction.score,
      avgSatisfactionRating: scoreData.dimensions.satisfaction.avgSatisfactionRating,
      complaintCount: scoreData.dimensions.satisfaction.complaintCount,

      alerts: JSON.stringify(scoreData.alerts),
      recommendations: JSON.stringify(scoreData.recommendations),
    },
  })

  // Update distributor's health score and status
  await prisma.distributor.update({
    where: { id: distributorId },
    data: {
      healthScore: scoreData.overallScore,
      healthStatus: scoreData.healthStatus,
    },
  })

  return healthScore
}

/**
 * Calculate and save health score for a distributor
 */
export async function updateDistributorHealthScore(distributorId: string) {
  const scoreData = await calculateHealthScore(distributorId)
  return await saveHealthScore(distributorId, scoreData)
}

/**
 * Calculate health scores for all distributors
 */
export async function updateAllHealthScores() {
  const distributors = await prisma.distributor.findMany({
    where: { deletedAt: null },
    select: { id: true },
  })

  const results = []
  for (const distributor of distributors) {
    try {
      const result = await updateDistributorHealthScore(distributor.id)
      results.push(result)
    } catch (error) {
      console.error(
        `Error updating health score for distributor ${distributor.id}:`,
        error
      )
    }
  }

  return {
    total: distributors.length,
    successful: results.length,
    failed: distributors.length - results.length,
  }
}

/**
 * Get latest health score for a distributor
 */
export async function getLatestHealthScore(distributorId: string) {
  const healthScore = await prisma.partnerHealthScore.findFirst({
    where: { distributorId },
    orderBy: { calculatedAt: 'desc' },
  })

  if (!healthScore) {
    return null
  }

  return {
    ...healthScore,
    alerts: healthScore.alerts ? JSON.parse(healthScore.alerts) : [],
    recommendations: healthScore.recommendations
      ? JSON.parse(healthScore.recommendations)
      : [],
  }
}

/**
 * Get health score history for a distributor
 */
export async function getHealthScoreHistory(
  distributorId: string,
  limit: number = 10
) {
  const scores = await prisma.partnerHealthScore.findMany({
    where: { distributorId },
    orderBy: { calculatedAt: 'desc' },
    take: limit,
  })

  return scores.map((score) => ({
    ...score,
    alerts: score.alerts ? JSON.parse(score.alerts) : [],
    recommendations: score.recommendations
      ? JSON.parse(score.recommendations)
      : [],
  }))
}

/**
 * Get distributors by health status
 */
export async function getDistributorsByHealthStatus(
  status: 'healthy' | 'warning' | 'at_risk' | 'dormant'
) {
  return await prisma.distributor.findMany({
    where: {
      deletedAt: null,
      healthStatus: status,
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
    orderBy: {
      healthScore: 'asc', // Show lowest scores first
    },
  })
}
