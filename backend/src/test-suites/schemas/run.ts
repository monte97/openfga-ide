import { z } from 'zod'

export const triggerRunParamsSchema = z.object({
  suiteId: z.string().uuid({ message: 'suiteId must be a valid UUID' }),
})

export const runIdParamsSchema = z.object({
  runId: z.string().uuid({ message: 'runId must be a valid UUID' }),
})

export type TriggerRunParams = z.infer<typeof triggerRunParamsSchema>
export type RunIdParams = z.infer<typeof runIdParamsSchema>
