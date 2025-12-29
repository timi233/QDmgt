import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { register, login, logout, refreshAccessToken, changePassword, feishuLogin, syncFeishuOrganization } from '../controllers/authController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'

const router = Router()

// Stricter rate limit for authentication endpoints to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: '登录尝试次数过多，请15分钟后重试',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: { xForwardedForHeader: false },
})

// More relaxed rate limit for OAuth callbacks (Feishu login)
const oauthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Increased to handle React StrictMode double-mounting
  skipSuccessfulRequests: true,
  message: '请求过于频繁，请稍后重试',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
})

/**
 * POST /api/auth/register
 * Register a new user
 * Rate limited: 5 attempts per 15 minutes per IP
 */
router.post('/register', authLimiter, register)

/**
 * POST /api/auth/login
 * Login user and get JWT token
 * Rate limited: 5 attempts per 15 minutes per IP
 */
router.post('/login', authLimiter, login)

/**
 * POST /api/auth/logout
 * Logout user (requires authentication)
 */
router.post('/logout', authenticateToken, logout)

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * Rate limited: 10 attempts per 15 minutes per IP
 */
router.post('/refresh', refreshAccessToken)

/**
 * POST /api/auth/change-password
 * Change password (requires authentication)
 */
router.post('/change-password', authenticateToken, changePassword)

/**
 * POST /api/auth/feishu/login
 * Feishu OAuth login
 */
router.post('/feishu/login', oauthLimiter, feishuLogin)

/**
 * POST /api/auth/feishu/sync
 * Sync organization from Feishu (requires admin)
 */
router.post('/feishu/sync', authenticateToken, syncFeishuOrganization)

export default router
