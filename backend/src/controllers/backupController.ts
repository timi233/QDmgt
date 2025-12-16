import { Request, Response } from 'express'
import {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
  verifyBackup,
  getDatabaseStats,
} from '../services/backupService.js'
import logger from '../utils/logger.js'

/**
 * 创建数据库备份
 * POST /api/backup/create
 */
export async function create(req: Request, res: Response) {
  try {
    const { description } = req.body
    const userId = (req as any).user?.userId

    logger.info('Creating backup', { userId, description })

    const backupPath = await createBackup(description)

    return res.status(201).json({
      message: 'Backup created successfully',
      backupPath,
    })
  } catch (error) {
    logger.error('Backup creation failed', { error })
    return res.status(500).json({
      error: 'Failed to create backup',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 列出所有备份
 * GET /api/backup/list
 */
export async function list(_req: Request, res: Response) {
  try {
    const backups = await listBackups()

    return res.status(200).json({
      backups,
      total: backups.length,
    })
  } catch (error) {
    logger.error('Failed to list backups', { error })
    return res.status(500).json({
      error: 'Failed to list backups',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 恢复数据库从备份
 * POST /api/backup/restore
 */
export async function restore(req: Request, res: Response) {
  try {
    const { backupFilename, createSafetyBackup = true } = req.body
    const userId = (req as any).user?.userId

    if (!backupFilename) {
      return res.status(400).json({
        error: 'Backup filename is required',
      })
    }

    logger.warn('Restoring database from backup', {
      userId,
      backupFilename,
      createSafetyBackup,
    })

    await restoreBackup(backupFilename, createSafetyBackup)

    return res.status(200).json({
      message: 'Database restored successfully',
      backupFilename,
    })
  } catch (error) {
    logger.error('Database restore failed', { error })
    return res.status(500).json({
      error: 'Failed to restore database',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 删除备份
 * DELETE /api/backup/:filename
 */
export async function remove(req: Request, res: Response) {
  try {
    const { filename } = req.params
    const userId = (req as any).user?.userId

    logger.info('Deleting backup', { userId, filename })

    await deleteBackup(filename)

    return res.status(200).json({
      message: 'Backup deleted successfully',
      filename,
    })
  } catch (error) {
    logger.error('Backup deletion failed', { error })
    return res.status(500).json({
      error: 'Failed to delete backup',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 验证备份完整性
 * GET /api/backup/verify/:filename
 */
export async function verify(req: Request, res: Response) {
  try {
    const { filename } = req.params

    const result = await verifyBackup(filename)

    return res.status(200).json({
      filename,
      ...result,
    })
  } catch (error) {
    logger.error('Backup verification failed', { error })
    return res.status(500).json({
      error: 'Failed to verify backup',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 获取数据库统计信息
 * GET /api/backup/stats
 */
export async function stats(_req: Request, res: Response) {
  try {
    const dbStats = await getDatabaseStats()

    return res.status(200).json(dbStats)
  } catch (error) {
    logger.error('Failed to get database stats', { error })
    return res.status(500).json({
      error: 'Failed to get database stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
