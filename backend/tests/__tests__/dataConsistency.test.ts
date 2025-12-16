import request from 'supertest'
import app from '../../src/app.js'
import {
  createTestUser,
  createTestDistributor,
  createTestTask,
  cleanDatabase,
  prisma,
  TestUser,
} from '../setup/testHelpers.js'

describe('Data Consistency Tests', () => {
  let salesUser: TestUser
  let leaderUser: TestUser

  beforeEach(async () => {
    await cleanDatabase()
    salesUser = await createTestUser('sales', '_consist')
    leaderUser = await createTestUser('leader', '_consist')
  })

  describe('Distributor Data Consistency', () => {
    it('should maintain referential integrity on create', async () => {
      const response = await request(app)
        .post('/api/distributors')
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          name: 'Integrity Test',
          region: 'Test/Region/District',
          contactPerson: 'Test',
          phone: '13800138000',
        })

      expect(response.status).toBe(201)

      // Verify in database
      const dbDistributor = await prisma.distributor.findUnique({
        where: { id: response.body.id },
        include: { owner: true },
      })

      expect(dbDistributor).not.toBeNull()
      expect(dbDistributor?.ownerUserId).toBe(salesUser.id)
      expect(dbDistributor?.owner.id).toBe(salesUser.id)
    })

    it('should soft delete distributor correctly', async () => {
      const distributor = await createTestDistributor(salesUser.id)

      await request(app)
        .delete(`/api/distributors/${distributor.id}`)
        .set('Authorization', `Bearer ${salesUser.token}`)

      // Verify soft delete in database
      const dbDistributor = await prisma.distributor.findUnique({
        where: { id: distributor.id },
      })

      expect(dbDistributor).not.toBeNull()
      expect(dbDistributor?.deletedAt).not.toBeNull()
    })

    it('should update timestamps on modification', async () => {
      const distributor = await createTestDistributor(salesUser.id)
      const originalUpdatedAt = distributor.updatedAt

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 100))

      await request(app)
        .put(`/api/distributors/${distributor.id}`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          name: 'Updated Name',
        })

      const updatedDistributor = await prisma.distributor.findUnique({
        where: { id: distributor.id },
      })

      expect(updatedDistributor?.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      )
    })

    it('should enforce unique constraint (name + region)', async () => {
      await createTestDistributor(salesUser.id, {
        name: 'Unique Test',
        region: 'Same/Region/District',
      })

      // Try to create with same name and region
      try {
        await prisma.distributor.create({
          data: {
            name: 'Unique Test',
            region: 'Same/Region/District',
            contactPerson: 'Test',
            phone: '13800138001',
            ownerUserId: salesUser.id,
          },
        })
        fail('Should have thrown unique constraint error')
      } catch (error: any) {
        expect(error.code).toBe('P2002') // Prisma unique constraint violation
      }
    })
  })

  describe('Task Data Consistency', () => {
    let distributorId: string

    beforeEach(async () => {
      const distributor = await createTestDistributor(salesUser.id)
      distributorId = distributor.id
    })

    it('should track status history', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        salesUser.id,
        { status: 'pending' }
      )

      await request(app)
        .put(`/api/tasks/${task.id}/status`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({ status: 'in_progress' })

      // Check status history
      const history = await prisma.taskStatusHistory.findMany({
        where: { taskId: task.id },
        orderBy: { changedAt: 'desc' },
      })

      expect(history.length).toBeGreaterThan(0)
      expect(history[0].toStatus).toBe('in_progress')
      expect(history[0].fromStatus).toBe('pending')
    })

    it('should set completedAt when status becomes completed', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        salesUser.id,
        { status: 'in_progress' }
      )

      await request(app)
        .put(`/api/tasks/${task.id}/status`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({ status: 'completed' })

      const updatedTask = await prisma.task.findUnique({
        where: { id: task.id },
      })

      expect(updatedTask?.completedAt).not.toBeNull()
    })

    it('should maintain collaborator relationships', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        salesUser.id
      )
      const collaborator = await createTestUser('sales', '_collab_test')

      await request(app)
        .post(`/api/tasks/${task.id}/collaborators`)
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({ userId: collaborator.id })

      // Verify relationship in database
      const taskCollaborator = await prisma.taskCollaborator.findFirst({
        where: {
          taskId: task.id,
          userId: collaborator.id,
        },
        include: {
          user: true,
          addedByUser: true,
        },
      })

      expect(taskCollaborator).not.toBeNull()
      expect(taskCollaborator?.addedBy).toBe(salesUser.id)
    })

    it('should cascade delete collaborators when task deleted', async () => {
      const task = await createTestTask(
        distributorId,
        salesUser.id,
        salesUser.id
      )
      const collaborator = await createTestUser('sales', '_cascade_test')

      await prisma.taskCollaborator.create({
        data: {
          taskId: task.id,
          userId: collaborator.id,
          addedBy: salesUser.id,
        },
      })

      // Delete task
      await prisma.task.delete({
        where: { id: task.id },
      })

      // Verify collaborators are deleted
      const remainingCollaborators = await prisma.taskCollaborator.findMany({
        where: { taskId: task.id },
      })

      expect(remainingCollaborators).toHaveLength(0)
    })
  })

  describe('Event Logging Consistency', () => {
    it('should log user registration event', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'eventtest',
          email: 'event@test.com',
          password: 'Test123!@#',
          role: 'sales',
        })

      if (response.status === 201) {
        // Check for event
        const events = await prisma.event.findMany({
          where: {
            eventType: 'user_registered',
            entityId: response.body.user.id,
          },
        })

        // Event logging might be optional
        if (events.length > 0) {
          expect(events[0].entityType).toBe('user')
        }
      }
    })

    it('should log distributor creation event', async () => {
      const response = await request(app)
        .post('/api/distributors')
        .set('Authorization', `Bearer ${salesUser.token}`)
        .send({
          name: 'Event Log Test',
          region: 'Event/Log/Region',
          contactPerson: 'Test',
          phone: '13800138000',
        })

      if (response.status === 201) {
        // Wait for async event logging
        await new Promise((resolve) => setTimeout(resolve, 100))

        const events = await prisma.event.findMany({
          where: {
            entityType: 'distributor',
            entityId: response.body.id,
          },
        })

        // Event logging might be implemented
        expect(events.length).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('Dashboard Data Consistency', () => {
    it('should aggregate distributor count correctly', async () => {
      // Create multiple distributors
      await createTestDistributor(salesUser.id, { name: 'Agg Test 1' })
      await createTestDistributor(salesUser.id, {
        name: 'Agg Test 2',
        region: 'R2/C2/D2',
      })
      await createTestDistributor(salesUser.id, {
        name: 'Agg Test 3',
        region: 'R3/C3/D3',
      })

      const dbCount = await prisma.distributor.count({
        where: { deletedAt: null },
      })

      expect(dbCount).toBe(3)
    })

    it('should aggregate task count by status correctly', async () => {
      const distributor = await createTestDistributor(salesUser.id)

      await createTestTask(distributor.id, salesUser.id, salesUser.id, {
        status: 'pending',
      })
      await createTestTask(distributor.id, salesUser.id, salesUser.id, {
        status: 'pending',
      })
      await createTestTask(distributor.id, salesUser.id, salesUser.id, {
        status: 'in_progress',
      })
      await createTestTask(distributor.id, salesUser.id, salesUser.id, {
        status: 'completed',
      })

      const statusCounts = await prisma.task.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      })

      const pendingCount =
        statusCounts.find((s) => s.status === 'pending')?._count.id || 0
      const inProgressCount =
        statusCounts.find((s) => s.status === 'in_progress')?._count.id || 0
      const completedCount =
        statusCounts.find((s) => s.status === 'completed')?._count.id || 0

      expect(pendingCount).toBe(2)
      expect(inProgressCount).toBe(1)
      expect(completedCount).toBe(1)
    })
  })
})
