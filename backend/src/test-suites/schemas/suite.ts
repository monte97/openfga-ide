import { z } from 'zod'

const testCaseSchema = z.object({
  user: z.string().min(1),
  relation: z.string().min(1),
  object: z.string().min(1),
  expected: z.boolean(),
  meta: z
    .object({
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      severity: z.enum(['critical', 'warning', 'info']).optional(),
    })
    .optional(),
})

const testGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  testCases: z.array(testCaseSchema).max(500),
})

const suiteFixtureSchema = z.object({
  model: z.unknown().optional(),
  tuples: z.array(z.unknown()).optional(),
})

const suiteDefinitionSchema = z.object({
  fixture: suiteFixtureSchema.optional(),
  groups: z.array(testGroupSchema).max(100),
})

export const createSuiteSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  definition: suiteDefinitionSchema.optional(),
})

export const updateSuiteSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  definition: suiteDefinitionSchema.optional(),
})

export type CreateSuiteBody = z.infer<typeof createSuiteSchema>
export type UpdateSuiteBody = z.infer<typeof updateSuiteSchema>
