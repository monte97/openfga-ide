import { z } from 'zod'

export const queryParamsSchema = z.object({
  storeId: z.string().min(1),
})

export const checkBodySchema = z.object({
  user: z.string().min(1),
  relation: z.string().min(1),
  object: z.string().min(1),
})

export const listObjectsBodySchema = z.object({
  user: z.string().min(1),
  relation: z.string().min(1),
  type: z.string().min(1),
})

export const listUsersBodySchema = z.object({
  object: z.object({
    type: z.string().min(1),
    id: z.string().min(1),
  }),
  relation: z.string().min(1),
})

export const expandBodySchema = z.object({
  relation: z.string().min(1),
  object: z.string().min(1),
})
