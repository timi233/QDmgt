import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import prisma from './utils/prisma.js'
import logger from './utils/logger.js'
import { requestLogger } from './middlewares/auditLogger.js'
import { performanceMonitor } from './middlewares/performanceMonitor.js'
import { registerRoutes } from './routes/index.js'

const app: Express = express()

// Security middleware - Enhanced helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}))

// CORS configuration - Stricter for production
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:4002', 'http://localhost:5173'],
  credentials: true,
}))

// Request parsing with size limits
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Cookie parsing
app.use(cookieParser())

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// Request and audit logging
app.use(requestLogger)

// Performance monitoring
app.use(performanceMonitor)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
})
app.use('/api', limiter)

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Database health check endpoint
app.get('/health/db', async (_req: Request, res: Response) => {
  try {
    // 执行简单查询测试数据库连接
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - startTime

    res.status(200).json({
      status: 'ok',
      database: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('数据库健康检查失败:', error)
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString(),
    })
  }
})

// API routes
app.get('/api/v1', (_req: Request, res: Response) => {
  const response: Record<string, any> = {
    message: '渠道管理系统 API',
    version: '1.0.0',
  }

  // Only expose environment info in development
  if (process.env.NODE_ENV !== 'production') {
    response.environment = process.env.NODE_ENV || 'development'
  }

  res.json(response)
})

// Register API routes
registerRoutes(app)

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  })
})

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: _req.url,
    method: _req.method,
  })

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  })
})

export default app
