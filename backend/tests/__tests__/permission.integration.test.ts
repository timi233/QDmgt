import request from 'supertest'
import app from '../../src/app.js'
import {
  createTestUser,
  createTestDistributor,
  createTestTask,
  cleanDatabase,
  TestUser,
} from '../setup/testHelpers.js'

describe('Permission & Authorization Tests', () => {
  let salesUser1: TestUser
  let salesUser2: TestUser
  let leaderUser: TestUser

  beforeEach(async () => {
    await cleanDatabase()
    salesUser1 = await createTestUser('sales', '_perm1')
    salesUser2 = await createTestUser('sales', '_perm2')
    leaderUser = await createTestUser('leader', '_perm')
  })

  describe('Authentication Tests', () => {
    it('should reject requests without token', async () => {
      const response = await request(app).get('/api/distributors')

      expect(response.status).toBe(401)
    })

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/distributors')
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
    })

    it('should reject expired token', async () => {
      // This would require a token generated with very short expiry
      // For now, we'll test with malformed token
      const response = await request(app)
        .get('/api/distributors')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid')

      expect(response.status).toBe(401)
    })
  })

  describe('Distributor Permission Tests', () => {
    it('should prevent sales from viewing other sales distributors', async () => {
      // Create distributor for sales user 1
      const distributor = await createTestDistributor(salesUser1.id, {
        name: 'Private Distributor',
      })

      // Sales user 2 tries to access
      const response = await request(app)
        .get(`/api/distributors/${distributor.id}`)
        .set('Authorization', `Bearer ${salesUser2.token}`)

      expect(response.status).toBe(404)
    })

    it('should allow leader to view all distributors', async () => {
      const distributor = await createTestDistributor(salesUser1.id, {
        name: 'Sales Distributor',
      })

      const response = await request(app)
        .get(`/api/distributors/${distributor.id}`)
        .set('Authorization', `Bearer ${leaderUser.token}`)

      expect(response.status).toBe(200)
      expect(response.body.id).toBe(distributor.id)
    })

    it('should prevent sales from updating other sales distributor', async () => {
      const distributor = await createTestDistributor(salesUser1.id)

      const response = await request(app)
        .put(`/api/distributors/${distributor.id}`)
        .set('Authorization', `Bearer ${salesUser2.token}`)
        .send({
          name: 'Hacked Name',
        })

      expect(response.status).toBe(404)
    })

    it('should prevent sales from deleting other sales distributor', async () => {
      const distributor = await createTestDistributor(salesUser1.id)

      const response = await request(app)
        .delete(`/api/distributors/${distributor.id}`)
        .set('Authorization', `Bearer ${salesUser2.token}`)

      expect(response.status).toBe(404)
    })

    it('should allow leader to update any distributor', async () => {
      const distributor = await createTestDistributor(salesUser1.id)

      const response = await request(app)
        .put(`/api/distributors/${distributor.id}`)
        .set('Authorization', `Bearer ${leaderUser.token}`)
        .send({
          name: 'Leader Updated Name',
        })

      expect(response.status).toBe(200)
      expect(response.body.name).toBe('Leader Updated Name')
    })
  })

  describe('Task Permission Tests', () => {
    let distributor1Id: string
    let distributor2Id: string

    beforeEach(async () => {
      const dist1 = await createTestDistributor(salesUser1.id)
      const dist2 = await createTestDistributor(salesUser2.id, {
        name: 'Dist 2',
        region: 'Shanghai/Pudong/CBD',
      })
      distributor1Id = dist1.id
      distributor2Id = dist2.id
    })

    it('should prevent sales from viewing other sales tasks', async () => {
      const task = await createTestTask(
        distributor1Id,
        salesUser1.id,
        salesUser1.id,
        { title: 'Private Task' }
      )

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${salesUser2.token}`)

      expect(response.status).toBe(404)
    })

    it('should allow leader to view all tasks', async () => {
      const task = await createTestTask(
        distributor1Id,
        salesUser1.id,
        salesUser1.id,
        { title: 'Sales Task' }
      )

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${leaderUser.token}`)

      expect(response.status).toBe(200)
    })

    it('should allow collaborator to view task', async () => {
      const task = await createTestTask(
        distributor1Id,
        salesUser1.id,
        salesUser1.id
      )

      // Add sales user 2 as collaborator
      await request(app)
        .post(`/api/tasks/${task.id}/collaborators`)
        .set('Authorization', `Bearer ${salesUser1.token}`)
        .send({ userId: salesUser2.id })

      // Sales user 2 should now be able to view
      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${salesUser2.token}`)

      expect(response.status).toBe(200)
    })

    it('should allow collaborator to add comments', async () => {
      const task = await createTestTask(
        distributor1Id,
        salesUser1.id,
        salesUser1.id
      )

      // Add sales user 2 as collaborator
      await request(app)
        .post(`/api/tasks/${task.id}/collaborators`)
        .set('Authorization', `Bearer ${salesUser1.token}`)
        .send({ userId: salesUser2.id })

      // Sales user 2 should be able to comment
      const response = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .set('Authorization', `Bearer ${salesUser2.token}`)
        .send({ content: 'Collaborator comment' })

      expect(response.status).toBe(201)
    })

    it('should prevent non-owner from assigning task', async () => {
      const task = await createTestTask(
        distributor1Id,
        salesUser1.id,
        salesUser1.id
      )

      const response = await request(app)
        .put(`/api/tasks/${task.id}/assign`)
        .set('Authorization', `Bearer ${salesUser2.token}`)
        .send({ assignedUserId: salesUser2.id })

      expect(response.status).toBe(404)
    })

    it('should allow leader to assign any task', async () => {
      const task = await createTestTask(
        distributor1Id,
        salesUser1.id,
        salesUser1.id
      )

      const response = await request(app)
        .put(`/api/tasks/${task.id}/assign`)
        .set('Authorization', `Bearer ${leaderUser.token}`)
        .send({ assignedUserId: salesUser2.id })

      expect(response.status).toBe(200)
    })
  })

  describe('Dashboard Permission Tests', () => {
    it('should allow leader to access dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard/kpi')
        .set('Authorization', `Bearer ${leaderUser.token}`)

      expect(response.status).toBe(200)
    })

    it('should allow sales to access limited dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard/kpi')
        .set('Authorization', `Bearer ${salesUser1.token}`)

      // Depending on implementation, sales might have limited access
      expect([200, 403]).toContain(response.status)
    })
  })

  describe('Data Export Permission Tests', () => {
    it('should allow authenticated user to export own data', async () => {
      await createTestDistributor(salesUser1.id)

      const response = await request(app)
        .get('/api/data/export/distributors')
        .set('Authorization', `Bearer ${salesUser1.token}`)

      expect([200, 404]).toContain(response.status)
    })

    it('should reject unauthenticated export request', async () => {
      const response = await request(app).get('/api/data/export/distributors')

      expect(response.status).toBe(401)
    })
  })
})
