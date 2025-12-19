import { z } from 'zod'

const visitTypeEnum = z.enum(['onsite', 'online', 'phone', 'meeting'], {
  errorMap: () => ({ message: '拜访类型必须是 onsite、online、phone 或 meeting' }),
})

const optionalText = z.string().max(1000, '字段内容不能超过 1000 个字符').optional()

/**
 * 创建拜访记录请求体验证
 */
export const createVisitBodySchema = z.object({
  distributorId: z.string().uuid('无效的经销商 ID'),
  visitDate: z.coerce.date({ invalid_type_error: '拜访日期格式不正确' }),
  visitType: visitTypeEnum,
  purpose: z.string().min(2, '拜访目的至少 2 个字符').max(500, '拜访目的不能超过 500 个字符'),
  ourAttendees: optionalText,
  clientAttendees: optionalText,
  keyDiscussions: optionalText,
  feedback: optionalText,
  competitorInfo: optionalText,
  nextSteps: optionalText,
  satisfactionScore: z.coerce.number().min(0, '满意度不能低于 0').max(5, '满意度不能超过 5').optional(),
})

/**
 * 更新拜访记录请求体验证
 */
export const updateVisitBodySchema = z
  .object({
    visitDate: z.coerce.date({ invalid_type_error: '拜访日期格式不正确' }).optional(),
    visitType: visitTypeEnum.optional(),
    purpose: z.string().min(2).max(500).optional(),
    ourAttendees: optionalText,
    clientAttendees: optionalText,
    keyDiscussions: optionalText,
    feedback: optionalText,
    competitorInfo: optionalText,
    nextSteps: optionalText,
    satisfactionScore: z.coerce.number().min(0).max(5).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: '至少提供一个需要更新的字段',
  })

/**
 * 查询拜访记录参数验证
 */
export const getVisitsQuerySchema = z
  .object({
    page: z.coerce.number().int('页码必须是整数').positive('页码必须是正数').default(1),
    limit: z.coerce.number().int('每页数量必须是整数').positive('每页数量必须是正数').max(100, '每页最多 100 条').default(20),
    distributorId: z.string().uuid('无效的经销商 ID').optional(),
    userId: z.string().uuid('无效的用户 ID').optional(),
    visitType: visitTypeEnum.optional(),
    startDate: z.coerce.date({ invalid_type_error: '开始日期格式不正确' }).optional(),
    endDate: z.coerce.date({ invalid_type_error: '结束日期格式不正确' }).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate
      }
      return true
    },
    { message: '开始日期不能晚于结束日期' }
  )

/**
 * 路径参数验证
 */
export const visitIdParamSchema = z.object({
  id: z.string().uuid('无效的拜访记录 ID'),
})

export const visitStatsParamSchema = z.object({
  distributorId: z.string().uuid('无效的经销商 ID'),
})

export type CreateVisitBody = z.infer<typeof createVisitBodySchema>
export type UpdateVisitBody = z.infer<typeof updateVisitBodySchema>
export type GetVisitsQuery = z.infer<typeof getVisitsQuerySchema>
export type VisitIdParam = z.infer<typeof visitIdParamSchema>
export type VisitStatsParams = z.infer<typeof visitStatsParamSchema>
