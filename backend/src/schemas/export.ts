import { z } from 'zod'

export const exportParamsSchema = z.object({
  storeId: z.string().min(1),
})
