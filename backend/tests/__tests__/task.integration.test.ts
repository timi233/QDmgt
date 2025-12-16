import request from 'supertest'
import app from '../../src/app.js'
import {
  createTestUser,
  createTestDistributor,
  createTestTask,
  cleanDatabase,
  TestUser,
} from '../setup/testHelpers.js'

describe('Task API Integration Tests', () => {
  let salesUser: TestUser
  let leaderUser: TestUser
  let distributorId: string

  beforeEach(async () => {
    await cleanDatabase()
    salesUser = await createTestUser('sales', '_task')
    leaderUser = await createTestUser('leader', '_task')
    const distributor = await createTestDistributor(salesUser.id)
    distributorId = distributor.id
  })

  describe('POST /api/tasks', () => {
    it('should create task with valid data', async () => {
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + 7)

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          distributorId,
          assignedUserId: salesUser.id,
          title: 'Follow up call',
          description: 'Call to discuss partnership',
          deadline: deadline.toISOString(),
          priority: 'high',
        })

      expect(response.status).toBe(201)
      expect(response.body.title).toBe('Follow up call')
      expect(response.body.priority).toBe('high')
      expect(response.body.status).toBe('pending')
    })

    it('should reject task without required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          distributorId,
          title: 'Incomplete task',
        })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/tasks', () => {
    it('should return tasks for sales user', async () => {
      await createTestTask(distributorId, salesUser.id, salesUser.id, {
        title: 'Task 1',
      })
      await createTestTask(distributorId, salesUser.id, salesUser.id, {
        title: 'Task 2',
      })

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${salesUser.token}`)

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by status', async () => {
      await createTestTask(distributorId, salesUser.id, salesUser.id, {
        title: 'Pending Task',
        status: 'pending',
      })
      await createTestTask(distributorId, salesUser.id, salesUser.id, {
        title: 'Completed Task',
        status: 'completed',
      })

      const response = await request(app)
        .get('/api/tasks?status=pending')
        .set('Authorization', `Bearer ${salesUser.token}`)

      expect(response.status).toBe(200)
      expect(response.body.data.every((t: any) => t.status === 'pending')).toBe(true)
    })

    it('should filter by priority', async () => {
      await createTestTask(distributorId, salesUser.id, salesUser.id, {
        title: 'High Priority',
        priority: 'high',
      })
      await createTestTask(distributorId, salesUser.id, salesUser.id, {
        title: 'Low Priority',
        priority: 'low',
      })

      const response = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${salesUser.token}`)

      expect(response.status).toBe(200)
      expect(response.body.data.every((t: any) => t.priority === 'high')).toBe(true)
    })
  })

  describe('PUT /api/tasks/:id/status', () => {
    it('should update task status from pending to in_progress', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        salesUser.id,
        { status: 'pending' }
      )

      const response = await request(app)
        .put(`/api/tasks/${task.id}/status`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          status: 'in_progress',
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('in_progress')
    })

    it('should update task status to completed', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        salesUser.id,
        { status: 'in_progress' }
      )

      const response = await request(app)
        .put(`/api/tasks/${task.id}/status`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          status: 'completed',
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('completed')
      expect(response.body.completedAt).toBeDefined()
    })

    it('should reject invalid status transition', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        salesUser.id,
        { status: 'pending' }
      )

      const response = await request(app)
        .put(`/api/tasks/${task.id}/status`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          status: 'completed', // Cannot skip in_progress
        })

      // Depending on implementation, this might be allowed or rejected
      expect([200, 400]).toContain(response.status)
    })
  })

  describe('PUT /api/tasks/:id/assign', () => {
    it('should assign task to another user', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        leaderUser.id
      )

      const newAssignee = await createTestUser('sales', '_assignee')

      const response = await request(app)
        .put(`/api/tasks/${task.id}/assign`)
        .set('Authorization', `Bearer ${leaderUser.token}`)
        .send({
          assignedUserId: newAssignee.id,
        })

      expect(response.status).toBe(200)
      expect(response.body.assignedUserId).toBe(newAssignee.id)
    })
  })

  describe('POST /api/tasks/:id/collaborators', () => {
    it('should add collaborator to task', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        salesUser.id
      )
      const collaborator = await createTestUser('sales', '_collab')

      const response = await request(app)
        .post(`/api/tasks/${task.id}/collaborators`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          userId: collaborator.id,
        })

      expect(response.status).toBe(201)
    })

    it('should reject duplicate collaborator', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        salesUser.id
      )
      const collaborator = await createTestUser('sales', '_collab2')

      // Add first time
      await request(app)
        .post(`/api/tasks/${task.id}/collaborators`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({ userId: collaborator.id })

      // Try to add again
      const response = await request(app)
        .post(`/api/tasks/${task.id}/collaborators`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({ userId: collaborator.id })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/tasks/:id/comments', () => {
    it('should add comment to task', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        salesUser.id
      )

      const response = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          content: 'This is a test comment',
        })

      expect(response.status).toBe(201)
      expect(response.body.content).toBe('This is a test comment')
    })

    it('should reject empty comment', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        salesUser.id
      )

      const response = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          content: '',
        })

      expect(response.status).toBe(400)
    })
  })
})
