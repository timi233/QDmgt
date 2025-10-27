import apiClient, { handleApiError } from './api';

/**
 * 分配服务
 *
 * 提供用户与渠道分配关系的API调用：
 * - 创建分配
 * - 按用户获取分配
 * - 按渠道获取分配
 * - 更新分配
 * - 删除分配
 */

// ========== 类型定义 ==========

/**
 * 权限等级
 */
export type PermissionLevel = 'read' | 'write' | 'admin';

/**
 * 分配信息
 */
export interface Assignment {
  id: string;
  user_id: string;
  channel_id: string;
  permission_level: PermissionLevel;
  target_responsibility: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 创建分配请求
 */
export interface CreateAssignmentRequest {
  user_id: string;
  channel_id: string;
  permission_level: PermissionLevel;
  target_responsibility?: boolean;
}

/**
 * 更新分配请求
 */
export interface UpdateAssignmentRequest {
  permission_level?: PermissionLevel;
  target_responsibility?: boolean;
}

/**
 * 分配服务API
 */
export const assignmentService = {
  /**
   * 创建用户与渠道的分配关系
   *
   * @param userId 用户ID
   * @param channelId 渠道ID
   * @param permissionLevel 权限等级
   * @param targetResponsibility 是否承担目标
   * @returns 创建的分配信息
   */
  async createAssignment(
    userId: string,
    channelId: string,
    permissionLevel: PermissionLevel,
    targetResponsibility?: boolean
  ): Promise<Assignment> {
    try {
      const payload: CreateAssignmentRequest = {
        user_id: userId,
        channel_id: channelId,
        permission_level: permissionLevel,
        target_responsibility: targetResponsibility,
      };
      const response = await apiClient.post<Assignment>('/assignments/', payload);
      console.log('[Assignment] Created successfully', {
        id: response.data.id,
        user_id: userId,
        channel_id: channelId,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Assignment] Creation failed', apiError);
      throw apiError;
    }
  },

  /**
   * 按用户获取分配列表
   *
   * @param userId 用户ID
   * @returns 分配列表
   */
  async getAssignmentsByUser(userId: string): Promise<Assignment[]> {
    try {
      const response = await apiClient.get<{ assignments: Assignment[] }>(`/assignments/user/${userId}`);
      const assignments = response.data.assignments || [];
      console.log('[Assignment] List fetched by user', {
        user_id: userId,
        count: assignments.length,
      });
      return assignments;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Assignment] Fetch by user failed', apiError);
      throw apiError;
    }
  },

  /**
   * 按渠道获取分配列表
   *
   * @param channelId 渠道ID
   * @returns 分配列表
   */
  async getAssignmentsByChannel(channelId: string): Promise<Assignment[]> {
    try {
      const response = await apiClient.get<{ assignments: Assignment[] }>(`/assignments/channel/${channelId}`);
      const assignments = response.data.assignments || [];
      console.log('[Assignment] List fetched by channel', {
        channel_id: channelId,
        count: assignments.length,
      });
      return assignments;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Assignment] Fetch by channel failed', apiError);
      throw apiError;
    }
  },

  /**
   * 更新分配信息
   *
   * @param assignmentId 分配ID
   * @param data 更新的数据
   * @returns 更新后的分配
   */
  async updateAssignment(assignmentId: string, data: UpdateAssignmentRequest): Promise<Assignment> {
    try {
      const response = await apiClient.put<Assignment>(`/assignments/${assignmentId}`, data);
      console.log('[Assignment] Updated successfully', {
        assignment_id: assignmentId,
        permission_level: response.data.permission_level,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Assignment] Update failed', apiError);
      throw apiError;
    }
  },

  /**
   * 删除分配
   *
   * @param assignmentId 分配ID
   * @returns 删除结果
   */
  async deleteAssignment(assignmentId: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<{ message: string }>(`/assignments/${assignmentId}`);
      console.log('[Assignment] Deleted successfully', { assignment_id: assignmentId });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Assignment] Deletion failed', apiError);
      throw apiError;
    }
  },
};

export default assignmentService;
