import prisma from '../utils/prisma.js'

/**
 * Event types for audit logging
 */
export enum EventType {
  // User events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  USER_PASSWORD_CHANGE = 'user_password_change',

  // Distributor events
  DISTRIBUTOR_CREATED = 'distributor_created',
  DISTRIBUTOR_UPDATED = 'distributor_updated',
  DISTRIBUTOR_DELETED = 'distributor_deleted',
  DISTRIBUTOR_IMPORTED = 'distributor_imported',
  DISTRIBUTOR_EXPORTED = 'distributor_exported',

  // Task events
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  TASK_STATUS_CHANGED = 'task_status_changed',
  TASK_ASSIGNED = 'task_assigned',
  TASK_TRANSFERRED = 'task_transferred',
  TASK_OVERDUE = 'task_overdue',
  TASK_ARCHIVED = 'task_archived',

  // Collaboration events
  COLLABORATOR_ADDED = 'collaborator_added',
  COLLABORATOR_REMOVED = 'collaborator_removed',
  COMMENT_ADDED = 'comment_added',

  // System events
  DATA_AGGREGATION = 'data_aggregation',
  SYSTEM_ERROR = 'system_error',
}

/**
 * Entity types for event tracking
 */
export enum EntityType {
  USER = 'user',
  DISTRIBUTOR = 'distributor',
  TASK = 'task',
  SYSTEM = 'system',
}

/**
 * Event input for creating audit log
 */
export interface CreateEventInput {
  eventType: EventType | string
  entityType: EntityType | string
  entityId: string
  userId: string
  payload?: Record<string, any>
}

/**
 * Event query options
 */
export interface EventQueryOptions {
  eventType?: string
  entityType?: string
  entityId?: string
  userId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

/**
 * Create an audit event
 */
export async function createEvent(input: CreateEventInput) {
  const event = await prisma.event.create({
    data: {
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId,
      payload: JSON.stringify(input.payload || {}),
    },
  })

  return event
}

/**
 * Batch create events (for bulk operations)
 */
export async function createEvents(inputs: CreateEventInput[]) {
  const events = await prisma.event.createMany({
    data: inputs.map((input) => ({
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId,
      payload: JSON.stringify(input.payload || {}),
    })),
  })

  return events
}

/**
 * Query events with filtering and pagination
 */
export async function queryEvents(options: EventQueryOptions) {
  const { page = 1, limit = 50 } = options

  // Build where clause
  const where: any = {}

  if (options.eventType) {
    where.eventType = options.eventType
  }

  if (options.entityType) {
    where.entityType = options.entityType
  }

  if (options.entityId) {
    where.entityId = options.entityId
  }

  if (options.userId) {
    where.userId = options.userId
  }

  if (options.startDate || options.endDate) {
    where.timestamp = {}
    if (options.startDate) {
      where.timestamp.gte = options.startDate
    }
    if (options.endDate) {
      where.timestamp.lte = options.endDate
    }
  }

  // Get total count
  const total = await prisma.event.count({ where })

  // Get paginated results
  const events = await prisma.event.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
        },
      },
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      timestamp: 'desc',
    },
  })

  return {
    events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get events for a specific entity
 */
export async function getEntityEvents(entityType: string, entityId: string) {
  const events = await prisma.event.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  })

  return events
}

/**
 * Get recent events for a user
 */
export async function getUserRecentEvents(userId: string, limit: number = 20) {
  const events = await prisma.event.findMany({
    where: {
      userId,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  })

  return events
}

/**
 * Log user login event
 */
export async function logUserLogin(userId: string, metadata?: Record<string, any>) {
  return createEvent({
    eventType: EventType.USER_LOGIN,
    entityType: EntityType.USER,
    entityId: userId,
    userId,
    payload: {
      ...metadata,
      loginAt: new Date().toISOString(),
    },
  })
}

/**
 * Log data aggregation event
 */
export async function logDataAggregation(userId: string, stats: Record<string, any>) {
  return createEvent({
    eventType: EventType.DATA_AGGREGATION,
    entityType: EntityType.SYSTEM,
    entityId: 'dashboard',
    userId,
    payload: {
      ...stats,
      aggregatedAt: new Date().toISOString(),
    },
  })
}

/**
 * Log import event
 */
export async function logImportEvent(
  userId: string,
  importedCount: number,
  failedCount: number,
  metadata?: Record<string, any>
) {
  return createEvent({
    eventType: EventType.DISTRIBUTOR_IMPORTED,
    entityType: EntityType.DISTRIBUTOR,
    entityId: 'bulk_import',
    userId,
    payload: {
      importedCount,
      failedCount,
      ...metadata,
      importedAt: new Date().toISOString(),
    },
  })
}

/**
 * Log export event
 */
export async function logExportEvent(
  userId: string,
  exportedCount: number,
  metadata?: Record<string, any>
) {
  return createEvent({
    eventType: EventType.DISTRIBUTOR_EXPORTED,
    entityType: EntityType.DISTRIBUTOR,
    entityId: 'bulk_export',
    userId,
    payload: {
      exportedCount,
      ...metadata,
      exportedAt: new Date().toISOString(),
    },
  })
}
