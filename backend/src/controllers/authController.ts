import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../utils/prisma.js'
import { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyToken } from '../services/authService.js'
import { auditLogger } from '../utils/logger.js'
import { saveRefreshToken, validateRefreshToken, revokeRefreshToken } from '../utils/refreshTokenStore.js'
import { feishuService } from '../services/feishuService.js'

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(2).max(20),
  email: z.string().email(),
  password: z.string()
    .min(12, '密码至少需要12个字符')
    .regex(/[A-Z]/, '密码需包含至少一个大写字母')
    .regex(/[a-z]/, '密码需包含至少一个小写字母')
    .regex(/[0-9]/, '密码需包含至少一个数字')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, '密码需包含至少一个特殊字符'),
  name: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body)

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username },
    })

    if (existingUsername) {
      return res.status(400).json({
        error: 'Username already exists',
      })
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingEmail) {
      return res.status(400).json({
        error: 'Email already exists',
      })
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        passwordHash,
        name: validatedData.name,
        role: null, // No role assigned, waiting for admin approval
        status: 'approved', // Can login immediately but no permissions
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    // Log registration event
    auditLogger.logAuthEvent({
      userId: user.id,
      event: 'REGISTER',
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      success: true,
    })

    return res.status(201).json({
      message: '注册成功！您可以登录系统，但需要等待管理员分配角色权限后才能使用完整功能。',
      user,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    console.error('Register error:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response) {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (!user) {
      // Log failed login attempt
      auditLogger.logAuthEvent({
        event: 'LOGIN_FAILED',
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
        success: false,
        reason: 'Invalid credentials',
      })

      return res.status(401).json({
        error: 'Invalid email or password',
      })
    }

    // Verify password
    const isPasswordValid = await comparePassword(validatedData.password, user.passwordHash)

    if (!isPasswordValid) {
      // Log failed login attempt
      auditLogger.logAuthEvent({
        userId: user.id,
        event: 'LOGIN_FAILED',
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
        success: false,
        reason: 'Invalid password',
      })

      return res.status(401).json({
        error: 'Invalid email or password',
      })
    }

    // Check if user account is rejected
    if (user.status === 'rejected') {
      return res.status(403).json({
        error: '账户已被拒绝，请联系管理员',
      })
    }

    // Check if user must change password
    if (user.requirePasswordChange) {
      // Generate a temporary token for password change only
      const tempToken = generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'pending',
      })

      return res.status(200).json({
        requirePasswordChange: true,
        message: '首次登录需要修改密码',
        tempToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      })
    }

    // Generate JWT tokens
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'pending',
    }

    const accessToken = generateToken(payload)
    const refreshToken = generateRefreshToken(payload)

    // Save refresh token (expires in 7 days)
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    saveRefreshToken(user.id, refreshToken, refreshTokenExpiresAt)

    // Set httpOnly cookies for security
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours (match JWT expiration)
      path: '/',
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    })

    // Log login event
    await prisma.event.create({
      data: {
        eventType: 'user_login',
        entityType: 'user',
        entityId: user.id,
        userId: user.id,
        payload: JSON.stringify({
          email: user.email,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    // Log successful login to audit
    auditLogger.logAuthEvent({
      userId: user.id,
      event: 'LOGIN',
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      success: true,
    })

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    console.error('Login error:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 */
export async function logout(req: Request, res: Response) {
  try {
    // In a stateless JWT system, logout is handled client-side by removing the token
    // We can log the logout event if user info is available from the auth middleware
    const userId = (req as any).user?.userId

    if (userId) {
      await prisma.event.create({
        data: {
          eventType: 'user_logout',
          entityType: 'user',
          entityId: userId,
          userId,
          payload: JSON.stringify({
            timestamp: new Date().toISOString(),
          }),
        },
      })

      // Revoke refresh token
      revokeRefreshToken(userId)

      // Log logout to audit
      auditLogger.logAuthEvent({
        userId,
        event: 'LOGOUT',
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
        success: true,
      })
    }

    // Clear both cookies
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    })

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
    })

    return res.status(200).json({
      message: 'Logout successful',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export async function refreshAccessToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.cookies

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token not found',
      })
    }

    // Verify refresh token
    let decoded
    try {
      decoded = verifyToken(refreshToken)
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
      })
    }

    // Validate refresh token exists in store
    if (!validateRefreshToken(decoded.userId, refreshToken)) {
      return res.status(401).json({
        error: 'Refresh token has been revoked',
      })
    }

    // Generate new access token
    const newAccessToken = generateToken({
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
    })

    // Set new access token cookie
    res.cookie('token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours (match JWT expiration)
      path: '/',
    })

    return res.status(200).json({
      message: 'Token refreshed successfully',
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
}

/**
 * Change password
 * POST /api/auth/change-password
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string()
    .min(12, '密码至少需要12个字符')
    .regex(/[A-Z]/, '密码需包含至少一个大写字母')
    .regex(/[a-z]/, '密码需包含至少一个小写字母')
    .regex(/[0-9]/, '密码需包含至少一个数字')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, '密码需包含至少一个特殊字符'),
})

export async function changePassword(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
      })
    }

    // Validate input
    const validatedData = changePasswordSchema.parse(req.body)

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      })
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(
      validatedData.currentPassword,
      user.passwordHash
    )

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: '当前密码不正确',
      })
    }

    // Hash new password
    const newPasswordHash = await hashPassword(validatedData.newPassword)

    // Update password and clear requirePasswordChange flag
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        requirePasswordChange: false,
      },
    })

    // Log password change event
    auditLogger.logAuthEvent({
      userId,
      event: 'PASSWORD_CHANGED',
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      success: true,
    })

    return res.status(200).json({
      message: '密码修改成功',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
    }

    console.error('Change password error:', error)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
}

/**
 * Feishu OAuth Login
 * POST /api/auth/feishu/login
 */
export async function feishuLogin(req: Request, res: Response) {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: '缺少授权码' })
    }

    const feishuUser = await feishuService.getUserByCode(code)
    console.log('[飞书登录] 获取到飞书用户信息:', JSON.stringify(feishuUser, null, 2))

    // Find or create user by feishuId
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { feishuId: feishuUser.open_id },
          { feishuUnionId: feishuUser.union_id },
        ].filter(Boolean),
      },
    })

    const phone = feishuUser.mobile?.replace(/^\+86/, '') || null
    const email = feishuUser.enterprise_email || feishuUser.email || null

    if (!user) {
      // Create new user (no role by default)
      user = await prisma.user.create({
        data: {
          feishuId: feishuUser.open_id,
          feishuUnionId: feishuUser.union_id,
          name: feishuUser.name,
          phone,
          email,
          avatar: feishuUser.avatar_url,
          role: null,
          status: 'approved',
        },
      })
      console.log(`[飞书登录] 创建新用户: ${feishuUser.name} (无角色)`)
    } else {
      // Check if user is rejected
      if (user.status === 'rejected') {
        return res.status(403).json({ error: '账户已被禁用，请联系管理员' })
      }

      // Update existing user info - prefer Feishu data over existing
      console.log('[飞书登录] 匹配到现有用户:', { id: user.id, name: user.name, role: user.role })
      console.log('[飞书登录] 飞书返回的名字:', feishuUser.name)
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          feishuId: feishuUser.open_id,
          feishuUnionId: feishuUser.union_id,
          name: feishuUser.name || user.name,
          phone: phone || user.phone,
          avatar: feishuUser.avatar_url || user.avatar,
        },
      })
      console.log('[飞书登录] 更新后用户:', { id: user.id, name: user.name, role: user.role })
    }

    // Generate tokens
    const payload = {
      userId: user.id,
      username: user.username || user.name || '',
      email: user.email || '',
      role: user.role || 'pending',
    }

    const accessToken = generateToken(payload)
    const refreshToken = generateRefreshToken(payload)

    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    saveRefreshToken(user.id, refreshToken, refreshTokenExpiresAt)

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours (match JWT expiration)
      path: '/',
    })

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    })

    auditLogger.logAuthEvent({
      userId: user.id,
      event: 'FEISHU_LOGIN',
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      success: true,
    })

    return res.status(200).json({
      message: '飞书登录成功',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        department: user.department,
      },
    })
  } catch (error: any) {
    console.error('Feishu login error:', error)
    return res.status(500).json({
      error: error.message || '飞书登录失败',
    })
  }
}

