import prisma from '../utils/prisma.js'
import type {
  CreateTrainingBody,
  UpdateTrainingBody,
  GetTrainingsQuery,
  RegisterParticipantBody,
  UpdateParticipantBody,
  GetParticipantsQuery,
} from '../schemas/trainingSchema.js'

/**
 * Ensure user has permission to manage training participants
 * Only the training creator, leader or admin can manage participants
 */
function ensureParticipantManager(
  training: { createdBy: string },
  userId: string,
  userRole: string
) {
  if (userRole === 'leader' || userRole === 'admin') {
    return
  }

  if (training.createdBy !== userId) {
    throw new Error('Only the training creator or leader can manage participants')
  }
}

/**
 * 将前端字段映射到数据库字段
 */
function mapFrontendToDbFields(data: any) {
  const mapped: any = { ...data }

  // instructor -> instructorName
  if (data.instructor !== undefined) {
    mapped.instructorName = data.instructor
    delete mapped.instructor
  }

  // capacity -> maxParticipants
  if (data.capacity !== undefined) {
    mapped.maxParticipants = data.capacity
    delete mapped.capacity
  }

  // materialsUrl -> materials
  if (data.materialsUrl !== undefined) {
    mapped.materials = data.materialsUrl
    delete mapped.materialsUrl
  }

  // planned -> scheduled (状态值映射)
  if (data.status === 'planned') {
    mapped.status = 'scheduled'
  }

  return mapped
}

/**
 * Create a new training
 */
export async function createTraining(data: CreateTrainingBody & { createdBy: string }) {
  // 映射前端字段名到数据库字段名
  const mappedData = mapFrontendToDbFields(data)

  const training = await prisma.training.create({
    data: {
      ...mappedData,
      startDate: new Date(mappedData.startDate),
      endDate: mappedData.endDate ? new Date(mappedData.endDate) : undefined,
    },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
  })

  return training
}

/**
 * Get trainings with filters and pagination
 * Performance optimized: returns participant count instead of loading all participants
 */
export async function getTrainings(query: GetTrainingsQuery) {
  const {
    page = 1,
    limit = 20,
    trainingType,
    format,
    status,
    startDate,
    endDate,
  } = query

  const where: any = {}

  if (trainingType) {
    where.trainingType = trainingType
  }

  if (format) {
    where.format = format
  }

  if (status) {
    // 映射 planned -> scheduled
    where.status = status === 'planned' ? 'scheduled' : status
  }

  // Fix: Apply startDate filter to startDate field
  if (startDate) {
    where.startDate = {
      ...(where.startDate ?? {}),
      gte: new Date(startDate),
    }
  }

  // Fix: Apply endDate filter to endDate field (not startDate)
  if (endDate) {
    where.endDate = {
      ...(where.endDate ?? {}),
      lte: new Date(endDate),
    }
  }

  const [rawTrainings, total] = await Promise.all([
    prisma.training.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        // Performance optimization: count participants instead of loading all
        _count: {
          select: {
            participants: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: 'desc' },
    }),
    prisma.training.count({ where }),
  ])

  // Transform response to include participant count
  const trainings = rawTrainings.map(({ _count, ...training }) => ({
    ...training,
    participantCount: _count.participants,
  }))

  return {
    trainings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get training by ID
 */
export async function getTrainingById(id: string) {
  const training = await prisma.training.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      participants: {
        include: {
          distributor: {
            select: {
              id: true,
              name: true,
              region: true,
              contactPerson: true,
            },
          },
        },
        orderBy: { registeredAt: 'desc' },
      },
    },
  })

  if (!training) {
    throw new Error('Training not found')
  }

  return training
}

/**
 * Update training
 */
