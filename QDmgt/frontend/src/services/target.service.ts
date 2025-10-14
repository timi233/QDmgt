import apiClient, { handleApiError } from './api';

/**
 * 目标规划服务
 *
 * 提供渠道目标规划相关的API调用：
 * - 创建目标
 * - 获取渠道目标列表
 * - 更新目标
 * - 更新目标达成情况
 * - 获取目标完成度
 */

// ========== 类型定义 ==========

/**
 * 目标规划
 */
export interface TargetPlan {
  id: string;
  channel_id: string;
  year: number;
  quarter: number;
  month?: number;
  performance_target: number;
  opportunity_target: number;
  project_count_target: number;
  development_goal?: string;
  achieved_performance?: number;
  achieved_opportunity?: number;
  achieved_project_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * 创建目标请求
 */
export interface CreateTargetRequest {
  channel_id: string;
  year: number;
  quarter: number;
  month?: number;
  performance_target: number;
  opportunity_target: number;
  project_count_target: number;
  development_goal?: string;
  achieved_performance?: number;
  achieved_opportunity?: number;
  achieved_project_count?: number;
}

/**
 * 目标指标输入
 */
export interface TargetMetricsInput {
  month?: number;
  performance_target: number;
  opportunity_target: number;
  project_count_target: number;
  development_goal?: string;
  achieved_performance?: number;
  achieved_opportunity?: number;
  achieved_project_count?: number;
}

/**
 * 更新目标请求
 */
export interface UpdateTargetRequest {
  year?: number;
  quarter?: number;
  month?: number;
  performance_target?: number;
  opportunity_target?: number;
  project_count_target?: number;
  development_goal?: string;
  achieved_performance?: number;
  achieved_opportunity?: number;
  achieved_project_count?: number;
}

/**
 * 更新达成情况请求
 */
export interface UpdateTargetAchievementRequest {
  achieved_performance?: number;
  achieved_opportunity?: number;
  achieved_project_count?: number;
}

/**
 * 目标完成度
 */
export interface TargetCompletion {
  target_id: string;
  performance_completion: number;
  opportunity_completion: number;
  project_count_completion: number;
  overall_completion: number;
  updated_at: string;
}

/**
 * 目标规划服务API
 */
export const targetService = {
  /**
   * 创建渠道目标
   *
   * @param channelId 渠道ID
   * @param year 年份
   * @param quarter 季度
   * @param targets 目标指标
   * @returns 创建的目标
   */
  async createTarget(
    channelId: string,
    year: number,
    quarter: number,
    targets: TargetMetricsInput
  ): Promise<TargetPlan> {
    try {
      const payload: CreateTargetRequest = {
        channel_id: channelId,
        year,
        quarter,
        ...targets,
      };
      const response = await apiClient.post<TargetPlan>('/targets/', payload);
      console.log('[Target] Created successfully', {
        id: response.data.id,
        channel_id: channelId,
        year,
        quarter,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Target] Creation failed', apiError);
      throw apiError;
    }
  },

  /**
   * 获取渠道的全部目标
   *
   * @param channelId 渠道ID
   * @returns 目标列表
   */
  async getTargetsByChannel(channelId: string): Promise<TargetPlan[]> {
    try {
      const response = await apiClient.get<TargetPlan[]>(`/targets/channel/${channelId}`);
      console.log('[Target] List fetched by channel', {
        channel_id: channelId,
        count: response.data.length,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Target] Fetch by channel failed', apiError);
      throw apiError;
    }
  },

  /**
   * 更新目标数据
   *
   * @param targetId 目标ID
   * @param data 更新的数据
   * @returns 更新后的目标
   */
  async updateTarget(targetId: string, data: UpdateTargetRequest): Promise<TargetPlan> {
    try {
      const response = await apiClient.put<TargetPlan>(`/targets/${targetId}`, data);
      console.log('[Target] Updated successfully', {
        target_id: targetId,
        year: response.data.year,
        quarter: response.data.quarter,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Target] Update failed', apiError);
      throw apiError;
    }
  },

  /**
   * 更新目标的达成情况
   *
   * @param targetId 目标ID
   * @param achievementData 达成情况
   * @returns 更新后的目标
   */
  async updateTargetAchievement(
    targetId: string,
    achievementData: UpdateTargetAchievementRequest
  ): Promise<TargetPlan> {
    try {
      const response = await apiClient.patch<TargetPlan>(
        `/targets/${targetId}/achievement`,
        achievementData
      );
      console.log('[Target] Achievement updated', {
        target_id: targetId,
        achieved_performance: response.data.achieved_performance,
        achieved_opportunity: response.data.achieved_opportunity,
        achieved_project_count: response.data.achieved_project_count,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Target] Achievement update failed', apiError);
      throw apiError;
    }
  },

  /**
   * 获取目标完成情况
   *
   * @param targetId 目标ID
   * @returns 目标完成度
   */
  async getTargetCompletion(targetId: string): Promise<TargetCompletion> {
    try {
      const response = await apiClient.get<TargetCompletion>(`/targets/${targetId}/completion`);
      console.log('[Target] Completion fetched', {
        target_id: targetId,
        overall_completion: response.data.overall_completion,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Target] Completion fetch failed', apiError);
      throw apiError;
    }
  },
};

export default targetService;
