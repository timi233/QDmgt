import { z } from 'zod';

/**
 * 创建工作计划请求体验证
 * POST /api/work-plans
 */
export const createWorkPlanBodySchema = z.object({
  distributorId: z.string().uuid('无效的经销商ID格式'),
  year: z.number().int('年份必须是整数').min(2000, '年份不能早于2000').max(2100, '年份不能晚于2100'),
  month: z.number().int('月份必须是整数').min(1, '月份最小为1').max(12, '月份最大为12'),

  // 计划内容
  opportunitySource: z.string().optional(),
  projectMgmt: z.string().optional(),
  channelActions: z.string().optional(),

  // 状态
  status: z.enum(['planning', 'executing', 'completed'], {
    errorMap: () => ({ message: '状态必须是planning、executing或completed之一' }),
  }).default('planning'),
});

/**
 * 更新工作计划请求体验证（所有字段可选）
 * PUT /api/work-plans/:id
 */
export const updateWorkPlanBodySchema = z.object({
  distributorId: z.string().uuid('无效的经销商ID格式').optional(),
  year: z.number().int('年份必须是整数').min(2000, '年份不能早于2000').max(2100, '年份不能晚于2100').optional(),
  month: z.number().int('月份必须是整数').min(1, '月份最小为1').max(12, '月份最大为12').optional(),

  // 计划内容
  opportunitySource: z.string().optional(),
  projectMgmt: z.string().optional(),
  channelActions: z.string().optional(),

  // 状态
  status: z.enum(['planning', 'executing', 'completed']).optional(),
});

/**
 * 查询工作计划列表参数验证
 * GET /api/work-plans?distributorId=xxx&userId=xxx&year=2024&month=1&status=planning
 */
export const getWorkPlansQuerySchema = z.object({
  distributorId: z.string().uuid('无效的经销商ID格式').optional(),
  userId: z.string().uuid('无效的用户ID格式').optional(),
  year: z.coerce.number().int('年份必须是整数').min(2000, '年份不能早于2000').max(2100, '年份不能晚于2100').optional(),
  month: z.coerce.number().int('月份必须是整数').min(1, '月份最小为1').max(12, '月份最大为12').optional(),
  status: z.enum(['planning', 'executing', 'completed']).optional(),
});

/**
 * 创建周报请求体验证
 * POST /api/work-plans/weekly-reviews
 */
export const createWeeklyReviewBodySchema = z.object({
  workPlanId: z.string().uuid('无效的工作计划ID格式'),
  weekNumber: z.number().int('周数必须是整数').min(1, '周数最小为1').max(53, '周数最大为53'),
  year: z.number().int('年份必须是整数').min(2000, '年份不能早于2000').max(2100, '年份不能晚于2100'),

  // 周报内容
  progress: z.string().optional(),
  obstacles: z.string().optional(),
  adjustments: z.string().optional(),
});

/**
 * 更新周报请求体验证（所有字段可选）
 * PUT /api/work-plans/weekly-reviews/:id
 */
export const updateWeeklyReviewBodySchema = z.object({
  workPlanId: z.string().uuid('无效的工作计划ID格式').optional(),
  weekNumber: z.number().int('周数必须是整数').min(1, '周数最小为1').max(53, '周数最大为53').optional(),
  year: z.number().int('年份必须是整数').min(2000, '年份不能早于2000').max(2100, '年份不能晚于2100').optional(),

  // 周报内容
  progress: z.string().optional(),
  obstacles: z.string().optional(),
  adjustments: z.string().optional(),
});

/**
 * 通用工作计划ID参数验证
 */
export const workPlanIdParamSchema = z.object({
  id: z.string().uuid('无效的工作计划ID格式'),
});

/**
 * 通用周报ID参数验证
 */
export const weeklyReviewIdParamSchema = z.object({
  id: z.string().uuid('无效的周报ID格式'),
});

// 导出类型推导
export type CreateWorkPlanBody = z.infer<typeof createWorkPlanBodySchema>;
export type UpdateWorkPlanBody = z.infer<typeof updateWorkPlanBodySchema>;
export type GetWorkPlansQuery = z.infer<typeof getWorkPlansQuerySchema>;
export type CreateWeeklyReviewBody = z.infer<typeof createWeeklyReviewBodySchema>;
export type UpdateWeeklyReviewBody = z.infer<typeof updateWeeklyReviewBodySchema>;
export type WorkPlanIdParam = z.infer<typeof workPlanIdParamSchema>;
export type WeeklyReviewIdParam = z.infer<typeof weeklyReviewIdParamSchema>;
