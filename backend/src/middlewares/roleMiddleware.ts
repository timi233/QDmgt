import { Request, Response, NextFunction } from 'express'

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required role
 * @param requiredRole - The role required to access the route ('sales' or 'leader')
 */
export function requireRole(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // User info should be attached by authenticateToken middleware
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // Admin has access to all routes
    if (req.user.role === 'admin') {
      return next()
    }

    // Check if user has the required role
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required role: ${requiredRole}`,
      })
    }

    return next()
  }
}

/**
 * Check if user has any of the allowed roles
 * @param allowedRoles - Array of allowed roles
 */
export function requireAnyRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      })
    }

    // Admin has access to all routes
    if (req.user.role === 'admin') {
      return next()
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Allowed roles: ${allowedRoles.join(', ')}`,
      })
    }

    return next()
  }
}
