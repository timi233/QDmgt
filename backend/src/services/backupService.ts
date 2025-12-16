import fs from 'fs/promises'
import path from 'path'
import prisma from '../utils/prisma.js'
import logger from '../utils/logger.js'

// 备份配置
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db')
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS || '30', 10) // 保留最近30个备份

/**
 * 验证并解析备份文件路径，防止路径遍历攻击
 * @param filename - 备份文件名
 * @returns 安全的完整路径
 * @throws 如果文件名包含路径遍历字符
 */
function resolveBackupPath(filename: string): string {
  const safeName = path.basename(filename)
  if (safeName !== filename) {
    throw new Error('Invalid backup filename: path traversal detected')
  }
  return path.join(BACKUP_DIR, safeName)
}

/**
 * 确保备份目录存在
 */
async function ensureBackupDir(): Promise<void> {
  try {
    await fs.access(BACKUP_DIR)
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true })
    logger.info('Backup directory created', { path: BACKUP_DIR })
  }
}

/**
 * 生成备份文件名
 * 格式: backup_YYYY-MM-DD_HH-mm-ss.db
 */
function generateBackupFilename(): string {
  const now = new Date()
  const timestamp = now.toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_')
  return `backup_${timestamp}.db`
}

/**
 * 创建数据库备份
 * @param description - 备份描述（可选）
 * @returns 备份文件路径
 */
export async function createBackup(description?: string): Promise<string> {
  try {
    await ensureBackupDir()

    // 检查数据库文件是否存在
    try {
      await fs.access(DB_PATH)
    } catch {
      throw new Error(`Database file not found: ${DB_PATH}`)
    }

    // 生成备份文件名
    const backupFilename = generateBackupFilename()
    const backupPath = path.join(BACKUP_DIR, backupFilename)

    // 复制数据库文件
    await fs.copyFile(DB_PATH, backupPath)

    // 验证备份文件
    const stats = await fs.stat(backupPath)
    if (stats.size === 0) {
      throw new Error('Backup file is empty')
    }

    // 创建备份元数据
    const metadata = {
      filename: backupFilename,
      path: backupPath,
      size: stats.size,
      createdAt: new Date().toISOString(),
      description: description || 'Manual backup',
      databasePath: DB_PATH,
    }

    // 保存元数据
    const metadataPath = `${backupPath}.json`
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))

    logger.info('Database backup created successfully', {
      backupPath,
      size: stats.size,
      description,
    })

    // 清理旧备份
    await cleanOldBackups()

    return backupPath
  } catch (error) {
    logger.error('Failed to create backup', { error })
    throw error
  }
}

/**
 * 列出所有备份
 * @returns 备份文件列表及其元数据
 */