export async function updateTraining(id: string, data: UpdateTrainingBody, userId: string) {
  const existing = await prisma.training.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new Error('Training not found')
  }

  // Only creator can update
  if (existing.createdBy !== userId) {
    throw new Error('Only the training creator can update it')
  }

  // 映射前端字段名到数据库字段名
  const mappedData = mapFrontendToDbFields(data)

  const updated = await prisma.training.update({
    where: { id },
    data: {
      ...mappedData,
      startDate: mappedData.startDate ? new Date(mappedData.startDate) : undefined,
      endDate: mappedData.endDate ? new Date(mappedData.endDate) : undefined,
    },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      participants: {
        include: {
          distributor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  return updated
}

/**
 * Delete training
 */
export async function deleteTraining(id: string, userId: string) {
  const training = await prisma.training.findUnique({
    where: { id },
  })

  if (!training) {
    throw new Error('Training not found')
  }

  // Only creator can delete
  if (training.createdBy !== userId) {
    throw new Error('Only the training creator can delete it')
  }

  await prisma.training.delete({
    where: { id },
  })
}

/**
 * Register a participant for training
 * Optimized: Checks capacity by counting only active (non-cancelled) participants
 */
export async function registerParticipant(
  data: RegisterParticipantBody,
  userId: string,
  userRole: string
) {
  const training = await prisma.training.findUnique({
    where: { id: data.trainingId },
    select: {
      id: true,
      createdBy: true,
      maxParticipants: true,
    },
  })

  if (!training) {
    throw new Error('Training not found')
  }

  // Authorization check: only creator or leader can register participants
  ensureParticipantManager(training, userId, userRole)

  // Optimized capacity check: count only non-cancelled participants
  if (training.maxParticipants) {
    const activeCount = await prisma.trainingParticipant.count({
      where: {
        trainingId: training.id,
        status: { not: 'cancelled' },
      },
    })

    if (activeCount >= training.maxParticipants) {
      throw new Error('Training has reached maximum number of participants')
    }
  }

  // Check if distributor exists
  const distributor = await prisma.distributor.findUnique({
    where: { id: data.distributorId },
  })

  if (!distributor) {
    throw new Error('Distributor not found')
  }

  // Check if already registered
  const existing = await prisma.trainingParticipant.findUnique({
    where: {
      trainingId_distributorId: {
        trainingId: data.trainingId,
        distributorId: data.distributorId,
      },
    },
  })

  if (existing) {
    throw new Error('Distributor is already registered for this training')
  }

  const participant = await prisma.trainingParticipant.create({
    data: {
      trainingId: data.trainingId,
      distributorId: data.distributorId,
      status: data.status || 'registered',
    },
    include: {
      training: {
        select: {
          id: true,
          title: true,
          startDate: true,
        },
      },
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
          contactPerson: true,
        },
      },
    },
  })

  return participant
}

/**
 * Get training participants with filters
 */
export async function getParticipants(query: GetParticipantsQuery) {
  const { trainingId, distributorId, status, page = 1, limit = 20 } = query

  const where: any = {}

  if (trainingId) {
    where.trainingId = trainingId
  }

  if (distributorId) {
    where.distributorId = distributorId
  }

  if (status) {
    where.status = status
  }

  const [participants, total] = await Promise.all([
    prisma.trainingParticipant.findMany({
      where,
      include: {
        training: {
          select: {
            id: true,
            title: true,
            trainingType: true,
            startDate: true,
            status: true,
          },
        },
        distributor: {
          select: {
            id: true,
            name: true,
            region: true,
            contactPerson: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { registeredAt: 'desc' },
    }),
    prisma.trainingParticipant.count({ where }),
  ])

  return {
    participants,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Update participant status/score
 */
export async function updateParticipant(
  id: string,
  data: UpdateParticipantBody,
  userId: string,
  userRole: string
) {
  const participant = await prisma.trainingParticipant.findUnique({
    where: { id },
    include: {
      training: {
        select: {
          createdBy: true,
        },
      },
    },
  })

  if (!participant) {
    throw new Error('Participant not found')
  }

  // Authorization check
  ensureParticipantManager(participant.training, userId, userRole)

  const updated = await prisma.trainingParticipant.update({
    where: { id },
    data: {
      ...data,
      completedAt: data.status === 'completed' ? new Date() : undefined,
    },
    include: {
      training: {
        select: {
          id: true,
          title: true,
          startDate: true,
        },
      },
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
        },
      },
    },
  })

  return updated
}

/**
 * Delete participant registration
 */
export async function deleteParticipant(id: string, userId: string, userRole: string) {
  const participant = await prisma.trainingParticipant.findUnique({
    where: { id },
    select: {
      id: true,
      training: {
        select: {
          createdBy: true,
        },
      },
    },
  })

  if (!participant) {
    throw new Error('Participant not found')
  }

  // Authorization check
  ensureParticipantManager(participant.training, userId, userRole)

  await prisma.trainingParticipant.delete({
    where: { id },
  })
}

/**
 * Get training statistics
 * Fix: Count ALL participants, not just completed ones
 */
export async function getTrainingStats() {
  const [totalTrainings, upcomingTrainings, completedTrainings, totalParticipants] =
    await Promise.all([
      prisma.training.count(),
      prisma.training.count({
        where: {
          status: 'scheduled',
          startDate: {
            gte: new Date(),
          },
        },
      }),
      prisma.training.count({
        where: {
          status: 'completed',
        },
      }),
      // Fix: Count all participants regardless of status
      prisma.trainingParticipant.count(),
    ])

  return {
    totalTrainings,
    upcomingTrainings,
    completedTrainings,
    totalParticipants,
  }
}
