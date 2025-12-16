#!/usr/bin/env node

/**
 * 数据库备份命令行工具
 *
 * 用法:
 *   npm run backup:create [描述]
 *   npm run backup:list
 *   npm run backup:restore <文件名>
 *   npm run backup:verify <文件名>
 */

import { createBackup, listBackups, restoreBackup, verifyBackup, getDatabaseStats } from '../services/backupService.js'

const command = process.argv[2]
const args = process.argv.slice(3)

async function main() {
  try {
    switch (command) {
      case 'create': {
        const description = args.join(' ') || 'Manual backup via CLI'
        console.log('Creating backup...')
        const backupPath = await createBackup(description)
        console.log('✓ Backup created successfully')
        console.log(`  Path: ${backupPath}`)
        console.log(`  Description: ${description}`)
        break
      }

      case 'list': {
        console.log('Listing backups...\n')
        const backups = await listBackups()

        if (backups.length === 0) {
          console.log('No backups found.')
          break
        }

        console.log(`Found ${backups.length} backup(s):\n`)
        backups.forEach((backup, index) => {
          console.log(`${index + 1}. ${backup.filename}`)
          console.log(`   Created: ${new Date(backup.createdAt).toLocaleString()}`)
          console.log(`   Size: ${formatBytes(backup.size)}`)
          console.log(`   Description: ${backup.description}`)
          console.log()
        })
        break
      }

      case 'restore': {
        const filename = args[0]
        if (!filename) {
          console.error('Error: Please provide backup filename')
          console.error('Usage: npm run backup:restore <filename>')
          process.exit(1)
        }

        console.log(`Restoring from backup: ${filename}`)
        console.log('⚠️  This will replace the current database!')
        console.log('Creating safety backup first...')

        await restoreBackup(filename, true)

        console.log('✓ Database restored successfully')
        break
      }

      case 'verify': {
        const filename = args[0]
        if (!filename) {
          console.error('Error: Please provide backup filename')
          console.error('Usage: npm run backup:verify <filename>')
          process.exit(1)
        }

        console.log(`Verifying backup: ${filename}`)
        const result = await verifyBackup(filename)

        console.log()
        console.log('Verification result:')
        console.log(`  Valid: ${result.valid ? '✓ Yes' : '✗ No'}`)
        console.log(`  Size: ${formatBytes(result.size)}`)
        console.log(`  Readable: ${result.readable ? '✓ Yes' : '✗ No'}`)

        if (result.error) {
          console.log(`  Error: ${result.error}`)
        }

        if (!result.valid) {
          process.exit(1)
        }
        break
      }

      case 'stats': {
        console.log('Database statistics:\n')
        const stats = await getDatabaseStats()

        console.log(`Database size: ${formatBytes(stats.size)}`)
        console.log(`Total tables: ${stats.tables}`)
        console.log('\nRecords:')
        Object.entries(stats.records).forEach(([table, count]) => {
          console.log(`  ${table}: ${count}`)
        })
        break
      }

      default:
        console.log('Database Backup Tool\n')
        console.log('Available commands:')
        console.log('  create [description]  - Create a new backup')
        console.log('  list                  - List all backups')
        console.log('  restore <filename>    - Restore from backup')
        console.log('  verify <filename>     - Verify backup integrity')
        console.log('  stats                 - Show database statistics')
        console.log('\nExamples:')
        console.log('  npm run backup:create "Before major update"')
        console.log('  npm run backup:list')
        console.log('  npm run backup:restore backup_2025-12-03_14-30-00.db')
        console.log('  npm run backup:verify backup_2025-12-03_14-30-00.db')
        console.log('  npm run backup:stats')

        if (command) {
          console.error(`\nError: Unknown command '${command}'`)
          process.exit(1)
        }
    }
  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

main()
