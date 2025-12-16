import prisma from '../utils/prisma.js'
import type {
  CreateTicketBody,
  UpdateTicketBody,
  GetTicketsQuery,
  AddCommentBody,
  UpdateCommentBody,
} from '../schemas/ticketSchema.js'

/**
 * Ensure user has permission to access ticket
 * Sales users can only access tickets they created or are assigned to
 */
function ensureTicketAccess(
  ticket: { createdBy: string; assignedTo: string | null },
  userId: string,
  userRole: string
) {
  if (userRole === 'leader') {
    return
  }

  if (ticket.createdBy !== userId && ticket.assignedTo !== userId) {
    throw new Error('You do not have permission to access this ticket')
  }
}

/**
 * Create a new support ticket
 * Fix: Wrap entire creation in transaction to prevent race conditions
 */
export async function createTicket(data: CreateTicketBody & { createdBy: string }) {
  return await prisma.$transaction(async (tx) => {
    // Generate unique ticket number within transaction
    const year = new Date().getFullYear()
    const prefix = `TK${year}`

    const lastTicket = await tx.supportTicket.findFirst({
      where: {
        ticketNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        ticketNumber: 'desc',
      },
      select: {
        ticketNumber: true,
      },
    })

    let nextNumber = 1
    if (lastTicket) {
      const lastNumber = parseInt(lastTicket.ticketNumber.slice(prefix.length))
      nextNumber = lastNumber + 1
    }

    const ticketNumber = `${prefix}${nextNumber.toString().padStart(6, '0')}`

    // Check if distributor exists
    const distributor = await tx.distributor.findUnique({
      where: { id: data.distributorId },
    })

    if (!distributor) {
      throw new Error('Distributor not found')
    }

    // If assignedTo is provided, check if user exists
    if (data.assignedTo) {
      const assignee = await tx.user.findUnique({
        where: { id: data.assignedTo },
      })
      if (!assignee) {
        throw new Error('Assignee not found')
      }
    }

    const ticket = await tx.supportTicket.create({
      data: {
        ...data,
        ticketNumber,
        status: data.assignedTo ? 'assigned' : 'open',
      },
      include: {
        distributor: {
          select: {
            id: true,
            name: true,
            region: true,
            contactPerson: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    })

    return ticket
  })
}

/**
 * Get tickets with filters and pagination
 */
export async function getTickets(query: GetTicketsQuery, userId: string, userRole: string) {
  const {
    page = 1,
    limit = 20,
    distributorId,
    ticketType,
    priority,
    status,
    assignedTo,
    createdBy,
  } = query

  const where: any = {}

  if (distributorId) {
    where.distributorId = distributorId
  }

  if (ticketType) {
    where.ticketType = ticketType
  }

  if (priority) {
    where.priority = priority
  }

  if (status) {
    where.status = status
  }

  if (assignedTo) {
    where.assignedTo = assignedTo
  }

  if (createdBy) {
    where.createdBy = createdBy
  }

  // Sales users can only see their own tickets or tickets assigned to them
  if (userRole === 'sales') {
    where.OR = [{ createdBy: userId }, { assignedTo: userId }]
  }

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        distributor: {
          select: {
            id: true,
            name: true,
            region: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        comments: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supportTicket.count({ where }),
  ])

  return {
    tickets: tickets.map((ticket) => ({
      ...ticket,
      commentCount: ticket.comments.length,
      comments: undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get ticket by ID
 */
export async function getTicketById(id: string, userId: string, userRole: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
          contactPerson: true,
          phone: true,
        },
      },
      creator: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      assignee: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!ticket) {
    throw new Error('Ticket not found')
  }

  // Sales users can only view their own tickets or tickets assigned to them
  if (userRole === 'sales') {
    if (ticket.createdBy !== userId && ticket.assignedTo !== userId) {
      throw new Error('You do not have permission to view this ticket')
    }
  }

  return ticket
}

/**
 * Update ticket
 */
export async function updateTicket(id: string, data: UpdateTicketBody, userId: string, userRole: string) {
  const existing = await prisma.supportTicket.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new Error('Ticket not found')
  }

  // Sales users can only update their own tickets or assigned tickets
  if (userRole === 'sales') {
    if (existing.createdBy !== userId && existing.assignedTo !== userId) {
      throw new Error('You do not have permission to update this ticket')
    }
  }

  // If status changes to resolved, set resolvedAt
  const updateData: any = { ...data }
  if (data.status === 'resolved' && existing.status !== 'resolved') {
    updateData.resolvedAt = new Date()
    updateData.resolutionTime = Math.floor(
      (Date.now() - existing.createdAt.getTime()) / 1000 / 60
    ) // Minutes
  }

  // If status changes to closed, set closedAt
  if (data.status === 'closed' && existing.status !== 'closed') {
    updateData.closedAt = new Date()
  }

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: updateData,
    include: {
      distributor: {
        select: {
          id: true,
          name: true,
          region: true,
        },
      },
      creator: {
        select: {
          id: true,
          username: true,
          name: true,
        },
      },
      assignee: {
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
 * Delete ticket
 */
export async function deleteTicket(id: string, userId: string, userRole: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
  })

  if (!ticket) {
    throw new Error('Ticket not found')
  }

  // Only creator or leader can delete
  if (ticket.createdBy !== userId && userRole !== 'leader') {
    throw new Error('Only the ticket creator or leader can delete it')
  }

  await prisma.supportTicket.delete({
    where: { id },
  })
}

/**
 * Add comment to ticket
 * Fix: Add visibility check before allowing comment creation
 */
export async function addComment(
  data: AddCommentBody & { userId: string },
  userRole: string
) {
  // Check if ticket exists
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: data.ticketId },
    select: {
      id: true,
      createdBy: true,
      assignedTo: true,
      firstResponseAt: true,
    },
  })

  if (!ticket) {
    throw new Error('Ticket not found')
  }

  // Verify user has access to this ticket
  ensureTicketAccess(ticket, data.userId, userRole)

  // Set firstResponseAt if this is the first comment and ticket is open
  const existingComments = await prisma.ticketComment.count({
    where: { ticketId: data.ticketId },
  })

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId: data.ticketId,
      userId: data.userId,
      content: data.content,
      isInternal: data.isInternal,
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
  })

  // Update firstResponseAt if this is the first response
  if (existingComments === 0 && !ticket.firstResponseAt) {
    await prisma.supportTicket.update({
      where: { id: data.ticketId },
      data: { firstResponseAt: new Date() },
    })
  }

  return comment
}

