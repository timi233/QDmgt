import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function createAdmin() {
  const hash = await bcrypt.hash('adminadmin', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: hash,
      name: '系统管理员',
      role: 'admin',
      status: 'approved',
      requirePasswordChange: true
    }
  })
  console.log('✅ Admin user created:', admin.username)
  await prisma.$disconnect()
}

createAdmin().catch((e) => {
  console.error(e)
  process.exit(1)
})
