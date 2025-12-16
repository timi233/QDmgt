import { z } from 'zod'

// Create resource schema
export const createResourceSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().optional(),
    category: z.enum(['product_doc', 'sales_kit', 'case_study', 'policy', 'video', 'whitepaper'], {
      errorMap: () => ({ message: 'Invalid category' }),
    }),
    fileUrl: z.string().url('Invalid file URL'),
    fileSize: z.number().int().positive().optional(),
    fileType: z.string().optional(),
    storageType: z.enum(['url', 'upload']).default('url'),
    thumbnailUrl: z.string().url().optional(),
    keywords: z.string().optional(), // Comma-separated keywords
    accessLevel: z.enum(['all', 'gold', 'silver', 'bronze', 'platinum']).default('all'),
    isActive: z.boolean().default(true),
    publishedAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid published date',
      })
      .optional(),
  }),
})

// Update resource schema
export const updateResourceSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    category: z.enum(['product_doc', 'sales_kit', 'case_study', 'policy', 'video', 'whitepaper']).optional(),
    fileUrl: z.string().url().optional(),
    fileSize: z.number().int().positive().optional(),
    fileType: z.string().optional(),
    storageType: z.enum(['url', 'upload']).optional(),
    thumbnailUrl: z.string().url().optional(),
    keywords: z.string().optional(),
    accessLevel: z.enum(['all', 'gold', 'silver', 'bronze', 'platinum']).optional(),
    isActive: z.boolean().optional(),
    publishedAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid published date',
      })
      .optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid resource ID'),
  }),
})

// Get resources query schema
export const getResourcesSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
    category: z.enum(['product_doc', 'sales_kit', 'case_study', 'policy', 'video', 'whitepaper']).optional(),
    accessLevel: z.enum(['all', 'gold', 'silver', 'bronze', 'platinum']).optional(),
    isActive: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
    search: z.string().optional(), // Search in title, description, keywords
  }),
})

// Resource ID parameter schema
export const resourceIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid resource ID'),
  }),
})

// Track download/view schema
export const trackActionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid resource ID'),
  }),
})

// Type exports
export type CreateResourceBody = z.infer<typeof createResourceSchema>['body']
export type UpdateResourceBody = z.infer<typeof updateResourceSchema>['body']
export type UpdateResourceParams = z.infer<typeof updateResourceSchema>['params']
export type GetResourcesQuery = z.infer<typeof getResourcesSchema>['query']
export type ResourceIdParam = z.infer<typeof resourceIdSchema>['params']
export type TrackActionParam = z.infer<typeof trackActionSchema>['params']
