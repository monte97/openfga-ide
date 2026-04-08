import { z } from 'zod'

export const testConnectionSchema = z.object({
  url: z.string().url(),
})

export const updateConnectionSchema = z.object({
  url: z.string().url(),
})

export type TestConnectionBody = z.infer<typeof testConnectionSchema>
export type UpdateConnectionBody = z.infer<typeof updateConnectionSchema>
