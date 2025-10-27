import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { isAdmin, isManagerOrAdmin } = useAuth();

  const managerOrAdmin = isManagerOrAdmin();
  const admin = isAdmin();

  return {
    canView: true,
    canCreate: managerOrAdmin,
    canEdit: managerOrAdmin,
    canUpdateAchievement: managerOrAdmin,
    canDelete: admin,
    isAdmin: admin,
    isManagerOrAdmin: managerOrAdmin,
  };
};

// Mock permission levels
type PermissionLevel = 'read' | 'write' | 'admin';

// Mock user context - in a real implementation, this would come from authentication
interface UserContext {
  userId: string;
  username: string;
  role: string;
  permissions: Record<string, PermissionLevel>;
}

// Mock assignment data - in a real implementation, this would come from an API
interface ChannelAssignment {
  userId: string;
  channelId: string;
  permissionLevel: PermissionLevel;
}

// Mock data for demonstration
const MOCK_USER_CONTEXT: UserContext = {
  userId: '1',
  username: 'admin',
  role: 'admin',
  permissions: {
    'channel-1': 'admin',
    'channel-2': 'write',
    'channel-3': 'read'
  }
};

const MOCK_ASSIGNMENTS: ChannelAssignment[] = [
  { userId: '1', channelId: 'channel-1', permissionLevel: 'admin' },
  { userId: '1', channelId: 'channel-2', permissionLevel: 'write' },
  { userId: '1', channelId: 'channel-3', permissionLevel: 'read' }
];

/**
 * Hook to check user permissions for a specific channel
 */
export const useChannelPermission = (channelId: string) => {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize user context - in a real implementation, this would come from auth context
  useEffect(() => {
    const initializeUserContext = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Simulate fetching user context
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // In a real implementation, this would come from authentication context
        setUserContext(MOCK_USER_CONTEXT);
      } catch (err) {
        setError('Failed to initialize user context');
        console.error('Error initializing user context:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeUserContext();
  }, []);

  /**
   * Check if user has specific permission level for the channel
   */
  const hasPermission = (requiredPermission: PermissionLevel): boolean => {
    if (loading || error || !userContext) {
      return false;
    }

    // Admin users have all permissions
    if (userContext.role === 'admin') {
      return true;
    }

    // Get user's permission level for this channel
    const userPermission = userContext.permissions[channelId];
    
    if (!userPermission) {
      return false;
    }

    // Map permission levels to numeric values for comparison
    const permissionValues: Record<PermissionLevel, number> = {
      read: 1,
      write: 2,
      admin: 3
    };

    return permissionValues[userPermission] >= permissionValues[requiredPermission];
  };

  /**
   * Get user's specific permission level for the channel
   */
  const getUserPermissionLevel = (): PermissionLevel | null => {
    if (loading || error || !userContext) {
      return null;
    }

    return userContext.permissions[channelId] || null;
  };

  /**
   * Check if user can perform admin actions (delete, full edit)
   */
  const canAdminister = (): boolean => {
    return hasPermission('admin');
  };

  /**
   * Check if user can perform write actions (create, update)
   */
  const canWrite = (): boolean => {
    return hasPermission('write');
  };

  /**
   * Check if user can perform read actions (view)
   */
  const canRead = (): boolean => {
    return hasPermission('read');
  };

  return {
    loading,
    error,
    hasPermission,
    getUserPermissionLevel,
    canAdminister,
    canWrite,
    canRead,
    userContext
  };
};

/**
 * Hook to check if user has specific role
 */
export const useUserRole = () => {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUserContext = async () => {
      setLoading(true);
      
      try {
        // Simulate fetching user context
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setUserContext(MOCK_USER_CONTEXT);
      } catch (err) {
        console.error('Error initializing user context:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeUserContext();
  }, []);

  /**
   * Check if user has specific role
   */
  const hasRole = (role: string): boolean => {
    if (loading || !userContext) {
      return false;
    }

    return userContext.role === role;
  };

  /**
   * Check if user is admin
   */
  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  /**
   * Check if user is manager
   */
  const isManager = (): boolean => {
    return hasRole('manager');
  };

  return {
    loading,
    hasRole,
    isAdmin,
    isManager,
    userContext
  };
};

/**
 * Hook to check permissions for current route/location
 */
export const useRoutePermission = () => {
  const location = useLocation();
  const [requiredPermission, setRequiredPermission] = useState<PermissionLevel | null>(null);

  // Determine required permission based on route
  useEffect(() => {
    // This is a simplified example - in a real implementation, you would have
    // a more sophisticated mapping of routes to permissions
    const routePermissionMap: Record<string, PermissionLevel> = {
      '/channels/create': 'write',
      '/channels/edit/:id': 'write',
      '/channels/delete/:id': 'admin',
      '/channels/:id/assign': 'admin',
      '/channels/:id/targets': 'write',
      '/channels/:id/executions': 'write'
    };

    // Extract route pattern (simplified)
    const routePattern = location.pathname.replace(/\/\d+/g, '/:id');
    const permission = routePermissionMap[routePattern] || 'read';
    
    setRequiredPermission(permission);
  }, [location.pathname]);

  return {
    requiredPermission,
    route: location.pathname
  };
};

/**
 * Hook to check if user can access specific channel features
 */
export const useChannelFeatureAccess = (channelId: string) => {
  const { 
    loading: permissionLoading, 
    error: permissionError, 
    hasPermission,
    getUserPermissionLevel
  } = useChannelPermission(channelId);

  /**
   * Check if user can access target planning feature
   */
  const canAccessTargetPlanning = (): boolean => {
    if (permissionLoading || permissionError) {
      return false;
    }
    
    // Users with write or admin permissions can access target planning
    return hasPermission('write');
  };

  /**
   * Check if user can access execution tracking feature
   */
  const canAccessExecutionTracking = (): boolean => {
    if (permissionLoading || permissionError) {
      return false;
    }
    
    // Users with write or admin permissions can access execution tracking
    return hasPermission('write');
  };

  /**
   * Check if user can access assignment management feature
   */
  const canAccessAssignmentManagement = (): boolean => {
    if (permissionLoading || permissionError) {
      return false;
    }
    
    // Only admin users can manage assignments
    return hasPermission('admin');
  };

  /**
   * Get accessible features for the user
   */
  const getAccessibleFeatures = (): string[] => {
    if (permissionLoading || permissionError) {
      return [];
    }

    const features: string[] = [];

    if (canAccessTargetPlanning()) {
      features.push('target-planning');
    }

    if (canAccessExecutionTracking()) {
      features.push('execution-tracking');
    }

    if (canAccessAssignmentManagement()) {
      features.push('assignment-management');
    }

    return features;
  };

  return {
    loading: permissionLoading,
    error: permissionError,
    canAccessTargetPlanning,
    canAccessExecutionTracking,
    canAccessAssignmentManagement,
    getAccessibleFeatures,
    userPermissionLevel: getUserPermissionLevel()
  };
};
