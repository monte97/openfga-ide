import { z } from 'zod'

const tupleKeySchema = z.object({
  user: z.string().trim().min(1),
  relation: z.string().trim().min(1),
  object: z.string().trim().min(1),
})

export const importBodySchema = z.object({
  storeName: z.string().trim().min(1).max(256).optional(),
  model: z.unknown().nullable(),
  tuples: z.array(tupleKeySchema),
})

export const importNewStoreBodySchema = z.object({
  storeName: z.string().trim().min(1).max(256),
  model: z.unknown().nullable(),
  tuples: z.array(tupleKeySchema),
})

export const importParamsSchema = z.object({
  storeId: z.string().trim().min(1),
})