/**
 * Update comment
 */
export async function updateComment(id: string, data: UpdateCommentBody, userId: string) {
  const existing = await prisma.ticketComment.findUnique({
    where: { id },
  })

  if (!existing) {
    throw new Error('Comment not found')
  }

  // Only comment author can update
  if (existing.userId !== userId) {
    throw new Error('Only the comment author can update it')
  }

  const updated = await prisma.ticketComment.update({
    where: { id },
    data,
    include: {
      user: {
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
 * Delete comment
 */
export async function deleteComment(id: string, userId: string, userRole: string) {
  const comment = await prisma.ticketComment.findUnique({
    where: { id },
  })

  if (!comment) {
    throw new Error('Comment not found')
  }

  // Only comment author or leader can delete
  if (comment.userId !== userId && userRole !== 'leader') {
    throw new Error('Only the comment author or leader can delete it')
  }

  await prisma.ticketComment.delete({
    where: { id },
  })
}

/**
 * Get ticket statistics
 * Fix: Directly count closed tickets instead of calculating
 */
export async function getTicketStats() {
  const [
    totalTickets,
    openTickets,
    resolvedTickets,
    closedTickets,
    avgResolutionTime,
    ticketsByType,
    ticketsByPriority,
  ] = await Promise.all([
    prisma.supportTicket.count(),
    prisma.supportTicket.count({
      where: {
        status: { in: ['open', 'assigned', 'in_progress', 'pending'] },
      },
    }),
    prisma.supportTicket.count({
      where: { status: 'resolved' },
    }),
    prisma.supportTicket.count({
      where: { status: 'closed' },
    }),
    prisma.supportTicket.aggregate({
      where: {
        resolutionTime: { not: null },
      },
      _avg: { resolutionTime: true },
    }),
    prisma.supportTicket.groupBy({
      by: ['ticketType'],
      _count: { id: true },
    }),
    prisma.supportTicket.groupBy({
      by: ['priority'],
      _count: { id: true },
    }),
  ])

  return {
    totalTickets,
    openTickets,
    resolvedTickets,
    closedTickets,
    avgResolutionTime: avgResolutionTime._avg.resolutionTime || 0,
    ticketsByType: ticketsByType.map((stat) => ({
      type: stat.ticketType,
      count: stat._count.id,
    })),
    ticketsByPriority: ticketsByPriority.map((stat) => ({
      priority: stat.priority,
      count: stat._count.id,
    })),
  }
}
