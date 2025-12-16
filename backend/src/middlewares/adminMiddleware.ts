import { Request, Response, NextFunction } from 'express'

/**
 * Admin authorization middleware
 * Checks if authenticated user has admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: '需要管理员权限',
    })
  }

  return next()
}
