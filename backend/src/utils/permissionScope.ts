import prisma from './prisma.js'

/**
 * Get accessible user IDs for a given user based on their role
 * - Admin: can access all users
 * - Leader: can access self + assigned sales users
 * - Sales: can only access self
 */
export async function getAccessibleUserIds(
  userId: string,
  userRole: string
): Promise<string[]> {
  if (userRole === 'admin') {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
    })
    return users.map((u) => u.id)
  }

  if (userRole === 'leader') {
    const scopes = await prisma.leaderSalesScope.findMany({
      where: { leaderId: userId },
      select: { salesId: true },
    })
    return [userId, ...scopes.map((s) => s.salesId)]
  }

  return [userId]
}

/**
 * Check if a user can access another user's data
 */
export async function canAccessUser(
  requesterId: string,
  requesterRole: string,
  targetUserId: string
): Promise<boolean> {
  if (requesterRole === 'admin') return true
  if (requesterId === targetUserId) return true

  if (requesterRole === 'leader') {
    const scope = await prisma.leaderSalesScope.findUnique({
      where: {
        leaderId_salesId: {
          leaderId: requesterId,
          salesId: targetUserId,
        },
      },
    })
    return !!scope
  }

  return false
}

/**
 * Get leader's managed sales users
 */
export async function getLeaderManagedSales(leaderId: string) {
  const scopes = await prisma.leaderSalesScope.findMany({
    where: { leaderId },
    include: {
      sales: {
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          deletedAt: true,
        },
      },
    },
  })
  return scopes.map((s) => s.sales)
}

/**
 * Set leader's managed sales (replace all)
 */
export async function setLeaderManagedSales(
  leaderId: string,
  salesIds: string[]
) {
  await prisma.$transaction([
    prisma.leaderSalesScope.deleteMany({ where: { leaderId } }),
    prisma.leaderSalesScope.createMany({
      data: salesIds.map((salesId) => ({ leaderId, salesId })),
    }),
  ])
}
