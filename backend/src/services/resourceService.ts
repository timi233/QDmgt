import prisma from '../utils/prisma.js'
import type {
  CreateResourceBody,
  UpdateResourceBody,
  GetResourcesQuery,
} from '../schemas/resourceSchema.js'

// Define resource access levels in hierarchical order
const ACCESS_LEVEL_HIERARCHY = ['bronze', 'silver', 'gold', 'platinum'] as const
type ResourceTier = (typeof ACCESS_LEVEL_HIERARCHY)[number]
type ResourceAccessLevel = ResourceTier | 'all'

/**
 * Map user role to resource tier
 * Leaders and Admins get platinum access, sales get silver access
 */
function getUserTier(role: string): ResourceTier {
  if (role === 'leader' || role === 'admin') {
    return 'platinum'
  }
  // Default tier for sales users
  return 'silver'
}

/**
 * Get all access levels permitted for a user role
 * Includes 'all' plus all tiers up to and including the user's tier
 */
function getPermittedAccessLevels(role: string): ResourceAccessLevel[] {
  const userTier = getUserTier(role)
  const tierIndex = ACCESS_LEVEL_HIERARCHY.indexOf(userTier)

  // User can access 'all' resources plus their tier and below
  return ['all', ...ACCESS_LEVEL_HIERARCHY.slice(0, tierIndex + 1)]
}

/**
 * Verify user has permission to access a specific resource level
 * Throws error if access is denied
 */
function verifyAccessLevel(resourceLevel: string, userRole: string): void {
  const permitted = new Set<string>(getPermittedAccessLevels(userRole))

  if (!permitted.has(resourceLevel)) {
    throw new Error('Access denied: insufficient permissions for this resource level')
  }
}

/**
 * Create a new resource
 */
export async function createResource(
  data: CreateResourceBody & { createdBy: string },
  userRole: string
) {
  // Verify user can create resources at this access level
  verifyAccessLevel(data.accessLevel ?? 'all', userRole)

  const resource = await prisma.resourceLibrary.create({
    data: {
      ...data,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
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

  return resource
}

/**
 * Get resources with filters and pagination
 * Automatically filters by user's permitted access levels
 */
export async function getResources(query: GetResourcesQuery, userRole: string) {
  const { page = 1, limit = 20, category, accessLevel, isActive, search } = query

  // Base filter: only resources user has permission to access
  const where: any = {
    accessLevel: { in: getPermittedAccessLevels(userRole) },
  }

  if (category) {
    where.category = category
  }

  // If user explicitly filters by access level, verify they can access it
  if (accessLevel) {
    verifyAccessLevel(accessLevel, userRole)
    where.accessLevel = accessLevel
  }

  if (isActive !== undefined) {
    where.isActive = isActive
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { keywords: { contains: search } },
    ]
  }

  const [resources, total] = await Promise.all([
    prisma.resourceLibrary.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.resourceLibrary.count({ where }),
  ])

  return {
    resources,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get resource by ID
 * Verifies user has access to this resource's level
 */
export async function getResourceById(id: string, userRole: string) {
  const resource = await prisma.resourceLibrary.findUnique({
    where: { id },
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

  if (!resource) {
    throw new Error('Resource not found')
  }

  // Verify user has access to this resource's level
  verifyAccessLevel(resource.accessLevel, userRole)

  return resource
}

/**
 * Update resource
 */
export async function updateResource(
  id: string,
  data: UpdateResourceBody,
  userId: string
) {
  const existing = await prisma.resourceLibrary.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new Error('Resource not found')
  }

  // Only creator, leader or admin can update
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (existing.createdBy !== userId && user?.role !== 'leader' && user?.role !== 'admin') {
    throw new Error('Only the resource creator or leader can update it')
  }

  // Verify user can access both current and new access levels
  verifyAccessLevel(existing.accessLevel, user?.role ?? 'sales')

  if (data.accessLevel) {
    verifyAccessLevel(data.accessLevel, user?.role ?? 'sales')
  }

  const updated = await prisma.resourceLibrary.update({
    where: { id },
    data: {
      ...data,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
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

  return updated
}

/**
 * Delete resource
 */
export async function deleteResource(id: string, userId: string) {
  const resource = await prisma.resourceLibrary.findUnique({
    where: { id },
  })

  if (!resource) {
    throw new Error('Resource not found')
  }

  // Only creator, leader or admin can delete
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (resource.createdBy !== userId && user?.role !== 'leader' && user?.role !== 'admin') {
    throw new Error('Only the resource creator or leader can delete it')
  }

  // Verify user can access this resource's level
  verifyAccessLevel(resource.accessLevel, user?.role ?? 'sales')

  await prisma.resourceLibrary.delete({
    where: { id },
  })
}

/**
 * Track resource download
 * Verifies user has access before incrementing counter
 */
export async function trackDownload(id: string, userRole: string) {
  const resource = await prisma.resourceLibrary.findUnique({
    where: { id },
  })

  if (!resource) {
    throw new Error('Resource not found')
  }

  // Verify user has access to download this resource
  verifyAccessLevel(resource.accessLevel, userRole)

  await prisma.resourceLibrary.update({
    where: { id },
    data: {
      downloadCount: { increment: 1 },
    },
  })
}

/**
 * Track resource view
 * Verifies user has access before incrementing counter
 */
export async function trackView(id: string, userRole: string) {
  const resource = await prisma.resourceLibrary.findUnique({
    where: { id },
  })

  if (!resource) {
    throw new Error('Resource not found')
  }

  // Verify user has access to view this resource
  verifyAccessLevel(resource.accessLevel, userRole)

  await prisma.resourceLibrary.update({
    where: { id },
    data: {
      viewCount: { increment: 1 },
    },
  })
}

/**
 * Get resource statistics
 */
export async function getResourceStats() {
  const [totalResources, activeResources, totalDownloads, totalViews, categoryStats] =
    await Promise.all([
      prisma.resourceLibrary.count(),
      prisma.resourceLibrary.count({ where: { isActive: true } }),
      prisma.resourceLibrary.aggregate({
        _sum: { downloadCount: true },
      }),
      prisma.resourceLibrary.aggregate({
        _sum: { viewCount: true },
      }),
      prisma.resourceLibrary.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
    ])

  return {
    totalResources,
    activeResources,
    totalDownloads: totalDownloads._sum.downloadCount || 0,
    totalViews: totalViews._sum.viewCount || 0,
    categoryStats: categoryStats.map((stat) => ({
      category: stat.category,
      count: stat._count.id,
    })),
  }
}
