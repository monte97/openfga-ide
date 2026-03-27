import { z } from 'zod'

export const modelParamsSchema = z.object({
  storeId: z.string().min(1),
})
