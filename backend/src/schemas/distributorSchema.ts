import { z } from 'zod';

/**
 * 通用UUID参数验证
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid('无效的ID格式'),
});

/**
 * 创建经销商请求体验证
 * POST /api/distributors
 */
export const createDistributorBodySchema = z.object({
  name: z.string().min(2, '名称至少需要2个字符').max(50, '名称最多50个字符'),
  region: z.string().min(2, '地区至少需要2个字符'),
  contactPerson: z.string().min(2, '联系人至少需要2个字符').max(20, '联系人最多20个字符'),
  phone: z.string().min(1, '电话号码不能为空'),
  cooperationLevel: z.enum(['bronze', 'silver', 'gold', 'platinum'], {
    errorMap: () => ({ message: '合作级别必须是bronze、silver、gold或platinum之一' }),
  }),
  creditLimit: z.number().min(0, '信用额度不能为负数').max(999999, '信用额度不能超过999999').optional(),
  tags: z.array(z.string()).max(5, '标签最多5个').optional(),
  historicalPerformance: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * 更新经销商请求体验证（所有字段可选）
 * PUT /api/distributors/:id
 */
export const updateDistributorBodySchema = z.object({
  name: z.string().min(2, '名称至少需要2个字符').max(50, '名称最多50个字符').optional(),
  region: z.string().min(2, '地区至少需要2个字符').optional(),
  contactPerson: z.string().min(2, '联系人至少需要2个字符').max(20, '联系人最多20个字符').optional(),
  phone: z.string().min(1, '电话号码不能为空').optional(),
  cooperationLevel: z.enum(['bronze', 'silver', 'gold', 'platinum'], {
    errorMap: () => ({ message: '合作级别必须是bronze、silver、gold或platinum之一' }),
  }).optional(),
  creditLimit: z.number().min(0, '信用额度不能为负数').max(999999, '信用额度不能超过999999').optional(),
  tags: z.array(z.string()).max(5, '标签最多5个').optional(),
  historicalPerformance: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * 查询经销商列表参数验证
 * GET /api/distributors?page=1&limit=20&region=xxx&cooperationLevel=xxx&search=xxx
 */
export const getDistributorsQuerySchema = z.object({
  page: z.coerce.number().int('页码必须是整数').positive('页码必须是正数').default(1),
  limit: z.coerce.number().int('每页数量必须是整数').positive('每页数量必须是正数').max(100, '每页最多100条').default(10),
  region: z.string().optional(),
  cooperationLevel: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  channelTier: z.enum(['strategic', 'core', 'standard', 'developing']).optional(),
  partnerType: z.enum(['ISV', 'SI', 'VAR', 'agent', 'reseller']).optional(),
  healthStatus: z.enum(['healthy', 'warning', 'at_risk', 'dormant']).optional(),
  search: z.string().optional(),
});

// 导出类型推导
export type UuidParam = z.infer<typeof uuidParamSchema>;
export type CreateDistributorBody = z.infer<typeof createDistributorBodySchema>;
export type UpdateDistributorBody = z.infer<typeof updateDistributorBodySchema>;
export type GetDistributorsQuery = z.infer<typeof getDistributorsQuerySchema>;
