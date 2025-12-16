import { execSync } from 'child_process'
import dotenv from 'dotenv'
import path from 'path'

export default async function globalSetup() {
  // Load test environment variables
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })

  // Set test database URL
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/channel_test'
  process.env.NODE_ENV = 'test'

  console.log('Global setup: Preparing test database...')

  try {
    // Reset and migrate test database
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'inherit',
      env: { ...process.env },
    })

    console.log('Test database prepared successfully')
  } catch (error) {
    console.error('Failed to prepare test database:', error)
    throw error
  }
}
