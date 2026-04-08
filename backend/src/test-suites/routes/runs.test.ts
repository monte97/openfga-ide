import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'node:http'

vi.mock('../../test-suites/db/pool.js', () => ({
  isAvailable: vi.fn().mockReturnValue(true),
}))

vi.mock('../../services/openfga-client.js', () => ({
  openfgaClient: {
    url: 'http://test-openfga:8080',
    storeId: '',
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    testConnection: vi.fn(),
    updateUrl: vi.fn(),
  },
}))

// Stub out suite-service to satisfy app.ts imports
vi.mock('../services/suite-service.js', () => ({
  listSuites: vi.fn(),
  getSuite: vi.fn(),
  createSuite: vi.fn(),
  updateSuite: vi.fn(),
  deleteSuite: vi.fn(),
}))

vi.mock('../services/run-service.js', () => ({
  triggerRun: vi.fn(),
  getRun: vi.fn(),
}))

const poolModule = await import('../../test-suites/db/pool.js')
const mockIsAvailable = vi.mocked(poolModule.isAvailable)

const runSvc = await import('../services/run-service.js')
const mockTriggerRun = vi.mocked(runSvc.triggerRun)
const mockGetRun = vi.mocked(runSvc.getRun)

import app from '../../app.js'

let server: Server
const PORT = 3098
const base = `http://localhost:${PORT}`

beforeAll(() => {
  server = app.listen(PORT)
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  vi.resetAllMocks()
  mockIsAvailable.mockReturnValue(true)
})

describe('POST /api/suites/:suiteId/run', () => {
  it('returns 202 with runId on success', async () => {
    mockTriggerRun.mockResolvedValue({ runId: 'run-42' })

    const res = await fetch(`${base}/api/suites/suite-1/run`, { method: 'POST' })
    const body = await res.json() as { runId: string }

    expect(res.status).toBe(202)
    expect(body.runId).toBe('run-42')
    expect(mockTriggerRun).toHaveBeenCalledWith('suite-1', undefined)
  })

  it('passes testCaseId from body to triggerRun', async () => {
    mockTriggerRun.mockResolvedValue({ runId: 'run-99' })

    const res = await fetch(`${base}/api/suites/suite-1/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testCaseId: 'tc-abc' }),
    })

    expect(res.status).toBe(202)
    expect(mockTriggerRun).toHaveBeenCalledWith('suite-1', 'tc-abc')
  })

  it('returns 400 when suite has no fixture', async () => {
    const err = new Error('Suite has no fixture') as Error & { statusCode: number }
    err.statusCode = 400
    mockTriggerRun.mockRejectedValue(err)

    const res = await fetch(`${base}/api/suites/suite-1/run`, { method: 'POST' })
    const body = await res.json() as { error: string }

    expect(res.status).toBe(400)
    expect(body.error).toBe('Suite has no fixture')
  })

  it('returns 400 when suite has no test cases', async () => {
    const err = new Error('Suite has no test cases') as Error & { statusCode: number }
    err.statusCode = 400
    mockTriggerRun.mockRejectedValue(err)

    const res = await fetch(`${base}/api/suites/suite-1/run`, { method: 'POST' })
    const body = await res.json() as { error: string }

    expect(res.status).toBe(400)
    expect(body.error).toBe('Suite has no test cases')
  })

  it('returns 503 when database is not configured', async () => {
    mockIsAvailable.mockReturnValue(false)

    const res = await fetch(`${base}/api/suites/suite-1/run`, { method: 'POST' })
    const body = await res.json() as { error: string }

    expect(res.status).toBe(503)
    expect(body.error).toBe('Database not configured')
  })
})

describe('GET /api/runs/:runId', () => {
  it('returns 200 with run data', async () => {
    const run = {
      id: 'run-1',
      suiteId: 'suite-1',
      status: 'completed',
      startedAt: '2026-01-01T12:00:00Z',
      completedAt: '2026-01-01T12:01:00Z',
      error: null,
      summary: { total: 1, passed: 1, failed: 0, errored: 0, durationMs: 500 },
      createdAt: '2026-01-01T12:00:00Z',
      results: [],
    }
    mockGetRun.mockResolvedValue(run as never)

    const res = await fetch(`${base}/api/runs/run-1`)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ id: 'run-1', status: 'completed' })
  })

  it('returns 404 when run does not exist', async () => {
    const err = new Error('Run not found') as Error & { statusCode: number }
    err.statusCode = 404
    mockGetRun.mockRejectedValue(err)

    const res = await fetch(`${base}/api/runs/nonexistent`)
    const body = await res.json() as { error: string }

    expect(res.status).toBe(404)
    expect(body.error).toBe('Run not found')
  })

  it('returns 503 when database is not configured', async () => {
    mockIsAvailable.mockReturnValue(false)

    const res = await fetch(`${base}/api/runs/run-1`)
    const body = await res.json() as { error: string }

    expect(res.status).toBe(503)
    expect(body.error).toBe('Database not configured')
  })
})
