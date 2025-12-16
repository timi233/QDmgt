import cron from 'node-cron'
import { checkOverdueTasks, autoArchiveCompletedTasks } from '../services/taskService.js'
import { aggregateDashboardData } from '../services/aggregationService.js'
import { autoBackup } from '../services/backupService.js'

/**
 * Schedule jobs for task management and data aggregation
 */
export function startScheduledJobs() {
  // Aggregate dashboard data every minute
  cron.schedule('* * * * *', async () => {
    try {
      console.log('[Scheduler] Aggregating dashboard data...')
      await aggregateDashboardData()
      console.log('[Scheduler] Dashboard data aggregation completed')
    } catch (error) {
      console.error('[Scheduler] Error aggregating dashboard data:', error)
    }
  })

  // Check for overdue tasks every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[Scheduler] Checking for overdue tasks...')
      const result = await checkOverdueTasks()
      console.log(`[Scheduler] Marked ${result.count} tasks as overdue`)
    } catch (error) {
      console.error('[Scheduler] Error checking overdue tasks:', error)
    }
  })

  // Auto-archive completed tasks every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[Scheduler] Auto-archiving completed tasks...')
      const result = await autoArchiveCompletedTasks()
      console.log(`[Scheduler] Archived ${result.count} completed tasks`)
    } catch (error) {
      console.error('[Scheduler] Error auto-archiving tasks:', error)
    }
  })

  // Auto-backup database every day at 3 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('[Scheduler] Starting automatic database backup...')
      const backupPath = await autoBackup()
      console.log(`[Scheduler] Backup created successfully: ${backupPath}`)
    } catch (error) {
      console.error('[Scheduler] Error creating automatic backup:', error)
    }
  })

  // Initial aggregation on startup
  aggregateDashboardData().catch((error) => {
    console.error('[Scheduler] Error during initial aggregation:', error)
  })

  console.log('[Scheduler] Scheduled jobs started')
  console.log('[Scheduler] - Data aggregation: Every minute')
  console.log('[Scheduler] - Overdue check: Every hour')
  console.log('[Scheduler] - Auto-archive: Daily at 2 AM')
  console.log('[Scheduler] - Auto-backup: Daily at 3 AM')
}
