import { z } from 'zod';

/**
 * 创建目标请求体验证
 * POST /api/targets
 */
export const createTargetBodySchema = z.object({
  year: z.number().int('年份必须是整数').min(2000, '年份不能早于2000').max(2100, '年份不能晚于2100'),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4'], {
    errorMap: () => ({ message: '季度必须是Q1、Q2、Q3或Q4之一' }),
  }).optional(),
  month: z.number().int('月份必须是整数').min(1, '月份最小为1').max(12, '月份最大为12').optional(),
  targetType: z.enum(['yearly', 'quarterly', 'monthly'], {
    errorMap: () => ({ message: '目标类型必须是yearly、quarterly或monthly之一' }),
  }),

  // 目标指标
  newSignTarget: z.number().min(0, '新签目标不能为负数').default(0),
  coreOpportunity: z.number().min(0, '核心机会目标不能为负数').default(0),
  coreRevenue: z.number().min(0, '核心收入目标不能为负数').default(0),
  highValueOpp: z.number().min(0, '高价值机会目标不能为负数').default(0),
  highValueRevenue: z.number().min(0, '高价值收入目标不能为负数').default(0),

  description: z.string().optional(),
}).refine(
  (data) => {
    // 验证季度和月份的逻辑
    if (data.targetType === 'quarterly' && !data.quarter) {
      return false;
    }
    if (data.targetType === 'monthly' && !data.month) {
      return false;
    }
    return true;
  },
  {
    message: '季度目标必须指定quarter，月度目标必须指定month',
    path: ['targetType'],
  }
);

/**
 * 更新目标请求体验证（所有字段可选）
 * PUT /api/targets/:id
 */
export const updateTargetBodySchema = z.object({
  year: z.number().int('年份必须是整数').min(2000, '年份不能早于2000').max(2100, '年份不能晚于2100').optional(),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
  month: z.number().int('月份必须是整数').min(1, '月份最小为1').max(12, '月份最大为12').optional(),
  targetType: z.enum(['yearly', 'quarterly', 'monthly']).optional(),

  // 目标指标
  newSignTarget: z.number().min(0, '新签目标不能为负数').optional(),
  coreOpportunity: z.number().min(0, '核心机会目标不能为负数').optional(),
  coreRevenue: z.number().min(0, '核心收入目标不能为负数').optional(),
  highValueOpp: z.number().min(0, '高价值机会目标不能为负数').optional(),
  highValueRevenue: z.number().min(0, '高价值收入目标不能为负数').optional(),

  // 完成情况
  newSignCompleted: z.number().min(0, '新签完成不能为负数').optional(),
  coreOppCompleted: z.number().min(0, '核心机会完成不能为负数').optional(),
  coreRevCompleted: z.number().min(0, '核心收入完成不能为负数').optional(),
  highValueOppComp: z.number().min(0, '高价值机会完成不能为负数').optional(),
  highValueRevComp: z.number().min(0, '高价值收入完成不能为负数').optional(),

  description: z.string().optional(),
});

/**
 * 查询目标列表参数验证
 * GET /api/targets?year=2024&quarter=Q1&month=1&targetType=monthly&userId=xxx
 */
export const getTargetsQuerySchema = z.object({
  year: z.coerce.number().int('年份必须是整数').min(2000, '年份不能早于2000').max(2100, '年份不能晚于2100').optional(),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
  month: z.coerce.number().int('月份必须是整数').min(1, '月份最小为1').max(12, '月份最大为12').optional(),
  targetType: z.enum(['yearly', 'quarterly', 'monthly']).optional(),
  userId: z.string().uuid('无效的用户ID格式').optional(),
});

/**
 * 目标统计查询参数验证
 * GET /api/targets/statistics?year=2024&quarter=Q1
 */
export const getTargetStatisticsQuerySchema = z.object({
  year: z.coerce.number().int('年份必须是整数').min(2000, '年份不能早于2000').max(2100, '年份不能晚于2100').optional(),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
});

/**
 * 通用目标ID参数验证
 */
export const targetIdParamSchema = z.object({
  id: z.string().uuid('无效的目标ID格式'),
});

// 导出类型推导
export type CreateTargetBody = z.infer<typeof createTargetBodySchema>;
export type UpdateTargetBody = z.infer<typeof updateTargetBodySchema>;
export type GetTargetsQuery = z.infer<typeof getTargetsQuerySchema>;
export type GetTargetStatisticsQuery = z.infer<typeof getTargetStatisticsQuerySchema>;
export type TargetIdParam = z.infer<typeof targetIdParamSchema>;
