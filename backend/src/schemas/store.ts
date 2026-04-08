import { z } from 'zod'

export const createStoreSchema = z.object({
  name: z.string().trim().min(1).max(256),
})
