import dotenv from 'dotenv'
import app from './app.js'
import { startScheduledJobs } from './utils/scheduler.js'

// Load environment variables
dotenv.config()

const PORT: number = Number(process.env.PORT) || 4000
const HOST = '0.0.0.0'

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`
    ========================================
    Server is running!
    Environment: ${process.env.NODE_ENV || 'development'}
    Host: ${HOST}
    Port: ${PORT}
    Health: http://${HOST}:${PORT}/health
    API: http://${HOST}:${PORT}/api/v1
    ========================================
  `)

  // Start scheduled jobs
  startScheduledJobs()
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server')
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

export default server
