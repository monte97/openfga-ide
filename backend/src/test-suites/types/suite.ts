export interface TestCase {
  id?: string
  user: string
  relation: string
  object: string
  expected: boolean
  meta?: {
    description?: string
    tags?: string[]
    severity?: 'critical' | 'warning' | 'info'
  }
}

export interface TestGroup {
  name: string
  description?: string
  testCases: TestCase[]
}

export interface SuiteFixture {
  model?: unknown
  tuples?: unknown[]
}

export interface SuiteDefinition {
  fixture?: SuiteFixture
  groups: TestGroup[]
}

export interface Suite {
  id: string
  name: string
  description: string | null
  tags: string[]
  definition: SuiteDefinition | null
  createdAt: string
  updatedAt: string
}

export interface SuiteLastRun {
  status: string
  summary: import('./run.js').RunSummary | null
}

export interface SuiteListItem {
  id: string
  name: string
  description: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  lastRun: SuiteLastRun | null
}

export interface CreateSuiteInput {
  name: string
  description?: string
  tags?: string[]
  definition?: SuiteDefinition
}

export interface UpdateSuiteInput {
  name?: string
  description?: string | null
  tags?: string[]
  definition?: SuiteDefinition
}
