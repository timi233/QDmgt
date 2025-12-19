import prisma from '../utils/prisma.js'
import { validateDistributor } from '../utils/validators.js'
import { getAccessibleUserIds } from '../utils/permissionScope.js'

export interface CreateDistributorInput {
  name: string
  region: string
  contactPerson: string
  phone: string
  cooperationLevel: string
  creditLimit?: number
  tags?: string[]
  historicalPerformance?: string
  notes?: string
}

export interface UpdateDistributorInput extends Partial<CreateDistributorInput> {}

export interface DistributorQueryOptions {
  userId: string
  userRole: string
  page?: number
  limit?: number
  filters?: {
    region?: string
    cooperationLevel?: string
    channelTier?: string
    partnerType?: string
    healthStatus?: string
    search?: string
  }
}

/**
 * Apply permission-based filtering
 * Admin: can see all distributors
 * Leader: can see distributors owned by self or managed sales
 * Sales: can only see their own distributors
 */
async function applyPermissionFilter(userId: string, userRole: string) {
  if (userRole === 'admin') {
    return {}
  }
  const accessibleUserIds = await getAccessibleUserIds(userId, userRole)
  return { ownerUserId: { in: accessibleUserIds } }
}

/**
 * Create a new distributor
 */
export async function createDistributor(
  data: CreateDistributorInput,
  userId: string
) {
  console.log('[createDistributor] Input data:', JSON.stringify(data, null, 2))
  console.log('[createDistributor] User ID:', userId)

  // Sanitize text fields first (trim whitespace)
  const sanitizedData = {
    ...data,
    name: data.name.trim(),
    region: data.region.trim(),
    contactPerson: data.contactPerson.trim(),
    notes: data.notes?.trim(),
    historicalPerformance: data.historicalPerformance?.trim(),
  }

  // Check for existing non-deleted distributor with same name and region
  const existing = await prisma.distributor.findFirst({
    where: {
      name: sanitizedData.name,
      region: sanitizedData.region,
      deletedAt: null,
    },
  })
  if (existing) {
    throw new Error('DUPLICATE_NAME_REGION')
  }

  // Validate sanitized input
  const validation = await validateDistributor(sanitizedData)
  console.log('[createDistributor] Validation result:', JSON.stringify(validation, null, 2))
  if (!validation.valid) {
    throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`)
  }

  // Create distributor
  const distributor = await prisma.distributor.create({
    data: {
      ...sanitizedData,
      ownerUserId: userId,
      tags: Array.isArray(data.tags) ? data.tags.join(',') : (data.tags || ''),
      creditLimit: data.creditLimit || 0,
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  })

  // Log event
  await prisma.event.create({
    data: {
      eventType: 'distributor_created',
      entityType: 'distributor',
      entityId: distributor.id,
      userId,
      payload: JSON.stringify({
        distributorName: distributor.name,
        region: distributor.region,
        cooperationLevel: distributor.cooperationLevel,
      }),
    },
  })

  return distributor
}

/**
 * Get all distributors with pagination and filtering
 */
export async function getAllDistributors(options: DistributorQueryOptions) {
  const { userId, userRole, page = 1, limit = 20, filters = {} } = options

  // Build where clause
  const permissionFilter = await applyPermissionFilter(userId, userRole)
  const where: any = {
    deletedAt: null,
    ...permissionFilter,
  }

  // Apply filters
  if (filters.region) {
    where.region = { contains: filters.region }
  }

  if (filters.cooperationLevel) {
    where.cooperationLevel = filters.cooperationLevel
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { contactPerson: { contains: filters.search } },
    ]
  }

  if (filters.channelTier) {
    where.channelTier = filters.channelTier
  }

  if (filters.partnerType) {
    where.partnerType = filters.partnerType
  }

  if (filters.healthStatus) {
    where.healthStatus = filters.healthStatus
  }

  // Get total count
  const total = await prisma.distributor.count({ where })

  // Get paginated results
  const distributors = await prisma.distributor.findMany({
    where,
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return {
    distributors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get distributor by ID
 */
export async function getDistributorById(
  id: string,
  userId: string,
  userRole: string
) {
  const permissionFilter = await applyPermissionFilter(userId, userRole)
  const where: any = {
    id,
    deletedAt: null,
    ...permissionFilter,
  }

  const distributor = await prisma.distributor.findFirst({
    where,
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
        },
      },
      tasks: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          deadline: true,
          assignedUser: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!distributor) {
    throw new Error('Distributor not found or access denied')
  }

  return distributor
}

/**
 * Update distributor
 */
export async function updateDistributor(
  id: string,
  data: UpdateDistributorInput,
  userId: string,
  userRole: string
) {
  // Check permission
  const existing = await getDistributorById(id, userId, userRole)

  // Sanitize text fields first (trim whitespace)
  // Required fields coerce empty strings to undefined; optional fields may be cleared
  const sanitizedData: UpdateDistributorInput = {
    ...data,
    name: data.name?.trim() || undefined,
    region: data.region?.trim() || undefined,
    contactPerson: data.contactPerson?.trim() || undefined,
    notes: data.notes !== undefined ? data.notes.trim() : undefined,
    historicalPerformance: data.historicalPerformance !== undefined ? data.historicalPerformance.trim() : undefined,
    creditLimit: data.creditLimit === null ? 0 : data.creditLimit,
  }

  // Merge with existing data for validation (use sanitized values, not fallback for provided-but-empty)
  const mergedData = {
    name: sanitizedData.name ?? existing.name,
    region: sanitizedData.region ?? existing.region,
    contactPerson: sanitizedData.contactPerson ?? existing.contactPerson,
    phone: sanitizedData.phone ?? existing.phone,
    cooperationLevel: sanitizedData.cooperationLevel ?? existing.cooperationLevel,
    creditLimit: sanitizedData.creditLimit,
    tags: sanitizedData.tags,
  }

  // Check for duplicate name+region (excluding self and soft-deleted)
  if (sanitizedData.name || sanitizedData.region) {
    const duplicate = await prisma.distributor.findFirst({
      where: {
        name: mergedData.name,
        region: mergedData.region,
        deletedAt: null,
        id: { not: id },
      },
    })
    if (duplicate) {
      throw new Error('DUPLICATE_NAME_REGION')
    }
  }

  // Always validate merged data
  const validation = await validateDistributor(mergedData, id)
  if (!validation.valid) {
    throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`)
  }

  // Update distributor
  const updated = await prisma.distributor.update({
    where: { id },
    data: {
      ...sanitizedData,
      tags: sanitizedData.tags !== undefined ? sanitizedData.tags.join(',') : undefined,
      updatedAt: new Date(),
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
    },
  })

  // Log event
  await prisma.event.create({
    data: {
      eventType: 'distributor_updated',
      entityType: 'distributor',
      entityId: id,
      userId,
      payload: JSON.stringify({
        distributorName: updated.name,
        updatedFields: Object.keys(data),
      }),
    },
  })

  return updated
}

/**
 * Delete distributor (soft delete)
 */
export async function deleteDistributor(
  id: string,
  userId: string,
  userRole: string
) {
  // Check permission
  await getDistributorById(id, userId, userRole)

  // Soft delete
  const deleted = await prisma.distributor.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  })

  // Log event
  await prisma.event.create({
    data: {
      eventType: 'distributor_deleted',
      entityType: 'distributor',
      entityId: id,
      userId,
      payload: JSON.stringify({
        distributorName: deleted.name,
      }),
    },
  })

  return deleted
}
