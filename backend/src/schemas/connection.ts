import { z } from 'zod'

export const testConnectionSchema = z.object({
  url: z.string().url(),
})

export const updateConnectionSchema = z.object({
  url: z.string().url(),
})
