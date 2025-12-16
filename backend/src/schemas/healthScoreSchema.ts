import { z } from 'zod'

const healthStatusEnum = z.enum(['healthy', 'warning', 'at_risk', 'dormant'], {
  errorMap: () => ({ message: '健康状态必须是 healthy、warning、at_risk 或 dormant' }),
})

/**
 * 通用经销商 ID 参数
 */
export const distributorIdParamSchema = z.object({
  distributorId: z.string().uuid('无效的经销商 ID'),
})

/**
 * 健康状态参数
 */
export const healthStatusParamSchema = z.object({
  status: healthStatusEnum,
})

/**
 * 历史记录查询参数
 */
export const healthScoreHistoryQuerySchema = z.object({
  limit: z.coerce.number().int('limit 必须是整数').positive('limit 必须大于 0').max(50, 'limit 不能超过 50').default(10),
})

export type DistributorIdParam = z.infer<typeof distributorIdParamSchema>
export type HealthStatusParam = z.infer<typeof healthStatusParamSchema>
export type HealthScoreHistoryQuery = z.infer<typeof healthScoreHistoryQuerySchema>
