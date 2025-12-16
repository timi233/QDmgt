import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Increase timeout for database operations
jest.setTimeout(30000)

beforeAll(async () => {
  // Connect to database
  await prisma.$connect()
})

afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect()
})

// Clean database between test suites
afterEach(async () => {
  // Clean up in correct order due to foreign keys
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`)
      } catch (error) {
        // Ignore errors for tables that might not exist
      }
    }
  }
})

export { prisma }
