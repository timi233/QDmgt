import prisma from '../utils/prisma.js'
import { logEvent } from '../utils/eventLogger.js'

export interface CreateTaskInput {
  distributorId?: string // Optional: task may not be linked to a distributor
  assignedUserId: string
  title: string
  description?: string
  deadline: Date
  priority?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  deadline?: Date
  priority?: string
  distributorId?: string | null
}

export interface TaskQueryOptions {
  userId: string
  userRole: string
  page?: number
  limit?: number
  filters?: {
    status?: string
    priority?: string
    distributorId?: string
    search?: string
  }
}

/**
 * Apply permission-based filtering for tasks
 * Sales users can only see tasks assigned to them or where they are collaborators
 * Leaders and Admins can see all tasks
 */
function applyPermissionFilter(userId: string, userRole: string) {
  if (userRole === 'leader' || userRole === 'admin') {
    return {} // Leaders and Admins can see all
  }
  // Sales can see tasks where they are assignee or collaborator
  return {
    OR: [
      { assignedUserId: userId },
      { collaborators: { some: { userId } } },
    ],
  }
}

/**
 * Create a new task
 */
export async function createTask(
  data: CreateTaskInput,
  creatorUserId: string
) {
  // Validate distributor exists (only if provided)
  let distributor = null
  if (data.distributorId) {
    distributor = await prisma.distributor.findUnique({
      where: { id: data.distributorId },
    })

    if (!distributor) {
      throw new Error('Distributor not found')
    }
  }

  // Validate assigned user exists
  const assignedUser = await prisma.user.findUnique({
    where: { id: data.assignedUserId },
  })

  if (!assignedUser) {
    throw new Error('Assigned user not found')
  }

  // Create task with initial status history
  const task = await prisma.task.create({
    data: {
      ...data,
      creatorUserId,
      status: 'pending',
    },
    include: {
      distributor: true,
      assignedUser: {
        select: { id: true, username: true, name: true, email: true },
      },
      creator: {
        select: { id: true, username: true, name: true, email: true },
      },
    },
  })

  // Create initial status history
  await prisma.taskStatusHistory.create({
    data: {
      taskId: task.id,
      fromStatus: null,
      toStatus: 'pending',
      changedBy: creatorUserId,
      reason: 'Task created',
    },
  })

  // Log event
  await logEvent({
    eventType: 'task_created',
    entityType: 'task',
    entityId: task.id,
    userId: creatorUserId,
    payload: {
      taskTitle: task.title,
      distributorName: distributor?.name ?? null,
      assignedTo: assignedUser.username,
      priority: task.priority,
      deadline: task.deadline,
    },
  })

  return task
}

/**
 * Get all tasks with filters and pagination
 */
