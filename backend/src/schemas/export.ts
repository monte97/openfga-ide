import { z } from 'zod'

export const exportParamsSchema = z.object({
  storeId: z.string().trim().min(1),
})
