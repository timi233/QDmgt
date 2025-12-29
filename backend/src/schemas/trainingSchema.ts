import { z } from 'zod'

// Create training schema - 匹配前端字段名和枚举值
export const createTrainingSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().optional(),
    trainingType: z.enum(['product', 'sales', 'technical', 'certification', 'compliance', 'other'], {
      errorMap: () => ({ message: 'Invalid training type' }),
    }),
    format: z.enum(['online', 'offline', 'video', 'hybrid'], {
      errorMap: () => ({ message: 'Invalid format' }),
    }),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid start date',
    }),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid end date',
      })
      .optional(),
    duration: z.number().int().min(0, 'Duration must be non-negative').default(0),
    location: z.string().optional(),
    // 支持前端字段名 instructor，同时保留后端字段名 instructorName
    instructor: z.string().optional(),
    instructorName: z.string().optional(),
    // 支持前端字段名 capacity，同时保留后端字段名 maxParticipants
    capacity: z.number().int().positive().optional(),
    maxParticipants: z.number().int().positive().optional(),
    // 支持前端字段名 materialsUrl，同时保留后端字段名 materials
    materialsUrl: z.string().optional(),
    materials: z.string().optional(),
    // 支持前端状态值 planned，同时保留后端值
    status: z.enum(['planned', 'scheduled', 'ongoing', 'completed', 'cancelled']).default('scheduled'),
  }),
})

// Update training schema - 匹配前端字段名和枚举值
export const updateTrainingSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    trainingType: z.enum(['product', 'sales', 'technical', 'certification', 'compliance', 'other']).optional(),
    format: z.enum(['online', 'offline', 'video', 'hybrid']).optional(),
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid start date',
      })
      .optional(),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid end date',
      })
      .optional(),
    duration: z.number().int().min(0).optional(),
    location: z.string().optional(),
    instructor: z.string().optional(),
    instructorName: z.string().optional(),
    capacity: z.number().int().positive().optional(),
    maxParticipants: z.number().int().positive().optional(),
    materialsUrl: z.string().optional(),
    materials: z.string().optional(),
    status: z.enum(['planned', 'scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid training ID'),
  }),
})

// Get trainings query schema
export const getTrainingsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    trainingType: z.enum(['product', 'sales', 'technical', 'certification', 'compliance', 'other']).optional(),
    format: z.enum(['online', 'offline', 'video', 'hybrid']).optional(),
    status: z.enum(['planned', 'scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid start date',
      })
      .optional(),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid end date',
      })
      .optional(),
  }),
})

// Training ID parameter schema
export const trainingIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid training ID'),
  }),
})

// Register participant schema
export const registerParticipantSchema = z.object({
  body: z.object({
    trainingId: z.string().uuid('Invalid training ID'),
    distributorId: z.string().uuid('Invalid distributor ID'),
    status: z.enum(['registered', 'confirmed', 'completed', 'absent', 'cancelled']).default('registered'),
  }),
})

// Update participant schema
export const updateParticipantSchema = z.object({
  body: z.object({
    status: z.enum(['registered', 'confirmed', 'completed', 'absent', 'cancelled']).optional(),
    attendanceStatus: z.enum(['present', 'absent', 'late']).optional(),
    examScore: z.number().min(0).max(100).optional(),
    feedback: z.string().optional(),
    certificateIssued: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid participant ID'),
  }),
})

// Get participants query schema
export const getParticipantsSchema = z.object({
  query: z.object({
    trainingId: z.string().uuid('Invalid training ID').optional(),
    distributorId: z.string().uuid('Invalid distributor ID').optional(),
    status: z.enum(['registered', 'confirmed', 'completed', 'absent', 'cancelled']).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  }),
})

// Type exports
export type CreateTrainingBody = z.infer<typeof createTrainingSchema>['body']
export type UpdateTrainingBody = z.infer<typeof updateTrainingSchema>['body']
export type UpdateTrainingParams = z.infer<typeof updateTrainingSchema>['params']
export type GetTrainingsQuery = z.infer<typeof getTrainingsSchema>['query']
export type TrainingIdParam = z.infer<typeof trainingIdSchema>['params']
export type RegisterParticipantBody = z.infer<typeof registerParticipantSchema>['body']
export type UpdateParticipantBody = z.infer<typeof updateParticipantSchema>['body']
export type UpdateParticipantParams = z.infer<typeof updateParticipantSchema>['params']
export type GetParticipantsQuery = z.infer<typeof getParticipantsSchema>['query']
