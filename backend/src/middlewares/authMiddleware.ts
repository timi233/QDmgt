import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../services/authService.js'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 * Extracts token from cookie (preferred) or Authorization header (fallback)
 * Attaches user info to req.user for downstream handlers
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from cookie first (preferred for security)
    let token = req.cookies?.token

    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers.authorization
      token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"
    }

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is missing',
      })
    }

    // Verify token
    const decoded = verifyToken(token)

    // Attach user info to request
    req.user = decoded

    return next()
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Token has expired',
        })
      }
      if (error.message === 'Invalid token') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid token',
        })
      }
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Token verification failed',
    })
  }
}
