export type RunStatus = 'pending' | 'provisioning' | 'running' | 'completed' | 'failed'

export interface RunSummary {
  total: number
  passed: number
  failed: number
  errored: number
  durationMs: number
}

export interface RunResultTestCase {
  user: string
  relation: string
  object: string
  expected: boolean
}

export interface RunResult {
  testCase: RunResultTestCase
  actual: boolean | null
  passed: boolean
  durationMs: number
  error: string | null
}

export interface Run {
  id: string
  suiteId: string
  status: RunStatus
  startedAt: string | null
  completedAt: string | null
  error: string | null
  summary: RunSummary | null
  createdAt: string
  results: RunResult[]
}
