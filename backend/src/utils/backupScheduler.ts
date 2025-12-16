import { autoBackup } from '../services/backupService.js'
import logger from '../utils/logger.js'

/**
 * 自动备份调度器
 *
 * 配置:
 *   BACKUP_SCHEDULE - 备份间隔（小时），默认24小时
 *   AUTO_BACKUP_ENABLED - 是否启用自动备份，默认true
 */

const BACKUP_INTERVAL_HOURS = parseInt(process.env.BACKUP_SCHEDULE || '24', 10)
const AUTO_BACKUP_ENABLED = process.env.AUTO_BACKUP_ENABLED !== 'false'

let intervalId: NodeJS.Timeout | null = null

/**
 * 启动自动备份调度
 */
export function startBackupScheduler(): void {
  if (!AUTO_BACKUP_ENABLED) {
    logger.info('Auto backup is disabled')
    return
  }

  // 启动时立即创建一个备份
  logger.info('Starting backup scheduler', {
    intervalHours: BACKUP_INTERVAL_HOURS,
  })

  // 延迟1分钟后创建首个备份，避免启动时的负载
  setTimeout(async () => {
    try {
      await autoBackup()
      logger.info('Initial backup completed')
    } catch (error) {
      logger.error('Initial backup failed', { error })
    }
  }, 60 * 1000)

  // 设置定时备份
  const intervalMs = BACKUP_INTERVAL_HOURS * 60 * 60 * 1000
  intervalId = setInterval(async () => {
    try {
      logger.info('Starting scheduled backup')
      await autoBackup()
      logger.info('Scheduled backup completed')
    } catch (error) {
      logger.error('Scheduled backup failed', { error })
    }
  }, intervalMs)

  logger.info('Backup scheduler started successfully', {
    nextBackupIn: `${BACKUP_INTERVAL_HOURS} hours`,
  })
}

/**
 * 停止自动备份调度
 */
export function stopBackupScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    logger.info('Backup scheduler stopped')
  }
}

/**
 * 优雅关闭时清理
 */
process.on('SIGINT', () => {
  stopBackupScheduler()
  process.exit(0)
})

process.on('SIGTERM', () => {
  stopBackupScheduler()
  process.exit(0)
})
