import apiClient, { handleApiError } from './api';

export type TargetType = 'person' | 'channel';
export type PeriodType = 'quarter' | 'month';

export interface UnifiedTarget {
  id: string;
  target_type: TargetType;
  target_id: string;
  period_type: PeriodType;
  year: number;
  quarter: number;
  month?: number;
  new_signing_target: number;
  core_opportunity_target: number;
  core_performance_target: number;
  high_value_opportunity_target: number;
  high_value_performance_target: number;
  new_signing_achieved: number;
  core_opportunity_achieved: number;
  core_performance_achieved: number;
  high_value_opportunity_achieved: number;
  high_value_performance_achieved: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  created_by: string;
  last_modified_by: string;
}

export interface CreateUnifiedTargetRequest {
  target_type: TargetType;
  target_id: string;
  period_type: PeriodType;
  year: number;
  quarter: number;
  month?: number;
  new_signing_target: number;
  core_opportunity_target: number;
  core_performance_target: number;
  high_value_opportunity_target: number;
  high_value_performance_target: number;
  notes?: string;
}

export interface UpdateUnifiedTargetRequest {
  new_signing_target?: number;
  core_opportunity_target?: number;
  core_performance_target?: number;
  high_value_opportunity_target?: number;
  high_value_performance_target?: number;
  notes?: string;
}

export interface UpdateUnifiedTargetAchievementRequest {
  new_signing_achieved?: number;
  core_opportunity_achieved?: number;
  core_performance_achieved?: number;
  high_value_opportunity_achieved?: number;
  high_value_performance_achieved?: number;
}

export interface TargetQueryParams {
  target_type?: TargetType;
  target_id?: string;
  period_type?: PeriodType;
  year?: number;
  quarter?: number;
  month?: number;
  skip?: number;
  limit?: number;
}

export interface TargetCompletion {
  new_signing: number;
  core_opportunity: number;
  core_performance: number;
  high_value_opportunity: number;
  high_value_performance: number;
  overall: number;
}

interface UnifiedTargetListResponse {
  targets: UnifiedTarget[];
  total: number;
  skip: number;
  limit: number;
}

interface CompletionResponse {
  target_id: string;
  completion: Record<string, number>;
}

export interface QuarterViewResponse {
  quarter: UnifiedTarget | null;
  months: UnifiedTarget[];
}

const BASE_URL = '/unified-targets';

const mapCompletion = (response: CompletionResponse): TargetCompletion => {
  const completion = response.completion || {};
  return {
    new_signing: Number(completion.new_signing || 0),
    core_opportunity: Number(completion.core_opportunity || 0),
    core_performance: Number(completion.core_performance || 0),
    high_value_opportunity: Number(completion.high_value_opportunity || 0),
    high_value_performance: Number(completion.high_value_performance || 0),
    overall: Number(completion.overall || 0),
  };
};

export const unifiedTargetService = {
  async createTarget(data: CreateUnifiedTargetRequest): Promise<UnifiedTarget> {
    try {
      const response = await apiClient.post<UnifiedTarget>(`${BASE_URL}/`, data);
      console.log('[UnifiedTarget] Created', {
        target_id: response.data.id,
        target_type: data.target_type,
        period_type: data.period_type,
      });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[UnifiedTarget] Create failed', apiError);
      throw apiError;
    }
  },

  async getTargets(params?: TargetQueryParams): Promise<UnifiedTarget[]> {
    try {
      const response = await apiClient.get<UnifiedTargetListResponse>(`${BASE_URL}/`, {
        params,
      });
      console.log('[UnifiedTarget] List fetched', {
        count: response.data.targets.length,
        total: response.data.total,
      });
      return response.data.targets;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[UnifiedTarget] List fetch failed', apiError);
      throw apiError;
    }
  },

  async getTarget(targetId: string): Promise<UnifiedTarget> {
    try {
      const response = await apiClient.get<UnifiedTarget>(`${BASE_URL}/${targetId}`);
      console.log('[UnifiedTarget] Detail fetched', { target_id: targetId });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[UnifiedTarget] Detail fetch failed', apiError);
      throw apiError;
    }
  },

  async updateTarget(
    targetId: string,
    data: UpdateUnifiedTargetRequest
  ): Promise<UnifiedTarget> {
    try {
      const response = await apiClient.put<UnifiedTarget>(`${BASE_URL}/${targetId}`, data);
      console.log('[UnifiedTarget] Updated', { target_id: targetId });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[UnifiedTarget] Update failed', apiError);
      throw apiError;
    }
  },

  async updateAchievement(
    targetId: string,
    data: UpdateUnifiedTargetAchievementRequest
  ): Promise<UnifiedTarget> {
    try {
      const response = await apiClient.patch<UnifiedTarget>(
        `${BASE_URL}/${targetId}/achievement`,
        data
      );
      console.log('[UnifiedTarget] Achievement updated', { target_id: targetId });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[UnifiedTarget] Achievement update failed', apiError);
      throw apiError;
    }
  },

  async deleteTarget(targetId: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE_URL}/${targetId}`);
      console.log('[UnifiedTarget] Deleted', { target_id: targetId });
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[UnifiedTarget] Delete failed', apiError);
      throw apiError;
    }
  },

  async getCompletion(targetId: string): Promise<TargetCompletion> {
    try {
      const response = await apiClient.get<CompletionResponse>(
        `${BASE_URL}/${targetId}/completion`
      );
      console.log('[UnifiedTarget] Completion fetched', { target_id: targetId });
      return mapCompletion(response.data);
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[UnifiedTarget] Completion fetch failed', apiError);
      throw apiError;
    }
  },

  async getQuarterView(
    targetType: TargetType,
    targetId: string,
    year: number,
    quarter: number
  ): Promise<QuarterViewResponse> {
    try {
      const response = await apiClient.get<QuarterViewResponse>(`${BASE_URL}/quarter-view`, {
        params: {
          target_type: targetType,
          target_id: targetId,
          year,
          quarter,
        },
      });
      console.log('[UnifiedTarget] Quarter view fetched', {
        target_type: targetType,
        target_id: targetId,
        year,
        quarter,
      });
      return {
        quarter: response.data.quarter ?? null,
        months: response.data.months || [],
      };
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[UnifiedTarget] Quarter view fetch failed', apiError);
      throw apiError;
    }
  },
};

export default unifiedTargetService;
