import { z } from 'zod'

// Create certification schema
export const createCertificationSchema = z.object({
  body: z.object({
    distributorId: z.string().uuid('Invalid distributor ID'),
    certType: z.string().min(1, 'Certification type is required'),
    certName: z.string().min(1, 'Certification name is required').max(200, 'Name too long'),
    level: z.enum(['gold', 'silver', 'bronze'], {
      errorMap: () => ({ message: 'Invalid level' }),
    }),
    obtainedDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid obtained date',
    }),
    expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid expiry date',
    }),
    status: z.enum(['valid', 'expired', 'pending', 'revoked']).default('valid'),
    examScore: z.number().min(0).max(100).optional(),
    examDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid exam date',
      })
      .optional(),
    certificateUrl: z.string().url().optional(),
    notes: z.string().optional(),
  }),
})

// Update certification schema
export const updateCertificationSchema = z.object({
  body: z.object({
    certName: z.string().min(1).max(200).optional(),
    level: z.enum(['gold', 'silver', 'bronze']).optional(),
    obtainedDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid obtained date',
      })
      .optional(),
    expiryDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid expiry date',
      })
      .optional(),
    status: z.enum(['valid', 'expired', 'pending', 'revoked']).optional(),
    examScore: z.number().min(0).max(100).optional(),
    examDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid exam date',
      })
      .optional(),
    certificateUrl: z.string().url().optional(),
    notes: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid certification ID'),
  }),
})

// Get certifications query schema
export const getCertificationsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    distributorId: z.string().uuid('Invalid distributor ID').optional(),
    certType: z.string().optional(),
    level: z.enum(['gold', 'silver', 'bronze']).optional(),
    status: z.enum(['valid', 'expired', 'pending', 'revoked']).optional(),
    expiringDays: z.string().regex(/^\d+$/).transform(Number).optional(), // Get certs expiring in X days
  }),
})

// Certification ID parameter schema
export const certificationIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid certification ID'),
  }),
})

// Type exports
export type CreateCertificationBody = z.infer<typeof createCertificationSchema>['body']
export type UpdateCertificationBody = z.infer<typeof updateCertificationSchema>['body']
export type UpdateCertificationParams = z.infer<typeof updateCertificationSchema>['params']
export type GetCertificationsQuery = z.infer<typeof getCertificationsSchema>['query']
export type CertificationIdParam = z.infer<typeof certificationIdSchema>['params']
