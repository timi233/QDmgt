import apiClient, { handleApiError } from './api';

/**
 * Channel Target Service
 *
 * Handles API calls for person/channel target management
 */

// ========== Type Definitions ==========

/**
 * Target type
 */
export type TargetType = 'person' | 'channel';

/**
 * Target data
 */
export interface TargetData {
  new_signing: number;
  core_opportunity: number;
  core_performance: number;
  high_value_opportunity: number;
  high_value_performance: number;
}

/**
 * Channel Target
 */
export interface ChannelTarget {
  id: string;
  target_type: TargetType;
  target_id: string;
  year: number;
  quarter: number;
  quarter_new_signing: number;
  quarter_core_opportunity: number;
  quarter_core_performance: number;
  quarter_high_value_opportunity: number;
  quarter_high_value_performance: number;
  month_targets: {
    [month: string]: TargetData;
  };
  created_at: string;
  updated_at?: string;
  created_by: string;
  last_modified_by: string;
}

/**
 * Create target request
 */
export interface CreateChannelTargetRequest {
  target_type: TargetType;
  target_id: string;
  year: number;
  quarter: number;
  quarter_target: TargetData;
  month_targets: {
    [month: string]: TargetData;
  };
}

/**
 * Update target request
 */
export interface UpdateChannelTargetRequest {
  quarter_target?: TargetData;
  month_targets?: {
    [month: string]: TargetData;
  };
}

/**
 * Target list response
 */
export interface ChannelTargetListResponse {
  targets: ChannelTarget[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * Query parameters
 */
export interface ChannelTargetQueryParams {
  target_type?: TargetType;
  target_id?: string;
  year?: number;
  quarter?: number;
  skip?: number;
  limit?: number;
}

// ========== API Methods ==========

const channelTargetService = {
  /**
   * Create a new target
   *
   * @param targetData Target data
   * @returns Created target
   */
  async createTarget(targetData: CreateChannelTargetRequest): Promise<ChannelTarget> {
    try {
      const response = await apiClient.post<ChannelTarget>(
        '/person-channel-targets/',
        targetData
      );
      console.log('[ChannelTarget] Created successfully', response.data);
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[ChannelTarget] Creation failed', apiError);
      throw apiError;
    }
  },

  /**
   * Get target list
   *
   * @param params Query parameters
   * @returns Target list
   */
  async getTargets(params?: ChannelTargetQueryParams): Promise<ChannelTargetListResponse> {
    try {
      const response = await apiClient.get<ChannelTargetListResponse>(
        '/person-channel-targets/',
        { params }
      );
      console.log('[ChannelTarget] List fetched', {
        total: response.data.total,
        count: response.data.targets.length,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[ChannelTarget] Fetch failed', apiError);
      throw apiError;
    }
  },

  /**
   * Get single target
   *
   * @param targetId Target ID
   * @returns Target details
   */
  async getTarget(targetId: string): Promise<ChannelTarget> {
    try {
      const response = await apiClient.get<ChannelTarget>(
        `/person-channel-targets/${targetId}`
      );
      console.log('[ChannelTarget] Fetched', { targetId });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[ChannelTarget] Fetch failed', apiError);
      throw apiError;
    }
  },

  /**
   * Update target
   *
   * @param targetId Target ID
   * @param targetData Update data
   * @returns Updated target
   */
  async updateTarget(
    targetId: string,
    targetData: UpdateChannelTargetRequest
  ): Promise<ChannelTarget> {
    try {
      const response = await apiClient.put<ChannelTarget>(
        `/person-channel-targets/${targetId}`,
        targetData
      );
      console.log('[ChannelTarget] Updated successfully', { targetId });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[ChannelTarget] Update failed', apiError);
      throw apiError;
    }
  },

  /**
   * Delete target
   *
   * @param targetId Target ID
   */
  async deleteTarget(targetId: string): Promise<void> {
    try {
      await apiClient.delete(`/person-channel-targets/${targetId}`);
      console.log('[ChannelTarget] Deleted successfully', { targetId });
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[ChannelTarget] Delete failed', apiError);
      throw apiError;
    }
  },
};

export default channelTargetService;
