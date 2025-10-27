import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * API客户端配置
 *
 * 功能：
 * - 统一的API请求配置
 * - 自动添加JWT Token到请求头
 * - 统一的错误处理
 * - 请求/响应拦截
 */

// API基础URL配置
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001';

// Token存储键
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * 创建Axios实例
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器 - 自动添加Token
 */
apiClient.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);

    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器 - 统一错误处理
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    console.error('[API Response Error]', error.response?.status, error.message);

    // 401 未授权 - Token过期或无效
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 尝试刷新Token
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;

          // 保存新Token
          localStorage.setItem(TOKEN_KEY, access_token);
          localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);

          // 重试原始请求
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('[Token Refresh Failed]', refreshError);

        // 刷新失败，清除Token并跳转到登录页
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    // 403 禁止访问
    if (error.response?.status === 403) {
      console.error('[Access Denied] Insufficient permissions');
    }

    // 404 未找到
    if (error.response?.status === 404) {
      console.error('[Not Found]', error.config?.url);
    }

    // 500 服务器错误
    if (error.response?.status === 500) {
      console.error('[Server Error] Internal server error');
    }

    return Promise.reject(error);
  }
);

/**
 * Token管理工具
 */
export const tokenManager = {
  /**
   * 保存Token
   */
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  /**
   * 获取访问Token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * 获取刷新Token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * 清除所有Token
   */
  clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};

/**
 * API响应类型
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
}

/**
 * API错误类型
 */
export interface ApiError {
  message: string;
  status?: number;
  detail?: any;
}

/**
 * 错误处理工具
 */
export const handleApiError = (error: any): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    return {
      message: axiosError.response?.data?.detail || axiosError.message || 'API请求失败',
      status: axiosError.response?.status,
      detail: axiosError.response?.data,
    };
  }

  return {
    message: error.message || '未知错误',
  };
};

export default apiClient;
