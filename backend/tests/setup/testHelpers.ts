import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export interface TestUser {
  id: string
  username: string
  email: string
  role: string
  token: string
}

export async function createTestUser(
  role: 'sales' | 'leader' = 'sales',
  suffix: string = ''
): Promise<TestUser> {
  const timestamp = Date.now()
  const username = `test_${role}${suffix}_${timestamp}`
  const email = `${username}@test.com`
  const passwordHash = await bcrypt.hash('Test123!@#', 10)

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      name: `Test ${role} User`,
      role,
    },
  })

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  )

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    token,
  }
}

export async function createTestDistributor(
  ownerUserId: string,
  data: Partial<{
    name: string
    region: string
    contactPerson: string
    phone: string
    cooperationLevel: string
    creditLimit: number
    tags: string[]
  }> = {}
) {
  const timestamp = Date.now()
  return prisma.distributor.create({
    data: {
      name: data.name || `Test Distributor ${timestamp}`,
      region: data.region || 'Beijing/Chaoyang/CBD',
      contactPerson: data.contactPerson || 'Test Contact',
      phone: data.phone || '13800138000',
      cooperationLevel: data.cooperationLevel || 'bronze',
      creditLimit: data.creditLimit || 100,
      tags: data.tags || ['test'],
      ownerUserId,
    },
  })
}

export async function createTestTask(
  distributorId: string,
  assignedUserId: string,
  creatorUserId: string,
  data: Partial<{
    title: string
    description: string
    deadline: Date
    priority: string
    status: string
  }> = {}
) {
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 7)

  return prisma.task.create({
    data: {
      distributorId,
      assignedUserId,
      creatorUserId,
      title: data.title || 'Test Task',
      description: data.description || 'Test task description',
      deadline: data.deadline || deadline,
      priority: data.priority || 'medium',
      status: data.status || 'pending',
    },
  })
}

export async function cleanDatabase() {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`)
      } catch {
        // Ignore errors
      }
    }
  }
}

export { prisma }
