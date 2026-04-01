import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPool } from '../db/pool.js'

vi.mock('../db/pool.js', () => ({
  getPool: vi.fn(),
}))

import {
  createRun,
  updateStatus,
  saveSummary,
  saveResults,
  findById,
} from './run-repository.js'
import type { RunResult, RunSummary } from '../types/run.js'

function makeQueryMock(rows: Record<string, unknown>[] = []) {
  return vi.fn().mockResolvedValue({ rows })
}

describe('run-repository', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('createRun', () => {
    it('inserts a run and returns id + status', async () => {
      const queryMock = makeQueryMock([{ id: 'run-1', status: 'pending' }])
      vi.mocked(getPool).mockReturnValue({ query: queryMock } as never)

      const result = await createRun('suite-1')

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO runs'),
        ['suite-1'],
      )
      expect(result).toEqual({ id: 'run-1', status: 'pending' })
    })
  })

  describe('updateStatus', () => {
    it('sets started_at when transitioning to provisioning', async () => {
      const queryMock = makeQueryMock()
      vi.mocked(getPool).mockReturnValue({ query: queryMock } as never)

      await updateStatus('run-1', 'provisioning')

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('started_at'),
        ['provisioning', 'run-1', null],
      )
    })

    it('sets completed_at when transitioning to completed', async () => {
      const queryMock = makeQueryMock()
      vi.mocked(getPool).mockReturnValue({ query: queryMock } as never)

      await updateStatus('run-1', 'completed')

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('completed_at'),
        ['completed', 'run-1', null],
      )
    })

    it('sets completed_at when transitioning to failed', async () => {
      const queryMock = makeQueryMock()
      vi.mocked(getPool).mockReturnValue({ query: queryMock } as never)

      await updateStatus('run-1', 'failed', 'something went wrong')

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('completed_at'),
        ['failed', 'run-1', 'something went wrong'],
      )
    })

    it('does not set timestamps when transitioning to running', async () => {
      const queryMock = makeQueryMock()
      vi.mocked(getPool).mockReturnValue({ query: queryMock } as never)

      await updateStatus('run-1', 'running')

      const [sql] = queryMock.mock.calls[0]
      expect(sql).not.toContain('started_at')
      expect(sql).not.toContain('completed_at')
    })
  })

  describe('saveSummary', () => {
    it('updates the summary JSONB column', async () => {
      const queryMock = makeQueryMock()
      vi.mocked(getPool).mockReturnValue({ query: queryMock } as never)

      const summary: RunSummary = { total: 3, passed: 2, failed: 1, errored: 0, durationMs: 500 }
      await saveSummary('run-1', summary)

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE runs SET summary'),
        [JSON.stringify(summary), 'run-1'],
      )
    })
  })

  describe('saveResults', () => {
    it('does nothing when results array is empty', async () => {
      const queryMock = makeQueryMock()
      vi.mocked(getPool).mockReturnValue({ query: queryMock } as never)

      await saveResults('run-1', [])

      expect(queryMock).not.toHaveBeenCalled()
    })

    it('batch inserts all results', async () => {
      const queryMock = makeQueryMock()
      vi.mocked(getPool).mockReturnValue({ query: queryMock } as never)

      const results: RunResult[] = [
        {
          testCase: { user: 'user:alice', relation: 'reader', object: 'doc:1', expected: true },
          actual: true,
          passed: true,
          durationMs: 50,
          error: null,
        },
        {
          testCase: { user: 'user:bob', relation: 'writer', object: 'doc:1', expected: false },
          actual: false,
          passed: true,
          durationMs: 60,
          error: null,
        },
      ]
      await saveResults('run-1', results)

      expect(queryMock).toHaveBeenCalledOnce()
      const [sql, values] = queryMock.mock.calls[0]
      expect(sql).toContain('INSERT INTO run_results')
      expect(values).toHaveLength(12) // 2 rows × 6 params
    })
  })

  describe('findById', () => {
    it('returns null when run does not exist', async () => {
      const queryMock = vi.fn().mockResolvedValue({ rows: [] })
      vi.mocked(getPool).mockReturnValue({ query: queryMock } as never)

      const result = await findById('nonexistent')
      expect(result).toBeNull()
    })

    it('returns run with mapped fields and results', async () => {
      const now = new Date('2026-01-01T12:00:00Z')
      const runRow = {
        id: 'run-1',
        suite_id: 'suite-1',
        status: 'completed',
        started_at: now,
        completed_at: now,
        error: null,
        summary: { total: 1, passed: 1, failed: 0, errored: 0, durationMs: 100 },
        created_at: now,
      }
      const resultRow = {
        test_case: { user: 'user:alice', relation: 'reader', object: 'doc:1', expected: true },
        actual: true,
        passed: true,
        duration_ms: 50,
        error: null,
      }
      const queryMock = vi
        .fn()
        .mockResolvedValueOnce({ rows: [runRow] })
        .mockResolvedValueOnce({ rows: [resultRow] })
      vi.mocked(getPool).mockReturnValue({ query: queryMock } as never)

      const run = await findById('run-1')

      expect(run).not.toBeNull()
      expect(run!.id).toBe('run-1')
      expect(run!.suiteId).toBe('suite-1')
      expect(run!.status).toBe('completed')
      expect(run!.startedAt).toBe(now.toISOString())
      expect(run!.completedAt).toBe(now.toISOString())
      expect(run!.results).toHaveLength(1)
      expect(run!.results[0].passed).toBe(true)
      expect(run!.results[0].durationMs).toBe(50)
    })
  })
})
