import { PrismaClient } from '@prisma/client'
import { databaseMetrics } from '../middlewares/performanceMonitor.js'

// 配置Prisma日志和事件监听
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
})

// 记录所有查询性能到性能监控系统
prisma.$on('query', (e) => {
  databaseMetrics.recordQuery(e.query, e.duration)
})

// 在开发环境记录慢查询（超过100ms）
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 100) {
      console.warn(`🐌 慢查询检测 (${e.duration}ms):`, {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      })
    }
  })
}

// 记录所有查询（仅在需要调试时启用）
if (process.env.LOG_ALL_QUERIES === 'true') {
  prisma.$on('query', (e) => {
    console.log(`📊 查询: ${e.query}`)
    console.log(`⏱️  耗时: ${e.duration}ms`)
  })
}

// 优雅关闭处理
async function gracefulShutdown(signal: string) {
  console.log(`\n收到${signal}信号，正在优雅关闭数据库连接...`)

  try {
    await prisma.$disconnect()
    console.log('✅ 数据库连接已关闭')
    process.exit(0)
  } catch (error) {
    console.error('❌ 关闭数据库连接时出错:', error)
    process.exit(1)
  }
}

// 监听进程退出信号
process.on('SIGINT', () => gracefulShutdown('SIGINT'))   // Ctrl+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')) // kill命令
process.on('beforeExit', () => gracefulShutdown('beforeExit'))

// 处理未捕获的异常
process.on('uncaughtException', async (error) => {
  console.error('❌ 未捕获的异常:', error)
  await prisma.$disconnect()
  process.exit(1)
})

process.on('unhandledRejection', async (reason, _promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason)
  await prisma.$disconnect()
  process.exit(1)
})

export default prisma