/**
 * Sync Feishu Organization
 * POST /api/auth/feishu/sync
 */
export async function syncFeishuOrganization(req: Request, res: Response) {
  try {
    const currentUser = (req as any).user
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: '仅管理员可执行此操作' })
    }

    let created = 0
    let skipped = 0
    const processedIds = new Set<string>()

    console.log('[飞书同步] 开始获取部门列表...')
    const departments = await feishuService.getDepartments()
    console.log(`[飞书同步] 获取到 ${departments.length} 个部门`)

    for (const dept of departments) {
      console.log(`[飞书同步] 处理部门: ${dept.name}`)
      const members = await feishuService.getDepartmentMembers(dept.open_department_id)

      for (const member of members) {
        if (processedIds.has(member.open_id)) continue
        processedIds.add(member.open_id)

        const phone = member.mobile?.replace(/^\+86/, '') || null
        const email = member.enterprise_email || member.email || null

        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { feishuId: member.open_id },
              { feishuUnionId: member.union_id },
            ].filter(Boolean),
          },
        })

        if (existingUser) {
          skipped++
          continue
        }

        await prisma.user.create({
          data: {
            feishuId: member.open_id,
            feishuUnionId: member.union_id,
            name: member.name || '未知用户',
            phone,
            email,
            avatar: member.avatar?.avatar_origin,
            department: dept.name,
            role: null,
            status: 'approved',
          },
        })
        created++
        console.log(`[飞书同步] 创建用户: ${member.name}`)
      }
    }

    console.log(`[飞书同步] 完成! 新增: ${created}, 跳过: ${skipped}`)

    return res.status(200).json({
      message: `同步完成：新增 ${created} 人，跳过 ${skipped} 人`,
      created,
      skipped,
      total: processedIds.size,
    })
  } catch (error: any) {
    console.error('Feishu sync error:', error)
    return res.status(500).json({
      error: error.message || '飞书同步失败',
    })
  }
}
