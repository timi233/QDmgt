import request from 'supertest'
import app from '../../src/app.js'
import {
  createTestUser,
  createTestDistributor,
  cleanDatabase,
  TestUser,
} from '../setup/testHelpers.js'

describe('Distributor API Integration Tests', () => {
  let salesUser: TestUser
  let leaderUser: TestUser

  beforeEach(async () => {
    await cleanDatabase()
    salesUser = await createTestUser('sales', '_dist')
    leaderUser = await createTestUser('leader', '_dist')
  })

  describe('POST /api/distributors', () => {
    it('should create distributor with valid data', async () => {
      const response = await request(app)
        .post('/api/distributors')
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          name: 'New Distributor',
          region: 'Shanghai/Pudong/Lujiazui',
          contactPerson: 'John Doe',
          phone: '13900139000',
          cooperationLevel: 'silver',
          creditLimit: 200,
          tags: ['new', 'priority'],
        })

      expect(response.status).toBe(201)
      expect(response.body.name).toBe('New Distributor')
      expect(response.body.region).toBe('Shanghai/Pudong/Lujiazui')
      expect(response.body.cooperationLevel).toBe('silver')
    })

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/distributors')
        .send({
          name: 'Test Distributor',
          region: 'Beijing/Chaoyang/CBD',
          contactPerson: 'Test',
          phone: '13800138000',
        })

      expect(response.status).toBe(401)
    })

    it('should reject duplicate name in same region', async () => {
      await createTestDistributor(salesUser.id, {
        name: 'Duplicate Test',
        region: 'Beijing/Chaoyang/CBD',
      })

      const response = await request(app)
        .post('/api/distributors')
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          name: 'Duplicate Test',
          region: 'Beijing/Chaoyang/CBD',
          contactPerson: 'Test',
          phone: '13800138001',
        })

      expect(response.status).toBe(400)
    })

    it('should allow same name in different region', async () => {
      await createTestDistributor(salesUser.id, {
        name: 'Same Name',
        region: 'Beijing/Chaoyang/CBD',
      })

      const response = await request(app)
        .post('/api/distributors')
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          name: 'Same Name',
          region: 'Shanghai/Pudong/Lujiazui',
          contactPerson: 'Test',
          phone: '13800138001',
        })

      expect(response.status).toBe(201)
    })

    it('should validate phone format', async () => {
      const response = await request(app)
        .post('/api/distributors')
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          name: 'Test Distributor',
          region: 'Beijing/Chaoyang/CBD',
          contactPerson: 'Test',
          phone: 'invalid-phone',
        })

      expect(response.status).toBe(400)
    })

    it('should limit tags to 5', async () => {
      const response = await request(app)
        .post('/api/distributors')
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          name: 'Test Distributor',
          region: 'Beijing/Chaoyang/CBD',
          contactPerson: 'Test',
          phone: '13800138000',
          tags: ['1', '2', '3', '4', '5', '6'],
        })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/distributors', () => {
    it('should return only own distributors for sales role', async () => {
      // Create distributor for sales user
      await createTestDistributor(salesUser.id, { name: 'Sales Distributor' })

      // Create distributor for another user
      const otherUser = await createTestUser('sales', '_other')
      await createTestDistributor(otherUser.id, { name: 'Other Distributor' })

      const response = await request(app)
        .get('/api/distributors')
        .set('Authorization', `Bearer ${salesUser.token}`)

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].name).toBe('Sales Distributor')
    })

    it('should return all distributors for leader role', async () => {
      await createTestDistributor(salesUser.id, { name: 'Distributor 1' })
      await createTestDistributor(leaderUser.id, { name: 'Distributor 2' })

      const response = await request(app)
        .get('/api/distributors')
        .set('Authorization', `Bearer ${leaderUser.token}`)

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBeGreaterThanOrEqual(2)
    })

    it('should support pagination', async () => {
      // Create multiple distributors
      for (let i = 0; i < 15; i++) {
        await createTestDistributor(salesUser.id, {
          name: `Distributor ${i}`,
          region: `Region ${i}/City/District`,
        })
      }

      const response = await request(app)
        .get('/api/distributors?page=1&limit=10')
        .set('Authorization', `Bearer ${salesUser.token}`)

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(10)
      expect(response.body.pagination.total).toBe(15)
    })

    it('should support search filter', async () => {
      await createTestDistributor(salesUser.id, { name: 'ABC Company' })
      await createTestDistributor(salesUser.id, {
        name: 'XYZ Corp',
        region: 'Shanghai/Pudong/CBD',
      })

      const response = await request(app)
        .get('/api/distributors?search=ABC')
        .set('Authorization', `Bearer ${salesUser.token}`)

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].name).toBe('ABC Company')
    })
  })

  describe('GET /api/distributors/:id', () => {
    it('should return distributor by id', async () => {
      const distributor = await createTestDistributor(salesUser.id)

      const response = await request(app)
        .get(`/api/distributors/${distributor.id}`)
        .set('Authorization', `Bearer ${salesUser.token}`)

      expect(response.status).toBe(200)
      expect(response.body.id).toBe(distributor.id)
    })

    it('should return 404 for non-existent distributor', async () => {
      const response = await request(app)
        .get('/api/distributors/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${salesUser.token}`)

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/distributors/:id', () => {
    it('should update distributor', async () => {
      const distributor = await createTestDistributor(salesUser.id)

      const response = await request(app)
        .put(`/api/distributors/${distributor.id}`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          name: 'Updated Distributor',
          creditLimit: 500,
        })

      expect(response.status).toBe(200)
      expect(response.body.name).toBe('Updated Distributor')
      expect(response.body.creditLimit).toBe(500)
    })
  })

  describe('DELETE /api/distributors/:id', () => {
    it('should soft delete distributor', async () => {
      const distributor = await createTestDistributor(salesUser.id)

      const response = await request(app)
        .delete(`/api/distributors/${distributor.id}`)
        .set('Authorization', `Bearer ${salesUser.token}`)

      expect(response.status).toBe(200)

      // Verify soft delete
      const getResponse = await request(app)
        .get(`/api/distributors/${distributor.id}`)
        .set('Authorization', `Bearer ${salesUser.token}`)

      expect(getResponse.status).toBe(404)
    })
  })
})
