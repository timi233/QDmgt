import React from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../services/auth.service';

/**
 * 受保护的路由组件
 *
 * 功能：
 * - 检查用户是否已登录
 * - 未登录时重定向到登录页
 * - 支持基于角色的访问控制
 * - 显示加载状态
 */

interface PrivateRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  // 正在加载用户信息
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">加载中...</span>
          </Spinner>
          <p className="mt-3">正在验证身份...</p>
        </div>
      </div>
    );
  }

  // 未登录，重定向到登录页
  if (!isAuthenticated) {
    console.log('[PrivateRoute] User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // 检查角色权限
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) {
      console.log('[PrivateRoute] User does not have required role', {
        userRole: user?.role,
        allowedRoles,
      });

      // 权限不足，重定向到首页或显示403页面
      return (
        <div className="container mt-5">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">访问被拒绝</h4>
            <p>您没有权限访问此页面。</p>
            <hr />
            <p className="mb-0">
              需要的角色: {allowedRoles.join(', ')} | 您的角色: {user?.role || '未知'}
            </p>
          </div>
        </div>
      );
    }
  }

  // 已登录且有权限，显示子组件
  return children;
};

export default PrivateRoute;
