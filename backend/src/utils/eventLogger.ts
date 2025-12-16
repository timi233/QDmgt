import prisma from './prisma.js'

export interface EventLogData {
  eventType: string
  entityType: string
  entityId: string
  userId: string
  payload: any
}

export async function logEvent(data: EventLogData): Promise<void> {
  try {
    await prisma.event.create({
      data: {
        eventType: data.eventType,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.userId,
        payload: JSON.stringify(data.payload)
      }
    })
  } catch (error) {
    console.error('Failed to log event:', error)
    // Don't throw error to avoid breaking the main flow
  }
}

export default {
  logEvent
}
