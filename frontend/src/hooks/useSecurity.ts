import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Mock security utilities - in a real implementation, these would be actual security functions
const mockSecurityUtils = {
  // Mock token validation
  validateToken: (token: string) => {
    // In a real implementation, this would verify the JWT token
    return token && token.length > 20; // Simplified check
  },
  
  // Mock session validation
  validateSession: (sessionId: string) => {
    // In a real implementation, this would check with the backend
    return sessionId && sessionId.length > 20; // Simplified check
  },
  
  // Mock permission checking
  hasPermission: (userRole: string, requiredPermission: string) => {
    const permissionLevels: Record<string, number> = {
      'read': 1,
      'write': 2,
      'admin': 3
    };
    
    const userLevel = permissionLevels[userRole] || 0;
    const requiredLevel = permissionLevels[requiredPermission] || 0;
    
    return userLevel >= requiredLevel;
  },
  
  // Mock CSRF token generation
  generateCSRFToken: () => {
    return 'csrf-token-' + Math.random().toString(36).substr(2, 9);
  },
  
  // Mock XSS sanitization
  sanitizeInput: (input: string) => {
    if (typeof input !== 'string') return '';
    
    // Basic XSS prevention
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  }
};

// Mock user context - in a real implementation, this would come from authentication context
interface UserContext {
  isAuthenticated: boolean;
  userId: string | null;
  username: string | null;
  role: string | null;
  permissions: string[];
  csrfToken: string | null;
}

const MOCK_USER_CONTEXT: UserContext = {
  isAuthenticated: true,
  userId: '1',
  username: 'admin',
  role: 'admin',
  permissions: ['read', 'write', 'admin'],
  csrfToken: mockSecurityUtils.generateCSRFToken()
};

/**
 * Hook for managing authentication state and security context
 */
export const useAuth = () => {
  const [userContext, setUserContext] = useState<UserContext>(MOCK_USER_CONTEXT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Initialize authentication context
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Simulate fetching authentication context
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In a real implementation, this would check for valid session/token
        const token = localStorage.getItem('authToken');
        const sessionId = localStorage.getItem('sessionId');
        
        if (token && mockSecurityUtils.validateToken(token) && 
            sessionId && mockSecurityUtils.validateSession(sessionId)) {
          setUserContext(MOCK_USER_CONTEXT);
        } else {
          // Not authenticated
          setUserContext({
            isAuthenticated: false,
            userId: null,
            username: null,
            role: null,
            permissions: [],
            csrfToken: null
          });
        }
      } catch (err) {
        setError('Failed to initialize authentication');
        console.error('Error initializing auth:', err);
        
        // Set unauthenticated state on error
        setUserContext({
          isAuthenticated: false,
          userId: null,
          username: null,
          role: null,
          permissions: [],
          csrfToken: null
        });
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login function
   */
  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would make an actual API call
      if (username && password && password.length >= 6) {
        // Successful login
        const newCsrfToken = mockSecurityUtils.generateCSRFToken();
        const newUserContext: UserContext = {
          isAuthenticated: true,
          userId: '1',
          username: username,
          role: 'admin', // Would come from API response
          permissions: ['read', 'write', 'admin'], // Would come from API response
          csrfToken: newCsrfToken
        };
        
        setUserContext(newUserContext);
        
        // Store tokens (in a real implementation, use secure storage)
        localStorage.setItem('authToken', 'mock-auth-token-' + Math.random().toString(36).substr(2, 9));
        localStorage.setItem('sessionId', 'mock-session-id-' + Math.random().toString(36).substr(2, 9));
        localStorage.setItem('csrfToken', newCsrfToken);
        
        return { success: true, user: newUserContext };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout function
   */
  const logout = useCallback(() => {
    // Clear authentication context
    setUserContext({
      isAuthenticated: false,
      userId: null,
      username: null,
      role: null,
      permissions: [],
      csrfToken: null
    });
    
    // Clear stored tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('csrfToken');
    
    // Navigate to login page
    navigate('/login');
  }, [navigate]);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useCallback(() => {
    return userContext.isAuthenticated;
  }, [userContext.isAuthenticated]);

  /**
   * Get CSRF token
   */
  const getCSRFToken = useCallback(() => {
    return userContext.csrfToken;
  }, [userContext.csrfToken]);

  return {
    user: userContext,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    getCSRFToken
  };
};

/**
 * Hook for checking user permissions
 */
export const usePermission = () => {
  const { user } = useAuth();
  
  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback((permission: string) => {
    if (!user.isAuthenticated || !user.role) {
      return false;
    }
    
    return mockSecurityUtils.hasPermission(user.role, permission);
  }, [user]);

  /**
   * Check if user has admin role
   */
  const isAdmin = useCallback(() => {
    return user.isAuthenticated && user.role === 'admin';
  }, [user]);

  /**
   * Check if user can perform write operations
   */
  const canWrite = useCallback(() => {
    return hasPermission('write');
  }, [hasPermission]);

  /**
   * Check if user can perform read operations
   */
  const canRead = useCallback(() => {
    return hasPermission('read');
  }, [hasPermission]);

  return {
    hasPermission,
    isAdmin,
    canWrite,
    canRead
  };
};

/**
 * Hook for input sanitization to prevent XSS attacks
 */
export const useInputSanitizer = () => {
  /**
   * Sanitize string input
   */
  const sanitizeString = useCallback((input: string) => {
    return mockSecurityUtils.sanitizeInput(input);
  }, []);

  /**
   * Sanitize email input
   */
  const sanitizeEmail = useCallback((email: string) => {
    if (typeof email !== 'string') return '';
    
    // Basic email validation and sanitization
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (emailRegex.test(cleanEmail)) {
      return cleanEmail;
    }
    
    return '';
  }, []);

  /**
   * Sanitize URL input
   */
  const sanitizeUrl = useCallback((url: string) => {
    if (typeof url !== 'string') return '';
    
    try {
      // Basic URL validation
      const cleanUrl = url.trim();
      new URL(cleanUrl); // This will throw if invalid
      return cleanUrl;
    } catch {
      return '';
    }
  }, []);

  return {
    sanitizeString,
    sanitizeEmail,
    sanitizeUrl
  };
};

/**
 * Hook for CSRF protection
 */
export const useCSRFProtection = () => {
  const { getCSRFToken } = useAuth();
  
  /**
   * Add CSRF token to request headers
   */
  const addCSRFHeader = useCallback((headers: Record<string, string> = {}) => {
    const csrfToken = getCSRFToken();
    
    if (csrfToken) {
      return {
        ...headers,
        'X-CSRF-Token': csrfToken
      };
    }
    
    return headers;
  }, [getCSRFToken]);

  /**
   * Validate CSRF token in request
   */
  const validateCSRFToken = useCallback((token: string) => {
    const currentToken = getCSRFToken();
    return token === currentToken;
  }, [getCSRFToken]);

  return {
    addCSRFHeader,
    validateCSRFToken
  };
};

/**
 * Hook for rate limiting to prevent abuse
 */
export const useRateLimiter = () => {
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});
  const [lastRequestTime, setLastRequestTime] = useState<Record<string, number>>({});
  
  // Rate limiting configuration
  const RATE_LIMIT_WINDOW = 60000; // 1 minute
  const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute
  
  /**
   * Check if action is rate limited
   */
  const isRateLimited = useCallback((action: string) => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    // Clean old request counts
    const cleanCounts: Record<string, number> = {};
    const cleanTimes: Record<string, number> = {};
    
    for (const [key, time] of Object.entries(lastRequestTime)) {
      if (time > windowStart) {
        cleanTimes[key] = time;
        cleanCounts[key] = requestCounts[key] || 0;
      }
    }
    
    setLastRequestTime(cleanTimes);
    setRequestCounts(cleanCounts);
    
    // Update current action
    const currentCount = (cleanCounts[action] || 0) + 1;
    cleanCounts[action] = currentCount;
    cleanTimes[action] = now;
    
    setRequestCounts(cleanCounts);
    setLastRequestTime(cleanTimes);
    
    // Check if rate limited
    return currentCount > MAX_REQUESTS_PER_WINDOW;
  }, [requestCounts, lastRequestTime]);

  /**
   * Get time until rate limit resets
   */
  const getTimeUntilReset = useCallback((action: string) => {
    const lastTime = lastRequestTime[action];
    if (!lastTime) return 0;
    
    const windowEnd = lastTime + RATE_LIMIT_WINDOW;
    const now = Date.now();
    
    return Math.max(0, windowEnd - now);
  }, [lastRequestTime]);

  return {
    isRateLimited,
    getTimeUntilReset
  };
};

