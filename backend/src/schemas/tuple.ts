import { z } from 'zod'

export const tupleParamsSchema = z.object({
  storeId: z.string().trim().min(1),
})

export const tupleQuerySchema = z.object({
  type: z.string().optional(),
  relation: z.string().optional(),
  user: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  continuationToken: z.string().optional(),
})

export const tupleBodySchema = z.object({
  user: z.string().trim().min(1),
  relation: z.string().trim().min(1),
  object: z.string().trim().min(1),
})

export const tupleBatchDeleteSchema = z.object({
  deletes: z.array(tupleBodySchema).min(1).max(100),
})