export async function getAllTasks(options: TaskQueryOptions) {
  const { userId, userRole, page = 1, limit = 20, filters = {} } = options

  const permissionFilter = applyPermissionFilter(userId, userRole)

  // Build where clause
  const where: any = {
    ...permissionFilter,
    archivedAt: null, // Exclude archived tasks
  }

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.priority) {
    where.priority = filters.priority
  }

  if (filters.distributorId) {
    where.distributorId = filters.distributorId
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  // Get total count
  const total = await prisma.task.count({ where })

  // Get tasks
  const tasks = await prisma.task.findMany({
    where,
    include: {
      distributor: {
        select: { id: true, name: true, region: true },
      },
      assignedUser: {
        select: { id: true, username: true, name: true, email: true },
      },
      creator: {
        select: { id: true, username: true, name: true },
      },
      collaborators: {
        include: {
          user: {
            select: { id: true, username: true, name: true },
          },
        },
      },
      _count: {
        select: {
          comments: true,
        },
      },
    },
    orderBy: [
      { priority: 'desc' }, // Urgent tasks first
      { deadline: 'asc' }, // Earlier deadlines first
    ],
    skip: (page - 1) * limit,
    take: limit,
  })

  return {
    tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get task by ID
 */
export async function getTaskById(
  id: string,
  userId: string,
  userRole: string
) {
  const permissionFilter = applyPermissionFilter(userId, userRole)

  const task = await prisma.task.findFirst({
    where: {
      id,
      ...permissionFilter,
    },
    include: {
      distributor: true,
      assignedUser: {
        select: { id: true, username: true, name: true, email: true },
      },
      creator: {
        select: { id: true, username: true, name: true, email: true },
      },
      collaborators: {
        include: {
          user: {
            select: { id: true, username: true, name: true, email: true },
          },
          addedByUser: {
            select: { id: true, username: true, name: true },
          },
        },
        orderBy: { addedAt: 'desc' },
      },
      comments: {
        include: {
          user: {
            select: { id: true, username: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      statusHistory: {
        include: {
          changedByUser: {
            select: { id: true, username: true, name: true },
          },
        },
        orderBy: { changedAt: 'desc' },
      },
    },
  })

  if (!task) {
    throw new Error('Task not found or access denied')
  }

  return task
}

/**
 * Update task
 */
export async function updateTask(
  id: string,
  data: UpdateTaskInput,
  userId: string,
  userRole: string
) {
  // Check permission
  const task = await getTaskById(id, userId, userRole)

  // Validate distributor if provided (null means clearing the association)
  if (data.distributorId !== undefined && data.distributorId !== null) {
    const distributor = await prisma.distributor.findUnique({
      where: { id: data.distributorId },
    })
    if (!distributor) {
      throw new Error('Distributor not found')
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data,
    include: {
      distributor: true,
      assignedUser: {
        select: { id: true, username: true, name: true, email: true },
      },
      creator: {
        select: { id: true, username: true, name: true, email: true },
      },
    },
  })

  // Log event
  await logEvent({
    eventType: 'task_updated',
    entityType: 'task',
    entityId: id,
    userId,
    payload: {
      taskTitle: task.title,
      updatedFields: Object.keys(data),
    },
  })

  return updatedTask
}

/**
 * Update task status with history tracking
 */
export async function updateTaskStatus(
  id: string,
  newStatus: string,
  userId: string,
  userRole: string,
  reason?: string
) {
  // Check permission
  const task = await getTaskById(id, userId, userRole)

  const oldStatus = task.status

  // Validate status transition
  const validStatuses = ['pending', 'in_progress', 'completed', 'overdue']
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`)
  }

  // Update task status
  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date() : task.completedAt,
    },
    include: {
      distributor: true,
      assignedUser: {
        select: { id: true, username: true, name: true, email: true },
      },
    },
  })

  // Create status history entry
  await prisma.taskStatusHistory.create({
    data: {
      taskId: id,
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedBy: userId,
      reason,
    },
  })

  // Log event
  await logEvent({
    eventType: 'task_status_changed',
    entityType: 'task',
    entityId: id,
    userId,
    payload: {
      taskTitle: task.title,
      fromStatus: oldStatus,
      toStatus: newStatus,
      reason,
    },
  })

  return updatedTask
}

/**
 * Assign task to another user (transfer)
 */
export async function assignTask(
  id: string,
  newAssigneeId: string,
  userId: string,
  userRole: string,
  reason?: string
) {
  // Check permission
  const task = await getTaskById(id, userId, userRole)

  // Validate new assignee exists
  const newAssignee = await prisma.user.findUnique({
    where: { id: newAssigneeId },
  })

  if (!newAssignee) {
    throw new Error('New assignee not found')
  }

  const oldAssigneeId = task.assignedUserId

  // Update task assignee
  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      assignedUserId: newAssigneeId,
    },
    include: {
      distributor: true,
      assignedUser: {
        select: { id: true, username: true, name: true, email: true },
      },
    },
  })

  // Log event
  await logEvent({
    eventType: 'task_assigned',
    entityType: 'task',
    entityId: id,
    userId,
    payload: {
      taskTitle: task.title,
      fromUserId: oldAssigneeId,
      toUserId: newAssigneeId,
      toUsername: newAssignee.username,
      reason,
    },
  })

  return updatedTask
}

/**
 * Add collaborator to task
 */
export async function addCollaborator(
  taskId: string,
  collaboratorUserId: string,
  addedBy: string,
  userRole: string
) {
  // Check permission - only assignee or leader can add collaborators
  const task = await getTaskById(taskId, addedBy, userRole)

  if (task.assignedUserId !== addedBy && userRole !== 'leader' && userRole !== 'admin') {
    throw new Error('Only task assignee or leader can add collaborators')
  }

  // Validate collaborator exists
  const collaborator = await prisma.user.findUnique({
    where: { id: collaboratorUserId },
  })

  if (!collaborator) {
    throw new Error('Collaborator user not found')
  }

  // Check if already collaborator
  const existing = await prisma.taskCollaborator.findUnique({
    where: {
      taskId_userId: {
        taskId,
        userId: collaboratorUserId,
      },
    },
  })

  if (existing) {
    throw new Error('User is already a collaborator on this task')
  }

  // Add collaborator
  const taskCollaborator = await prisma.taskCollaborator.create({
    data: {
      taskId,
      userId: collaboratorUserId,
      addedBy,
    },
    include: {
      user: {
        select: { id: true, username: true, name: true, email: true },
      },
    },
  })

  // Log event
  await logEvent({
    eventType: 'collaborator_added',
    entityType: 'task',
    entityId: taskId,
    userId: addedBy,
    payload: {
      taskTitle: task.title,
      collaboratorUsername: collaborator.username,
    },
  })

  return taskCollaborator
}

/**
 * Remove collaborator from task
 */
export async function removeCollaborator(
  taskId: string,
  collaboratorUserId: string,
  removedBy: string,
  userRole: string
) {
  // Check permission
  const task = await getTaskById(taskId, removedBy, userRole)

  if (task.assignedUserId !== removedBy && userRole !== 'leader' && userRole !== 'admin') {
    throw new Error('Only task assignee or leader can remove collaborators')
  }

  // Remove collaborator
  const deleted = await prisma.taskCollaborator.delete({
    where: {
      taskId_userId: {
        taskId,
        userId: collaboratorUserId,
      },
    },
    include: {
      user: {
        select: { username: true },
      },
    },
  })

  // Log event
  await logEvent({
    eventType: 'collaborator_removed',
    entityType: 'task',
    entityId: taskId,
    userId: removedBy,
    payload: {
      taskTitle: task.title,
      collaboratorUsername: deleted.user.username,
    },
  })

  return deleted
}

/**
 * Add comment to task
 */
export async function addComment(
  taskId: string,
  content: string,
  userId: string,
  userRole: string
) {
  // Check permission - user must have access to task
  await getTaskById(taskId, userId, userRole)

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      userId,
      content,
    },
    include: {
      user: {
        select: { id: true, username: true, name: true, email: true },
      },
    },
  })

  // Log event
  await logEvent({
    eventType: 'comment_added',
    entityType: 'task',
    entityId: taskId,
    userId,
    payload: {
      commentId: comment.id,
      contentPreview: content.substring(0, 50),
    },
  })

  return comment
}

/**
 * Check for overdue tasks and update status
 * Called by scheduled job
 */
export async function checkOverdueTasks() {
  const now = new Date()

  // Find tasks that are overdue
  const overdueTasks = await prisma.task.findMany({
    where: {
      deadline: { lt: now },
      status: { in: ['pending', 'in_progress'] },
      archivedAt: null,
    },
  })

  const updatedCount = await Promise.all(
    overdueTasks.map(async (task) => {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'overdue' },
      })

      await prisma.taskStatusHistory.create({
        data: {
          taskId: task.id,
          fromStatus: task.status,
          toStatus: 'overdue',
          changedBy: task.assignedUserId,
          reason: 'Automatically marked as overdue',
        },
      })

      return task.id
    })
  )

  return {
    count: updatedCount.length,
    taskIds: updatedCount,
  }
}

/**
 * Auto-archive completed tasks after 3 days
 * Called by scheduled job
 */
export async function autoArchiveCompletedTasks() {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const result = await prisma.task.updateMany({
    where: {
      status: 'completed',
      completedAt: { lt: threeDaysAgo },
      archivedAt: null,
    },
    data: {
      archivedAt: new Date(),
    },
  })

  return {
    count: result.count,
  }
}

/**
 * Delete task (only creator or leader/admin can delete)
 */
export async function deleteTask(
  id: string,
  userId: string,
  userRole: string
) {
  // Check permission - get task first
  const task = await getTaskById(id, userId, userRole)

  // Only creator or leader/admin can delete
  if (task.creatorUserId !== userId && userRole !== 'leader' && userRole !== 'admin') {
    throw new Error('Only task creator or leader can delete tasks')
  }

  // Delete task (cascade will handle related records)
  await prisma.task.delete({
    where: { id },
  })

  // Log event
  await logEvent({
    eventType: 'task_deleted',
    entityType: 'task',
    entityId: id,
    userId,
    payload: {
      taskTitle: task.title,
    },
  })

  return { id, title: task.title }
}
