import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma.js'
import { auditLogger } from '../utils/logger.js'

const assignRoleSchema = z.object({
  role: z.enum(['sales', 'leader'], {
    errorMap: () => ({ message: 'Role must be sales or leader' }),
  }),
})

const updateRoleSchema = z.object({
  role: z.enum(['sales', 'leader', 'admin']).nullable(),
})

/**
 * Get all users
 * GET /api/admin/users
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        department: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    auditLogger.logUserAction({
      userId: req.user!.userId,
      action: 'VIEW_ALL_USERS',
      resource: 'User',
      resourceId: 'all-users',
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      success: true,
    })

    return res.status(200).json({
      message: 'Users retrieved',
      users,
    })
  } catch (error) {
    console.error('getAllUsers error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Get pending users (users without assigned roles)
 * GET /api/admin/users/pending
 */
export async function getPendingUsers(req: Request, res: Response) {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: {
        role: null,
        status: { not: 'rejected' },
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    auditLogger.logUserAction({
      userId: req.user!.userId,
      action: 'VIEW_PENDING_USERS',
      resource: 'User',
      resourceId: 'pending-users',
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      success: true,
    })

    return res.status(200).json({
      message: 'Pending users retrieved',
      users: pendingUsers,
    })
  } catch (error) {
    console.error('getPendingUsers error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Assign role to user
 * POST /api/admin/users/:id/assign-role
 */
export async function assignUserRole(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { role } = assignRoleSchema.parse(req.body)

    const targetUser = await prisma.user.findUnique({ where: { id } })

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ error: 'Cannot modify admin role' })
    }

    if (targetUser.status === 'rejected') {
      return res.status(400).json({ error: 'Cannot assign role to rejected user' })
    }

    if (targetUser.role) {
      return res.status(400).json({ error: 'User already has a role' })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role, status: 'approved' },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    })

    auditLogger.logUserAction({
      userId: req.user!.userId,
      action: 'ASSIGN_ROLE',
      resource: 'User',
      resourceId: id,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      success: true,
      details: { assignedRole: role },
    })

    return res.status(200).json({
      message: 'Role assigned successfully',
      user: updatedUser,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('assignUserRole error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Reject user
 * POST /api/admin/users/:id/reject
 */
export async function rejectUser(req: Request, res: Response) {
  try {
    const { id } = req.params

    const targetUser = await prisma.user.findUnique({ where: { id } })

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ error: 'Cannot reject admin user' })
    }

    if (targetUser.status === 'rejected') {
      return res.status(400).json({ error: 'User already rejected' })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: 'rejected', role: null },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
      },
    })

    auditLogger.logUserAction({
      userId: req.user!.userId,
      action: 'REJECT_USER',
      resource: 'User',
      resourceId: id,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      success: true,
    })

    return res.status(200).json({
      message: 'User rejected successfully',
      user: updatedUser,
    })
  } catch (error) {
    console.error('rejectUser error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Update user role (can change existing role)
 * PUT /api/admin/users/:id/role
 */
export async function updateUserRole(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { role } = updateRoleSchema.parse(req.body)

    const targetUser = await prisma.user.findUnique({ where: { id } })

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent modifying own role
    if (targetUser.id === req.user!.userId) {
      return res.status(400).json({ error: '不能修改自己的角色' })
    }

    // Prevent demoting another admin (only super admin could do this in the future)
    if (targetUser.role === 'admin' && role !== 'admin') {
      return res.status(400).json({ error: '不能降级其他管理员的角色' })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role,
        status: role ? 'approved' : targetUser.status,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        department: true,
        role: true,
        status: true,
      },
    })

    auditLogger.logUserAction({
      userId: req.user!.userId,
      action: 'UPDATE_USER_ROLE',
      resource: 'User',
      resourceId: id,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      success: true,
      details: { previousRole: targetUser.role, newRole: role },
    })

    return res.status(200).json({
      message: '角色更新成功',
      user: updatedUser,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors })
    }
    console.error('updateUserRole error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Delete user
 * DELETE /api/admin/users/:id
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params

    const targetUser = await prisma.user.findUnique({ where: { id } })

    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' })
    }

    if (targetUser.id === req.user!.userId) {
      return res.status(400).json({ error: '不能删除自己的账户' })
    }

    if (targetUser.role === 'admin') {
      return res.status(400).json({ error: '不能删除管理员账户' })
    }

    await prisma.user.delete({ where: { id } })

    auditLogger.logUserAction({
      userId: req.user!.userId,
      action: 'DELETE_USER',
      resource: 'User',
      resourceId: id,
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent'),
      success: true,
      details: { deletedUser: targetUser.name || targetUser.email },
    })

    return res.status(200).json({
      message: '用户删除成功',
    })
  } catch (error) {
    console.error('deleteUser error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
