import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger.js'

/**
 * 性能指标收集器
 */
class PerformanceMetrics {
  private requestDurations: number[] = []
  private slowRequests: Array<{
    method: string
    path: string
    duration: number
    timestamp: Date
  }> = []
  private requestCounts: Map<string, number> = new Map()
  private errorCounts: Map<string, number> = new Map()
  private slowQueryThreshold = 100 // 慢查询阈值（毫秒）
  private maxMetricsSize = 1000 // 最多保留的指标数量

  /**
   * 记录请求时长
   */
  recordRequestDuration(req: Request, duration: number): void {
    // 保留最近N个请求时长
    this.requestDurations.push(duration)
    if (this.requestDurations.length > this.maxMetricsSize) {
      this.requestDurations.shift()
    }

    // 记录慢请求
    if (duration > this.slowQueryThreshold) {
      this.slowRequests.push({
        method: req.method,
        path: req.path,
        duration,
        timestamp: new Date(),
      })

      // 限制慢请求列表大小
      if (this.slowRequests.length > 100) {
        this.slowRequests.shift()
      }

      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        threshold: `${this.slowQueryThreshold}ms`,
      })
    }

    // 记录请求计数
    const routeKey = `${req.method} ${req.path}`
    this.requestCounts.set(routeKey, (this.requestCounts.get(routeKey) || 0) + 1)
  }

  /**
   * 记录错误
   */
  recordError(route: string): void {
    this.errorCounts.set(route, (this.errorCounts.get(route) || 0) + 1)
  }

  /**
   * 获取平均响应时间
   */
  getAverageResponseTime(): number {
    if (this.requestDurations.length === 0) return 0
    const sum = this.requestDurations.reduce((a, b) => a + b, 0)
    return Math.round(sum / this.requestDurations.length)
  }

  /**
   * 获取P95响应时间
   */
  getP95ResponseTime(): number {
    if (this.requestDurations.length === 0) return 0
    const sorted = [...this.requestDurations].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * 0.95)
    return sorted[index] || 0
  }

  /**
   * 获取P99响应时间
   */
  getP99ResponseTime(): number {
    if (this.requestDurations.length === 0) return 0
    const sorted = [...this.requestDurations].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * 0.99)
    return sorted[index] || 0
  }

  /**
   * 获取最小响应时间
   */
  getMinResponseTime(): number {
    if (this.requestDurations.length === 0) return 0
    return Math.min(...this.requestDurations)
  }

  /**
   * 获取最大响应时间
   */
  getMaxResponseTime(): number {
    if (this.requestDurations.length === 0) return 0
    return Math.max(...this.requestDurations)
  }

  /**
   * 获取所有性能指标
   */
  getMetrics() {
    // 计算请求数最多的路由
    const topRoutes = Array.from(this.requestCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([route, count]) => ({ route, count }))

    // 计算错误数最多的路由
    const topErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([route, count]) => ({ route, count }))

    return {
      responseTime: {
        avg: this.getAverageResponseTime(),
        min: this.getMinResponseTime(),
        max: this.getMaxResponseTime(),
        p95: this.getP95ResponseTime(),
        p99: this.getP99ResponseTime(),
      },
      requests: {
        total: this.requestDurations.length,
        topRoutes,
      },
      slowRequests: {
        count: this.slowRequests.length,
        threshold: this.slowQueryThreshold,
        recent: this.slowRequests.slice(-10),
      },
      errors: {
        total: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
        topErrors,
      },
    }
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.requestDurations = []
    this.slowRequests = []
    this.requestCounts.clear()
    this.errorCounts.clear()
  }

  /**
   * 设置慢查询阈值
   */
  setSlowQueryThreshold(ms: number): void {
    this.slowQueryThreshold = ms
  }
}

// 创建全局性能指标实例
export const performanceMetrics = new PerformanceMetrics()

/**
 * 性能监控中间件
 */
export function performanceMonitor(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now()

  // 在响应结束时记录性能指标
  res.on('finish', () => {
    const duration = Date.now() - startTime
    performanceMetrics.recordRequestDuration(req, duration)

    // 如果是错误响应，记录错误
    if (res.statusCode >= 400) {
      const routeKey = `${req.method} ${req.path}`
      performanceMetrics.recordError(routeKey)
    }
  })

  next()
}

/**
 * 数据库查询性能监控
 */
class DatabaseMetrics {
  private queries: Array<{
    query: string
    duration: number
    timestamp: Date
  }> = []
  private slowQueries: Array<{
    query: string
    duration: number
    timestamp: Date
  }> = []
  private slowQueryThreshold = 50 // 慢查询阈值（毫秒）
  private maxQueriesSize = 1000

  /**
   * 记录数据库查询
   */
  recordQuery(query: string, duration: number): void {
    const queryRecord = {
      query,
      duration,
      timestamp: new Date(),
    }

    this.queries.push(queryRecord)
    if (this.queries.length > this.maxQueriesSize) {
      this.queries.shift()
    }

    // 记录慢查询
    if (duration > this.slowQueryThreshold) {
      this.slowQueries.push(queryRecord)
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift()
      }

      logger.warn('Slow database query detected', {
        query: query.substring(0, 100), // 只记录前100个字符
        duration: `${duration}ms`,
        threshold: `${this.slowQueryThreshold}ms`,
      })
    }
  }

  /**
   * 获取数据库性能指标
   */
  getMetrics() {
    if (this.queries.length === 0) {
      return {
        totalQueries: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        slowQueries: {
          count: 0,
          threshold: this.slowQueryThreshold,
          recent: [],
        },
      }
    }

    const durations = this.queries.map(q => q.duration)
    const sum = durations.reduce((a, b) => a + b, 0)

    return {
      totalQueries: this.queries.length,
      avgDuration: Math.round(sum / durations.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      slowQueries: {
        count: this.slowQueries.length,
        threshold: this.slowQueryThreshold,
        recent: this.slowQueries.slice(-10).map(q => ({
          query: q.query.substring(0, 100),
          duration: q.duration,
          timestamp: q.timestamp,
        })),
      },
    }
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.queries = []
    this.slowQueries = []
  }

  /**
   * 设置慢查询阈值
   */
  setSlowQueryThreshold(ms: number): void {
    this.slowQueryThreshold = ms
  }
}

// 创建全局数据库指标实例
export const databaseMetrics = new DatabaseMetrics()

/**
 * 内存使用监控
 */
export function getMemoryMetrics() {
  const usage = process.memoryUsage()
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024), // MB
  }
}

/**
 * CPU使用监控
 */
export function getCpuMetrics() {
  const usage = process.cpuUsage()
  return {
    user: Math.round(usage.user / 1000), // 毫秒
    system: Math.round(usage.system / 1000), // 毫秒
  }
}

/**
 * 系统指标
 */
export function getSystemMetrics() {
  return {
    uptime: Math.round(process.uptime()), // 秒
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
  }
}