/**
 * Hook for secure navigation with permission checking
 */
export const useSecureNavigation = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const location = useLocation();
  
  /**
   * Navigate to route with permission check
   */
  const secureNavigate = useCallback((
    path: string, 
    requiredPermission?: string,
    fallbackPath: string = '/unauthorized'
  ) => {
    // Check permissions if required
    if (requiredPermission && !hasPermission(requiredPermission)) {
      console.warn(`Access denied to ${path}. Required permission: ${requiredPermission}`);
      navigate(fallbackPath);
      return false;
    }
    
    // Navigate to path
    navigate(path);
    return true;
  }, [navigate, hasPermission]);

  /**
   * Check if current route requires specific permission
   */
  const checkCurrentRoutePermission = useCallback((requiredPermission: string) => {
    return hasPermission(requiredPermission);
  }, [hasPermission]);

  return {
    secureNavigate,
    checkCurrentRoutePermission,
    currentPath: location.pathname
  };
};

/**
 * Hook for security logging and monitoring
 */
export const useSecurityLogger = () => {
  /**
   * Log security event
   */
  const logSecurityEvent = useCallback((
    level: 'info' | 'warn' | 'error',
    message: string,
    details?: Record<string, any>
  ) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // In a real implementation, this would send to a security logging service
    console.log(`[SECURITY] ${level.toUpperCase()}: ${message}`, details);
    
    // Store in local storage for demo purposes
    const existingLogs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
    existingLogs.push(logEntry);
    localStorage.setItem('securityLogs', JSON.stringify(existingLogs.slice(-100))); // Keep last 100 logs
  }, []);

  /**
   * Log authentication attempt
   */
  const logAuthAttempt = useCallback((
    username: string,
    success: boolean,
    ipAddress?: string
  ) => {
    logSecurityEvent(
      success ? 'info' : 'warn',
      `Authentication ${success ? 'successful' : 'failed'}`,
      {
        username: username ? mockSecurityUtils.sanitizeInput(username) : '[empty]',
        ipAddress,
        timestamp: new Date().toISOString()
      }
    );
  }, [logSecurityEvent]);

  /**
   * Log unauthorized access attempt
   */
  const logUnauthorizedAccess = useCallback((
    user: string,
    resource: string,
    ipAddress?: string
  ) => {
    logSecurityEvent(
      'warn',
      `Unauthorized access attempt`,
      {
        user: mockSecurityUtils.sanitizeInput(user),
        resource: mockSecurityUtils.sanitizeInput(resource),
        ipAddress,
        timestamp: new Date().toISOString()
      }
    );
  }, [logSecurityEvent]);

  return {
    logSecurityEvent,
    logAuthAttempt,
    logUnauthorizedAccess
  };
};