export async function listBackups(): Promise<Array<{
  filename: string
  path: string
  size: number
  createdAt: string
  description: string
}>> {
  try {
    await ensureBackupDir()

    const files = await fs.readdir(BACKUP_DIR)
    const backupFiles = files.filter(file => file.endsWith('.db'))

    const backups = await Promise.all(
      backupFiles.map(async (filename) => {
        const backupPath = path.join(BACKUP_DIR, filename)
        const metadataPath = `${backupPath}.json`

        try {
          // 尝试读取元数据
          const metadataContent = await fs.readFile(metadataPath, 'utf-8')
          return JSON.parse(metadataContent)
        } catch {
          // 如果没有元数据，创建基本信息
          const stats = await fs.stat(backupPath)
          return {
            filename,
            path: backupPath,
            size: stats.size,
            createdAt: stats.mtime.toISOString(),
            description: 'No description',
          }
        }
      })
    )

    // 按创建时间倒序排序
    return backups.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch (error) {
    logger.error('Failed to list backups', { error })
    throw error
  }
}

/**
 * 恢复数据库从备份
 * @param backupFilename - 备份文件名
 * @param createBackupBeforeRestore - 恢复前是否创建当前数据库备份
 */
export async function restoreBackup(
  backupFilename: string,
  createBackupBeforeRestore: boolean = true
): Promise<void> {
  try {
    const backupPath = resolveBackupPath(backupFilename)

    // 验证备份文件存在
    try {
      await fs.access(backupPath)
    } catch {
      throw new Error(`Backup file not found: ${backupFilename}`)
    }

    // 在恢复前创建当前数据库备份
    if (createBackupBeforeRestore) {
      logger.info('Creating safety backup before restore')
      await createBackup('Safety backup before restore')
    }

    // 断开Prisma连接
    await prisma.$disconnect()

    // 等待一小段时间确保连接完全关闭
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 恢复数据库
    await fs.copyFile(backupPath, DB_PATH)

    logger.info('Database restored successfully', {
      backupFilename,
      restoredTo: DB_PATH,
    })

    // 重新连接Prisma
    await prisma.$connect()

    logger.info('Database connection re-established')
  } catch (error) {
    logger.error('Failed to restore backup', { error, backupFilename })
    throw error
  }
}

/**
 * 删除指定备份
 * @param backupFilename - 备份文件名
 */
export async function deleteBackup(backupFilename: string): Promise<void> {
  try {
    const backupPath = resolveBackupPath(backupFilename)
    const metadataPath = `${backupPath}.json`

    // 删除备份文件
    await fs.unlink(backupPath)

    // 删除元数据文件（如果存在）
    try {
      await fs.unlink(metadataPath)
    } catch {
      // 元数据文件可能不存在，忽略错误
    }

    logger.info('Backup deleted', { backupFilename })
  } catch (error) {
    logger.error('Failed to delete backup', { error, backupFilename })
    throw error
  }
}

/**
 * 清理旧备份，只保留最近N个
 */
async function cleanOldBackups(): Promise<void> {
  try {
    const backups = await listBackups()

    if (backups.length > MAX_BACKUPS) {
      const backupsToDelete = backups.slice(MAX_BACKUPS)

      for (const backup of backupsToDelete) {
        await deleteBackup(backup.filename)
      }

      logger.info('Old backups cleaned', {
        deleted: backupsToDelete.length,
        kept: MAX_BACKUPS,
      })
    }
  } catch (error) {
    logger.error('Failed to clean old backups', { error })
    // 不抛出错误，清理失败不应影响备份创建
  }
}

/**
 * 验证备份完整性
 * @param backupFilename - 备份文件名
 * @returns 验证结果
 */
export async function verifyBackup(backupFilename: string): Promise<{
  valid: boolean
  size: number
  readable: boolean
  error?: string
}> {
  try {
    const backupPath = resolveBackupPath(backupFilename)

    // 检查文件是否存在
    const stats = await fs.stat(backupPath)

    // 检查文件大小
    if (stats.size === 0) {
      return {
        valid: false,
        size: 0,
        readable: false,
        error: 'Backup file is empty',
      }
    }

    // 尝试读取文件头以验证SQLite格式
    const fileHandle = await fs.open(backupPath, 'r')
    const buffer = Buffer.alloc(16)
    await fileHandle.read(buffer, 0, 16, 0)
    await fileHandle.close()

    // SQLite文件头应该是 "SQLite format 3\0"
    const header = buffer.toString('utf-8', 0, 15)
    const isSQLite = header.startsWith('SQLite format 3')

    return {
      valid: isSQLite,
      size: stats.size,
      readable: true,
      error: isSQLite ? undefined : 'Invalid SQLite file format',
    }
  } catch (error) {
    return {
      valid: false,
      size: 0,
      readable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<{
  size: number
  tables: number
  records: Record<string, number>
}> {
  try {
    // 获取数据库文件大小
    const stats = await fs.stat(DB_PATH)

    // 获取各表记录数
    const [
      users,
      distributors,
      tasks,
      events,
      channelTargets,
      workPlans,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.distributor.count(),
      prisma.task.count(),
      prisma.event.count(),
      prisma.channelTarget.count(),
      prisma.workPlan.count(),
    ])

    return {
      size: stats.size,
      tables: 6,
      records: {
        users,
        distributors,
        tasks,
        events,
        channelTargets,
        workPlans,
      },
    }
  } catch (error) {
    logger.error('Failed to get database stats', { error })
    throw error
  }
}

/**
 * 自动备份（定时任务）
 * 建议使用cron或其他调度器调用此函数
 */
export async function autoBackup(): Promise<string> {
  logger.info('Starting automatic backup')
  return createBackup('Automatic backup')
}
