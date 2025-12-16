import request from 'supertest'
import app from '../../src/app.js'
import { prisma, cleanDatabase } from '../setup/testHelpers.js'
import bcrypt from 'bcrypt'

describe('Auth API Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test123!@#',
          name: 'Test User',
          role: 'sales',
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('token')
      expect(response.body.user).toHaveProperty('id')
      expect(response.body.user.username).toBe('testuser')
      expect(response.body.user.email).toBe('test@example.com')
      expect(response.body.user.role).toBe('sales')
    })

    it('should reject duplicate username', async () => {
      // Create first user
      await prisma.user.create({
        data: {
          username: 'existinguser',
          email: 'existing@example.com',
          passwordHash: await bcrypt.hash('Test123!@#', 10),
          role: 'sales',
        },
      })

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: 'new@example.com',
          password: 'Test123!@#',
          role: 'sales',
        })

      expect(response.status).toBe(400)
    })

    it('should reject duplicate email', async () => {
      await prisma.user.create({
        data: {
          username: 'user1',
          email: 'duplicate@example.com',
          passwordHash: await bcrypt.hash('Test123!@#', 10),
          role: 'sales',
        },
      })

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'duplicate@example.com',
          password: 'Test123!@#',
          role: 'sales',
        })

      expect(response.status).toBe(400)
    })

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'Test123!@#',
          role: 'sales',
        })

      expect(response.status).toBe(400)
    })

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: '123',
          role: 'sales',
        })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await prisma.user.create({
        data: {
          username: 'loginuser',
          email: 'login@example.com',
          passwordHash: await bcrypt.hash('Test123!@#', 10),
          name: 'Login User',
          role: 'sales',
        },
      })
    })

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'loginuser',
          password: 'Test123!@#',
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token')
      expect(response.body.user.username).toBe('loginuser')
    })

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'loginuser',
          password: 'wrongpassword',
        })

      expect(response.status).toBe(401)
    })

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'Test123!@#',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'logoutuser',
          email: 'logout@example.com',
          passwordHash: await bcrypt.hash('Test123!@#', 10),
          role: 'sales',
        },
      })

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'logoutuser',
          password: 'Test123!@#',
        })

      const token = loginResponse.body.token

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
    })
  })
})
