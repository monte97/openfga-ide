import { z } from 'zod'

export const queryParamsSchema = z.object({
  storeId: z.string().trim().min(1),
})

export const checkBodySchema = z.object({
  user: z.string().trim().min(1),
  relation: z.string().trim().min(1),
  object: z.string().trim().min(1),
})

export const listObjectsBodySchema = z.object({
  user: z.string().trim().min(1),
  relation: z.string().trim().min(1),
  type: z.string().trim().min(1),
})

export const listUsersBodySchema = z.object({
  object: z.object({
    type: z.string().trim().min(1),
    id: z.string().trim().min(1),
  }),
  relation: z.string().trim().min(1),
})

export const expandBodySchema = z.object({
  relation: z.string().trim().min(1),
  object: z.string().trim().min(1),
})
