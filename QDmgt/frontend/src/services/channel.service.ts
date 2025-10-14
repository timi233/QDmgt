import apiClient, { handleApiError } from './api';
import { Channel } from '../types';

/**
 * 渠道服务
 *
 * 提供渠道管理相关的API调用：
 * - 创建渠道
 * - 获取渠道列表
 * - 获取单个渠道
 * - 更新渠道
 * - 删除渠道
 */

// ========== 类型定义 ==========

/**
 * 渠道状态
 */
export type ChannelStatus = 'active' | 'inactive' | 'suspended';

/**
 * 业务类型
 */
export type BusinessType = 'basic' | 'high-value' | 'pending-signup';

/**
 * 创建渠道请求
 */
export interface CreateChannelRequest {
  name: string;
  description?: string;
  status: ChannelStatus;
  business_type: BusinessType;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
}

/**
 * 更新渠道请求
 */
export interface UpdateChannelRequest {
  name?: string;
  description?: string;
  status?: ChannelStatus;
  business_type?: BusinessType;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
}

/**
 * 渠道列表查询参数
 */
export interface ChannelListParams {
  skip?: number;
  limit?: number;
  search?: string;
  status?: ChannelStatus;
  business_type?: BusinessType;
}

/**
 * 渠道列表响应
 */
export interface ChannelListResponse {
  channels: Channel[];
  total: number;
  skip: number;
  limit: number;
  pages: number;
}

/**
 * 渠道服务API
 */
export const channelService = {
  /**
   * 创建新渠道
   *
   * @param channelData 渠道数据
   * @returns 创建的渠道
   */
  async createChannel(channelData: CreateChannelRequest): Promise<Channel> {
    try {
      const response = await apiClient.post<Channel>('/channels/', channelData);
      console.log('[Channel] Created successfully', response.data);
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Channel] Creation failed', apiError);
      throw apiError;
    }
  },

  /**
   * 获取渠道列表
   *
   * @param params 查询参数（分页、搜索、筛选）
   * @returns 渠道列表
   */
  async getChannels(params?: ChannelListParams): Promise<ChannelListResponse> {
    try {
      const response = await apiClient.get<ChannelListResponse>('/channels/', { params });
      console.log('[Channel] List fetched', {
        total: response.data.total,
        count: response.data.channels.length,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Channel] Fetch list failed', apiError);
      throw apiError;
    }
  },

  /**
   * 获取单个渠道详情
   *
   * @param channelId 渠道ID
   * @returns 渠道详情
   */
  async getChannelById(channelId: string): Promise<Channel> {
    try {
      const response = await apiClient.get<Channel>(`/channels/${channelId}`);
      console.log('[Channel] Fetched by ID', { channelId, name: response.data.name });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Channel] Fetch by ID failed', apiError);
      throw apiError;
    }
  },

  /**
   * 更新渠道
   *
   * @param channelId 渠道ID
   * @param channelData 更新的数据
   * @returns 更新后的渠道
   */
  async updateChannel(channelId: string, channelData: UpdateChannelRequest): Promise<Channel> {
    try {
      const response = await apiClient.put<Channel>(`/channels/${channelId}`, channelData);
      console.log('[Channel] Updated successfully', { channelId, name: response.data.name });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Channel] Update failed', apiError);
      throw apiError;
    }
  },

  /**
   * 删除渠道
   *
   * @param channelId 渠道ID
   * @returns 删除结果消息
   */
  async deleteChannel(channelId: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<{ message: string }>(`/channels/${channelId}`);
      console.log('[Channel] Deleted successfully', { channelId });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Channel] Deletion failed', apiError);
      throw apiError;
    }
  },

  /**
   * 搜索渠道（辅助方法）
   *
   * @param searchTerm 搜索关键词
   * @param params 其他查询参数
   * @returns 渠道列表
   */
  async searchChannels(
    searchTerm: string,
    params?: Omit<ChannelListParams, 'search'>
  ): Promise<ChannelListResponse> {
    return this.getChannels({
      ...params,
      search: searchTerm,
    });
  },

  /**
   * 按状态筛选渠道（辅助方法）
   *
   * @param status 渠道状态
   * @param params 其他查询参数
   * @returns 渠道列表
   */
  async getChannelsByStatus(
    status: ChannelStatus,
    params?: Omit<ChannelListParams, 'status'>
  ): Promise<ChannelListResponse> {
    return this.getChannels({
      ...params,
      status,
    });
  },

  /**
   * 按业务类型筛选渠道（辅助方法）
   *
   * @param businessType 业务类型
   * @param params 其他查询参数
   * @returns 渠道列表
   */
  async getChannelsByBusinessType(
    businessType: BusinessType,
    params?: Omit<ChannelListParams, 'business_type'>
  ): Promise<ChannelListResponse> {
    return this.getChannels({
      ...params,
      business_type: businessType,
    });
  },
};

export default channelService;
