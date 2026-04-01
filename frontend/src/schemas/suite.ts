import { z } from 'zod'

const testCaseSchema = z.object({
  user: z.string().min(1, 'User must be non-empty'),
  relation: z.string().min(1, 'Relation must be non-empty'),
  object: z.string().min(1, 'Object must be non-empty'),
  expected: z.boolean(),
  meta: z.object({
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    severity: z.enum(['critical', 'warning', 'info']).optional(),
  }).optional(),
})

const testGroupSchema = z.object({
  name: z.string().min(1, 'Group name must be non-empty'),
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

export const importSuiteSchema = z.object({
  name: z.string().min(1, 'Suite name is required').max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  definition: suiteDefinitionSchema.optional(),
})

export type ImportSuitePayload = z.infer<typeof importSuiteSchema>
export type ZodIssue = z.ZodError['issues'][number]
