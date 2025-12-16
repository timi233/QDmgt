import request from 'supertest'
import app from '../../src/app.js'
import {
  createTestUser,
  createTestDistributor,
  createTestTask,
  cleanDatabase,
  TestUser,
} from '../setup/testHelpers.js'

describe('Performance Tests', () => {
  let salesUser: TestUser
  let leaderUser: TestUser

  beforeAll(async () => {
    await cleanDatabase()
    salesUser = await createTestUser('sales', '_perf')
    leaderUser = await createTestUser('leader', '_perf')

    // Create test data for performance tests
    const distributors = []
    for (let i = 0; i < 100; i++) {
      const distributor = await createTestDistributor(salesUser.id, {
        name: `Perf Distributor ${i}`,
        region: `Region ${i % 10}/City/District`,
      })
      distributors.push(distributor)
    }

    // Create tasks
    for (let i = 0; i < 50; i++) {
      const distIndex = i % distributors.length
      await createTestTask(
        distributors[distIndex].id,
        salesUser.id,
        salesUser.id,
        { title: `Perf Task ${i}` }
      )
    }
  })

  describe('Response Time Requirements', () => {
    it('should load distributor list in under 2 seconds', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .get('/api/distributors')
        .set('Authorization', `Bearer ${salesUser.token}`)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(2000) // 2 seconds
      console.log(`Distributor list response time: ${responseTime}ms`)
    })

    it('should load task list in under 2 seconds', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${salesUser.token}`)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(2000)
      console.log(`Task list response time: ${responseTime}ms`)
    })

    it('should load dashboard KPI in under 3 seconds', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .get('/api/dashboard/kpi')
        .set('Authorization', `Bearer ${leaderUser.token}`)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(3000) // 3 seconds
      console.log(`Dashboard KPI response time: ${responseTime}ms`)
    })

    it('should perform search in under 500ms', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .get('/api/distributors?search=Perf')
        .set('Authorization', `Bearer ${salesUser.token}`)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(500) // 500ms
      console.log(`Search response time: ${responseTime}ms`)
    })

    it('should handle pagination efficiently', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .get('/api/distributors?page=5&limit=10')
        .set('Authorization', `Bearer ${salesUser.token}`)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(1000)
      console.log(`Pagination response time: ${responseTime}ms`)
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle 10 concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app)
            .get('/api/distributors')
            .set('Authorization', `Bearer ${salesUser.token}`)
        )

      const startTime = Date.now()
      const responses = await Promise.all(requests)
      const endTime = Date.now()

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(5000) // All 10 requests within 5 seconds
      console.log(`10 concurrent requests completed in: ${totalTime}ms`)
    })

    it('should handle mixed concurrent operations', async () => {
      const requests = [
        request(app)
          .get('/api/distributors')
          .set('Authorization', `Bearer ${salesUser.token}`),
        request(app)
          .get('/api/tasks')
          .set('Authorization', `Bearer ${salesUser.token}`),
        request(app)
          .get('/api/dashboard/kpi')
          .set('Authorization', `Bearer ${leaderUser.token}`),
        request(app)
          .get('/api/distributors?search=Perf')
          .set('Authorization', `Bearer ${salesUser.token}`),
      ]

      const startTime = Date.now()
      const responses = await Promise.all(requests)
      const endTime = Date.now()

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })

      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(3000)
      console.log(`Mixed concurrent requests completed in: ${totalTime}ms`)
    })
  })

  describe('Data Volume Stress Test', () => {
    it('should handle large page size', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .get('/api/distributors?limit=100')
        .set('Authorization', `Bearer ${salesUser.token}`)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(3000)
      console.log(`Large page size (100) response time: ${responseTime}ms`)
    })

    it('should create distributor quickly', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .post('/api/distributors')
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          name: 'Speed Test Distributor',
          region: 'Speed/Test/Region',
          contactPerson: 'Speed Test',
          phone: '13800138999',
        })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(201)
      expect(responseTime).toBeLessThan(1000)
      console.log(`Create distributor response time: ${responseTime}ms`)
    })
  })
})
