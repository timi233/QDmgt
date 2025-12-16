import { z } from 'zod';

/**
 * 导出经销商查询参数验证
 * GET /api/data/export/distributors?region=xxx&cooperationLevel=xxx
 */
export const exportDistributorsQuerySchema = z.object({
  region: z.string().optional(),
  cooperationLevel: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
});

/**
 * 审计事件查询参数验证
 * GET /api/data/events?page=1&limit=20&entityType=xxx&action=xxx&userId=xxx&startDate=xxx&endDate=xxx
 */
export const auditEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  entityType: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    // 验证日期范围
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: '开始日期不能晚于结束日期',
    path: ['endDate'],
  }
);

/**
 * 实体审计事件路径参数验证
 * GET /api/data/events/:entityType/:entityId
 */
export const entityAuditEventsParamsSchema = z.object({
  entityType: z.enum(['distributor', 'task', 'target', 'workPlan', 'user']),
  entityId: z.string().uuid('无效的实体ID格式'),
});

/**
 * 导入经销商请求体验证
 * POST /api/data/import/distributors
 */
export const importDistributorsBodySchema = z.object({
  data: z.array(z.object({
    name: z.string().min(2).max(50),
    region: z.string().min(2),
    contactPerson: z.string().min(2).max(20),
    phone: z.string().min(1),
    cooperationLevel: z.enum(['bronze', 'silver', 'gold', 'platinum']),
    creditLimit: z.number().min(0).max(999999).optional(),
    tags: z.array(z.string()).max(5).optional(),
    historicalPerformance: z.string().optional(),
    notes: z.string().optional(),
  })).min(1, '至少需要导入一条数据'),
});

// 导出所有schema的类型推导
export type ExportDistributorsQuery = z.infer<typeof exportDistributorsQuerySchema>;
export type AuditEventsQuery = z.infer<typeof auditEventsQuerySchema>;
export type EntityAuditEventsParams = z.infer<typeof entityAuditEventsParamsSchema>;
export type ImportDistributorsBody = z.infer<typeof importDistributorsBodySchema>;
