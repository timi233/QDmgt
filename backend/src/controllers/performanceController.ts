import { Request, Response } from 'express'
import {
  performanceMetrics,
  databaseMetrics,
  getMemoryMetrics,
  getCpuMetrics,
  getSystemMetrics,
} from '../middlewares/performanceMonitor.js'

/**
 * 获取所有性能指标
 * GET /api/performance/metrics
 */
export async function getMetrics(_req: Request, res: Response) {
  try {
    const metrics = {
      http: performanceMetrics.getMetrics(),
      database: databaseMetrics.getMetrics(),
      memory: getMemoryMetrics(),
      cpu: getCpuMetrics(),
      system: getSystemMetrics(),
      timestamp: new Date().toISOString(),
    }

    return res.status(200).json(metrics)
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to get performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 获取HTTP性能指标
 * GET /api/performance/http
 */
export async function getHttpMetrics(_req: Request, res: Response) {
  try {
    const metrics = performanceMetrics.getMetrics()
    return res.status(200).json(metrics)
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to get HTTP metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 获取数据库性能指标
 * GET /api/performance/database
 */
export async function getDatabaseMetrics(_req: Request, res: Response) {
  try {
    const metrics = databaseMetrics.getMetrics()
    return res.status(200).json(metrics)
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to get database metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 获取系统资源使用情况
 * GET /api/performance/system
 */
export async function getSystemInfo(_req: Request, res: Response) {
  try {
    const info = {
      memory: getMemoryMetrics(),
      cpu: getCpuMetrics(),
      system: getSystemMetrics(),
      timestamp: new Date().toISOString(),
    }

    return res.status(200).json(info)
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to get system info',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 重置性能指标
 * POST /api/performance/reset
 */
export async function resetMetrics(_req: Request, res: Response) {
  try {
    performanceMetrics.reset()
    databaseMetrics.reset()

    return res.status(200).json({
      message: 'Performance metrics reset successfully',
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to reset metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
