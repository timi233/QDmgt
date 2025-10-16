import apiClient, { handleApiError } from './api';

/**
 * 执行计划服务
 *
 * 提供执行计划管理的API调用：
 * - 创建执行计划
 * - 按渠道查询执行计划
 * - 按用户查询执行计划
 * - 更新执行计划
 * - 更新执行状态
 * - 删除执行计划
 */

// ========== 类型定义 ==========

/**
 * 计划类型
 */
export type PlanType = 'monthly' | 'weekly';

/**
 * 执行状态
 */
export type ExecutionStatus = 'planned' | 'in-progress' | 'completed' | 'archived';

/**
 * 执行计划
 */
export interface ExecutionPlan {
  id: string;
  channel_id: string;
  user_id: string;
  plan_type: PlanType;
  plan_period: string;
  plan_content: string;
  execution_status: ExecutionStatus;
  key_obstacles?: string;
  next_steps?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 创建执行计划请求
 */
export interface CreateExecutionPlanRequest {
  channel_id: string;
  user_id: string;
  plan_type: PlanType;
  plan_period: string;
  plan_content: string;
  key_obstacles?: string;
  next_steps?: string;
}

/**
 * 更新执行计划请求
 */
export interface UpdateExecutionPlanRequest {
  channel_id?: string;
  user_id?: string;
  plan_type?: PlanType;
  plan_period?: string;
  plan_content?: string;
  execution_status?: ExecutionStatus;
  key_obstacles?: string;
  next_steps?: string;
}

/**
 * 更新执行状态请求
 */
export interface UpdateExecutionStatusRequest {
  execution_status: ExecutionStatus;
  key_obstacles?: string;
  next_steps?: string;
}

/**
 * 执行计划服务API
 */
export const executionService = {
  /**
   * 创建执行计划
   *
   * @param channelId 渠道ID
   * @param userId 用户ID
   * @param planType 计划类型
   * @param planPeriod 计划周期
   * @param planContent 计划内容
   * @returns 创建的执行计划
   */
  async createExecutionPlan(
    channelId: string,
    userId: string,
    planType: PlanType,
    planPeriod: string,
    planContent: string,
    keyObstacles?: string,
    nextSteps?: string
  ): Promise<ExecutionPlan> {
    try {
      const payload: CreateExecutionPlanRequest = {
        channel_id: channelId,
        user_id: userId,
        plan_type: planType,
        plan_period: planPeriod,
        plan_content: planContent,
      };

      if (keyObstacles && keyObstacles.trim()) {
        payload.key_obstacles = keyObstacles;
      }

      if (nextSteps && nextSteps.trim()) {
        payload.next_steps = nextSteps;
      }
      const response = await apiClient.post<ExecutionPlan>('/execution-plans/', payload);
      console.log('[Execution] Created successfully', {
        id: response.data.id,
        channel_id: channelId,
        user_id: userId,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Execution] Creation failed', apiError);
      throw apiError;
    }
  },

  /**
   * 按渠道获取执行计划
   *
   * @param channelId 渠道ID
   * @returns 执行计划列表
   */
  async getExecutionPlansByChannel(channelId: string): Promise<ExecutionPlan[]> {
    try {
      const response = await apiClient.get<ExecutionPlan[]>(`/execution-plans/channel/${channelId}`);
      console.log('[Execution] List fetched by channel', {
        channel_id: channelId,
        count: response.data.length,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Execution] Fetch by channel failed', apiError);
      throw apiError;
    }
  },

  /**
   * 按用户获取执行计划
   *
   * @param userId 用户ID
   * @returns 执行计划列表
   */
  async getExecutionPlansByUser(userId: string): Promise<ExecutionPlan[]> {
    try {
      const response = await apiClient.get<ExecutionPlan[]>(`/execution-plans/user/${userId}`);
      console.log('[Execution] List fetched by user', {
        user_id: userId,
        count: response.data.length,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Execution] Fetch by user failed', apiError);
      throw apiError;
    }
  },

  /**
   * 更新执行计划
   *
   * @param planId 执行计划ID
   * @param data 更新的数据
   * @returns 更新后的执行计划
   */
  async updateExecutionPlan(planId: string, data: UpdateExecutionPlanRequest): Promise<ExecutionPlan> {
    try {
      const response = await apiClient.put<ExecutionPlan>(`/execution-plans/${planId}`, data);
      console.log('[Execution] Updated successfully', {
        plan_id: planId,
        execution_status: response.data.execution_status,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Execution] Update failed', apiError);
      throw apiError;
    }
  },

  /**
   * 更新执行计划状态
   *
   * @param planId 执行计划ID
   * @param statusData 状态数据
   * @returns 更新后的执行计划
   */
  async updateExecutionStatus(
    planId: string,
    statusData: UpdateExecutionStatusRequest
  ): Promise<ExecutionPlan> {
    try {
      const response = await apiClient.patch<ExecutionPlan>(`/execution-plans/${planId}/status`, statusData);
      console.log('[Execution] Status updated', {
        plan_id: planId,
        execution_status: response.data.execution_status,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Execution] Status update failed', apiError);
      throw apiError;
    }
  },

  /**
   * 删除执行计划
   *
   * @param planId 执行计划ID
   * @returns 删除结果
   */
  async deleteExecutionPlan(planId: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<{ message: string }>(`/execution-plans/${planId}`);
      console.log('[Execution] Deleted successfully', { plan_id: planId });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Execution] Deletion failed', apiError);
      throw apiError;
    }
  },
};

export default executionService;
