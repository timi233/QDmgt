import apiClient, { tokenManager, handleApiError, ApiError } from './api';

/**
 * 认证服务
 *
 * 提供用户认证相关的API调用：
 * - 登录
 * - 注册
 * - 登出
 * - 获取当前用户信息
 * - Token刷新
 */

// ========== 类型定义 ==========

/**
 * 用户角色
 */
export type UserRole = 'admin' | 'manager' | 'user';

/**
 * 登录请求参数
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 注册请求参数
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  role?: UserRole;
}

/**
 * Token响应
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/**
 * 用户信息
 */
export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

/**
 * 更新用户请求参数
 */
export interface UpdateUserRequest {
  role: UserRole;
  is_active: boolean;
  password?: string;
}

/**
 * 认证服务API
 */
export const authService = {
  /**
   * 用户登录
   *
   * @param credentials 登录凭证（用户名和密码）
   * @returns Token和用户信息
   */
  async login(credentials: LoginRequest): Promise<{ tokens: TokenResponse; user: User }> {
    try {
      // 调用登录API
      const response = await apiClient.post<TokenResponse>('/auth/login', credentials);
      const tokens = response.data;

      // 保存Token到localStorage
      tokenManager.setTokens(tokens.access_token, tokens.refresh_token);

      // 获取当前用户信息
      const user = await this.getCurrentUser();

      console.log('[Auth] Login successful', { username: credentials.username, userId: user.id });

      return { tokens, user };
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Auth] Login failed', apiError);
      throw apiError;
    }
  },

  /**
   * 用户注册
   *
   * @param userData 注册信息
   * @returns 新创建的用户信息
   */
  async register(userData: RegisterRequest): Promise<User> {
    try {
      const response = await apiClient.post<User>('/auth/register', userData);
      const user = response.data;

      console.log('[Auth] Registration successful', { username: user.username, userId: user.id });

      return user;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Auth] Registration failed', apiError);
      throw apiError;
    }
  },

  /**
   * 用户登出
   *
   * 清除本地Token并调用后端登出API
   */
  async logout(): Promise<void> {
    try {
      // 调用后端登出API（可选，主要用于日志记录）
      await apiClient.post('/auth/logout');

      console.log('[Auth] Logout successful');
    } catch (error) {
      console.error('[Auth] Logout API call failed', error);
      // 即使API调用失败，也要清除本地Token
    } finally {
      // 清除本地Token
      tokenManager.clearTokens();
    }
  },

  /**
   * 获取当前登录用户信息
   *
   * @returns 当前用户信息
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      const user = response.data;

      console.log('[Auth] Current user fetched', { userId: user.id, username: user.username });

      return user;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Auth] Failed to fetch current user', apiError);
      throw apiError;
    }
  },

  /**
   * 获取用户列表
   *
   * @returns 用户列表
   */
  async getUsers(): Promise<User[]> {
    try {
      const response = await apiClient.get<User[]>('/auth/users');
      console.log('[Auth] User list fetched', { count: response.data.length });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Auth] Failed to fetch user list', apiError);
      throw apiError;
    }
  },

  /**
   * 更新用户信息
   *
   * @param userId 用户ID
   * @param data 更新数据（角色、启用状态、密码）
   * @returns 更新后的用户信息
   */
  async updateUser(
    userId: string,
    data: UpdateUserRequest
  ): Promise<User> {
    try {
      const response = await apiClient.put<User>(`/auth/users/${userId}`, data);
      console.log('[Auth] User updated', { userId, role: data.role, is_active: data.is_active, passwordUpdated: !!data.password });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Auth] Failed to update user', apiError);
      throw apiError;
    }
  },

  /**
   * 删除用户
   *
   * @param userId 用户ID
   * @returns 删除结果消息
   */
  async deleteUser(userId: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<{ message: string }>(`/auth/users/${userId}`);
      console.log('[Auth] User deleted', { userId });
      return response.data;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Auth] Failed to delete user', apiError);
      throw apiError;
    }
  },

  /**
   * 刷新访问Token
   *
   * @returns 新的Token
   */
  async refreshToken(): Promise<TokenResponse> {
    try {
      const refreshToken = tokenManager.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<TokenResponse>('/auth/refresh', {
        refresh_token: refreshToken,
      });

      const tokens = response.data;

      // 更新Token
      tokenManager.setTokens(tokens.access_token, tokens.refresh_token);

      console.log('[Auth] Token refreshed successfully');

      return tokens;
    } catch (error) {
      const apiError = handleApiError(error);
      console.error('[Auth] Token refresh failed', apiError);

      // Token刷新失败，清除所有Token
      tokenManager.clearTokens();

      throw apiError;
    }
  },

  /**
   * 检查是否已登录
   *
   * @returns 是否已登录
   */
  isAuthenticated(): boolean {
    return tokenManager.isAuthenticated();
  },

  /**
   * 检查用户是否有指定角色
   *
   * @param user 用户信息
   * @param allowedRoles 允许的角色列表
   * @returns 是否有权限
   */
  hasRole(user: User | null, allowedRoles: UserRole[]): boolean {
    if (!user) {
      return false;
    }

    return allowedRoles.includes(user.role);
  },

  /**
   * 检查用户是否为管理员
   *
   * @param user 用户信息
   * @returns 是否为管理员
   */
  isAdmin(user: User | null): boolean {
    return this.hasRole(user, ['admin']);
  },

  /**
   * 检查用户是否为管理员或经理
   *
   * @param user 用户信息
   * @returns 是否为管理员或经理
   */
  isManagerOrAdmin(user: User | null): boolean {
    return this.hasRole(user, ['admin', 'manager']);
  },
};

export default authService;
