import { Express } from 'express'
import authRoutes from './authRoutes.js'
import adminRoutes from './adminRoutes.js'
import distributorRoutes from './distributorRoutes.js'
import taskRoutes from './taskRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'
import dataRoutes from './dataRoutes.js'
import targetRoutes from './targetRoutes.js'
import workPlanRoutes from './workPlanRoutes.js'
import backupRoutes from './backupRoutes.js'
import performanceRoutes from './performanceRoutes.js'
import visitRoutes from './visit.routes.js'
import healthScoreRoutes from './healthScore.routes.js'
import trainingRoutes from './training.routes.js'
import resourceRoutes from './resource.routes.js'
import ticketRoutes from './ticket.routes.js'
import certificationRoutes from './certification.routes.js'

/**
 * Register all API routes
 */
export function registerRoutes(app: Express) {
  // Auth routes
  app.use('/api/v1/auth', authRoutes)

  // Admin routes
  app.use('/api/v1/admin', adminRoutes)

  // Distributor routes
  app.use('/api/v1/distributors', distributorRoutes)

  // Task routes
  app.use('/api/v1/tasks', taskRoutes)

  // Dashboard routes
  app.use('/api/v1/dashboard', dashboardRoutes)

  // Data routes
  app.use('/api/v1/data', dataRoutes)

  // Target routes
  app.use('/api/v1/targets', targetRoutes)

  // Work plan routes
  app.use('/api/v1/work-plans', workPlanRoutes)

  // Backup routes
  app.use('/api/v1/backup', backupRoutes)

  // Performance routes
  app.use('/api/v1/performance', performanceRoutes)

  // Visit routes
  app.use('/api/v1/visits', visitRoutes)

  // Health score routes
  app.use('/api/v1/health-scores', healthScoreRoutes)

  // P1 Features - Training routes
  app.use('/api/v1/trainings', trainingRoutes)

  // P1 Features - Resource Library routes
  app.use('/api/v1/resources', resourceRoutes)

  // P1 Features - Support Ticket routes
  app.use('/api/v1/tickets', ticketRoutes)

  // P1 Features - Certification routes
  app.use('/api/v1/certifications', certificationRoutes)
}

export {
  authRoutes,
  adminRoutes,
  distributorRoutes,
  taskRoutes,
  dashboardRoutes,
  dataRoutes,
  targetRoutes,
  workPlanRoutes,
  backupRoutes,
  performanceRoutes,
  visitRoutes,
  healthScoreRoutes,
  trainingRoutes,
  resourceRoutes,
  ticketRoutes,
  certificationRoutes,
}
