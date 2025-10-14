import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { User, LoginRequest, RegisterRequest } from '../services/auth.service';
import { tokenManager } from '../services/api';

/**
 * 认证上下文
 *
 * 提供全局的认证状态管理：
 * - 当前登录用户信息
 * - 登录/登出方法
 * - 认证状态
 * - 权限检查
 */

// ========== 类型定义 ==========

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: () => boolean;
  isManagerOrAdmin: () => boolean;
}

// ========== Context创建 ==========

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ========== Provider组件 ==========

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * 初始化：检查本地Token并加载用户信息
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 检查是否有存储的Token
        if (tokenManager.isAuthenticated()) {
          console.log('[Auth] Token found, fetching user info...');

          // 获取当前用户信息
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);

          console.log('[Auth] User loaded successfully', currentUser);
        } else {
          console.log('[Auth] No token found, user not authenticated');
        }
      } catch (error) {
        console.error('[Auth] Failed to initialize auth', error);

        // Token可能过期，清除
        tokenManager.clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * 用户登录
   */
  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      setLoading(true);

      console.log('[Auth] Logging in...', credentials.username);

      // 调用登录服务
      const { user: loggedInUser } = await authService.login(credentials);

      // 更新用户状态
      setUser(loggedInUser);

      console.log('[Auth] Login successful', loggedInUser);
    } catch (error) {
      console.error('[Auth] Login failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 用户注册
   */
  const register = async (userData: RegisterRequest): Promise<User> => {
    try {
      setLoading(true);

      console.log('[Auth] Registering user...', userData.username);

      // 调用注册服务
      const newUser = await authService.register(userData);

      console.log('[Auth] Registration successful', newUser);

      return newUser;
    } catch (error) {
      console.error('[Auth] Registration failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 用户登出
   */
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);

      console.log('[Auth] Logging out...');

      // 调用登出服务
      await authService.logout();

      // 清除用户状态
      setUser(null);

      console.log('[Auth] Logout successful');
    } catch (error) {
      console.error('[Auth] Logout failed', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 刷新用户信息
   */
  const refreshUser = async (): Promise<void> => {
    try {
      console.log('[Auth] Refreshing user info...');

      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      console.log('[Auth] User refreshed', currentUser);
    } catch (error) {
      console.error('[Auth] Failed to refresh user', error);
      throw error;
    }
  };

  /**
   * 检查用户是否为管理员
   */
  const isAdmin = (): boolean => {
    return authService.isAdmin(user);
  };

  /**
   * 检查用户是否为管理员或经理
   */
  const isManagerOrAdmin = (): boolean => {
    return authService.isManagerOrAdmin(user);
  };

  // Context值
  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    isAdmin,
    isManagerOrAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ========== Custom Hook ==========

/**
 * 使用认证上下文的Hook
 *
 * @returns 认证上下文
 * @throws 如果在Provider外部使用
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default AuthContext;
