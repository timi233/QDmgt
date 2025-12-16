import { z } from 'zod';

/**
 * 创建任务请求体验证
 * POST /api/tasks
 */
export const createTaskBodySchema = z.object({
  distributorId: z.string().uuid('无效的经销商ID格式'),
  assignedUserId: z.string().uuid('无效的用户ID格式'),
  title: z.string().min(1, '任务标题不能为空').max(200, '任务标题最多200个字符'),
  description: z.string().optional(),
  deadline: z.string().datetime('无效的日期时间格式'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    errorMap: () => ({ message: '优先级必须是low、medium、high或urgent之一' }),
  }).optional(),
});

/**
 * 更新任务请求体验证（所有字段可选）
 * PUT /api/tasks/:id
 */
export const updateTaskBodySchema = z.object({
  title: z.string().min(1, '任务标题不能为空').max(200, '任务标题最多200个字符').optional(),
  description: z.string().optional(),
  deadline: z.string().datetime('无效的日期时间格式').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    errorMap: () => ({ message: '优先级必须是low、medium、high或urgent之一' }),
  }).optional(),
});

/**
 * 更新任务状态请求体验证
 * PUT /api/tasks/:id/status
 */
export const updateTaskStatusBodySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue'], {
    errorMap: () => ({ message: '状态必须是pending、in_progress、completed或overdue之一' }),
  }),
  reason: z.string().optional(),
});

/**
 * 分配任务请求体验证
 * PUT /api/tasks/:id/assign
 */
export const assignTaskBodySchema = z.object({
  assignedUserId: z.string().uuid('无效的用户ID格式'),
  reason: z.string().optional(),
});

/**
 * 添加协作者请求体验证
 * POST /api/tasks/:id/collaborators
 */
export const addCollaboratorBodySchema = z.object({
  userId: z.string().uuid('无效的用户ID格式'),
});

/**
 * 删除协作者路径参数验证
 * DELETE /api/tasks/:id/collaborators/:userId
 */
export const removeCollaboratorParamsSchema = z.object({
  id: z.string().uuid('无效的任务ID格式'),
  userId: z.string().uuid('无效的用户ID格式'),
});

/**
 * 添加评论请求体验证
 * POST /api/tasks/:id/comments
 */
export const addCommentBodySchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(1000, '评论内容最多1000个字符'),
});

/**
 * 查询任务列表参数验证
 * GET /api/tasks?page=1&limit=20&status=xxx&priority=xxx&distributorId=xxx&search=xxx
 */
export const getTasksQuerySchema = z.object({
  page: z.coerce.number().int('页码必须是整数').positive('页码必须是正数').default(1),
  limit: z.coerce.number().int('每页数量必须是整数').positive('每页数量必须是正数').max(100, '每页最多100条').default(20),
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  distributorId: z.string().uuid('无效的经销商ID格式').optional(),
  search: z.string().optional(),
});

/**
 * 通用任务ID参数验证
 */
export const taskIdParamSchema = z.object({
  id: z.string().uuid('无效的任务ID格式'),
});

// 导出类型推导
export type CreateTaskBody = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type UpdateTaskStatusBody = z.infer<typeof updateTaskStatusBodySchema>;
export type AssignTaskBody = z.infer<typeof assignTaskBodySchema>;
export type AddCollaboratorBody = z.infer<typeof addCollaboratorBodySchema>;
export type RemoveCollaboratorParams = z.infer<typeof removeCollaboratorParamsSchema>;
export type AddCommentBody = z.infer<typeof addCommentBodySchema>;
export type GetTasksQuery = z.infer<typeof getTasksQuerySchema>;
export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
