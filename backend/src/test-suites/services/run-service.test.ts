import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./suite-service.js', () => ({
  getSuite: vi.fn(),
}))

vi.mock('../repositories/run-repository.js', () => ({
  createRun: vi.fn(),
  findById: vi.fn(),
}))

vi.mock('./execution-engine.js', () => ({
  executeRun: vi.fn(),
}))

import * as suiteService from './suite-service.js'
import * as runRepository from '../repositories/run-repository.js'
import { executeRun } from './execution-engine.js'
import { triggerRun, getRun } from './run-service.js'
import type { Suite } from '../types/suite.js'

const mockGetSuite = vi.mocked(suiteService.getSuite)
const mockCreateRun = vi.mocked(runRepository.createRun)
const mockFindById = vi.mocked(runRepository.findById)
const mockExecuteRun = vi.mocked(executeRun)

function makeSuite(overrides: Partial<Suite> = {}): Suite {
  return {
    id: 'suite-1',
    name: 'Test Suite',
    description: null,
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    definition: {
      fixture: { model: {}, tuples: [] },
      groups: [
        {
          name: 'Group 1',
          testCases: [
            { user: 'user:alice', relation: 'reader', object: 'doc:1', expected: true },
          ],
        },
      ],
    },
    ...overrides,
  }
}

describe('run-service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockExecuteRun.mockResolvedValue(undefined)
  })

  describe('triggerRun', () => {
    it('returns runId after creating run and spawning execution', async () => {
      mockGetSuite.mockResolvedValue(makeSuite())
      mockCreateRun.mockResolvedValue({ id: 'run-42', status: 'pending' })

      const result = await triggerRun('suite-1')

      expect(result).toEqual({ runId: 'run-42' })
      expect(mockCreateRun).toHaveBeenCalledWith('suite-1')
      expect(mockExecuteRun).toHaveBeenCalledWith('run-42', expect.objectContaining({ id: 'suite-1' }), undefined)
    })

    it('passes testCaseId to executeRun when provided', async () => {
      const suite = makeSuite({
        definition: {
          fixture: { model: {}, tuples: [] },
          groups: [{ name: 'G1', testCases: [{ id: 'tc-abc', user: 'user:alice', relation: 'reader', object: 'doc:1', expected: true }] }],
        },
      })
      mockGetSuite.mockResolvedValue(suite)
      mockCreateRun.mockResolvedValue({ id: 'run-99', status: 'pending' })

      await triggerRun('suite-1', 'tc-abc')

      expect(mockExecuteRun).toHaveBeenCalledWith('run-99', expect.any(Object), 'tc-abc')
    })

    it('throws 400 when suite has no fixture', async () => {
      mockGetSuite.mockResolvedValue(
        makeSuite({ definition: { fixture: undefined, groups: [] } }),
      )

      await expect(triggerRun('suite-1')).rejects.toMatchObject({
        message: 'Suite has no fixture',
        statusCode: 400,
      })
      expect(mockCreateRun).not.toHaveBeenCalled()
    })

    it('throws 400 when suite has fixture but no test cases', async () => {
      mockGetSuite.mockResolvedValue(
        makeSuite({
          definition: {
            fixture: { tuples: [] },
            groups: [{ name: 'Empty', testCases: [] }],
          },
        }),
      )

      await expect(triggerRun('suite-1')).rejects.toMatchObject({
        message: 'Suite has no test cases',
        statusCode: 400,
      })
      expect(mockCreateRun).not.toHaveBeenCalled()
    })

    it('throws 404 when testCaseId does not exist in suite', async () => {
      mockGetSuite.mockResolvedValue(makeSuite())

      await expect(triggerRun('suite-1', 'nonexistent-id')).rejects.toMatchObject({
        message: 'Test case not found',
        statusCode: 404,
      })
      expect(mockCreateRun).not.toHaveBeenCalled()
    })

    it('creates run and executes when testCaseId exists in suite', async () => {
      const suite = makeSuite({
        definition: {
          fixture: { model: {}, tuples: [] },
          groups: [{ name: 'G1', testCases: [{ id: 'tc-1', user: 'user:alice', relation: 'viewer', object: 'doc:1', expected: true }] }],
        },
      })
      mockGetSuite.mockResolvedValue(suite)
      mockCreateRun.mockResolvedValue({ id: 'run-1', status: 'pending' })

      const result = await triggerRun('suite-1', 'tc-1')
      expect(result.runId).toBe('run-1')
      expect(mockExecuteRun).toHaveBeenCalledWith('run-1', suite, 'tc-1')
    })

    it('propagates 404 from getSuite when suite not found', async () => {
      const err = new Error('Suite not found') as Error & { statusCode: number }
      err.statusCode = 404
      mockGetSuite.mockRejectedValue(err)

      await expect(triggerRun('nonexistent')).rejects.toMatchObject({
        message: 'Suite not found',
        statusCode: 404,
      })
    })
  })

  describe('getRun', () => {
    it('throws 404 when run does not exist', async () => {
      mockFindById.mockResolvedValue(null)

      await expect(getRun('nonexistent')).rejects.toMatchObject({
        message: 'Run not found',
        statusCode: 404,
      })
    })

    it('returns run when found', async () => {
      const run = {
        id: 'run-1',
        suiteId: 'suite-1',
        status: 'completed' as const,
        startedAt: null,
        completedAt: null,
        error: null,
        summary: null,
        createdAt: '2026-01-01T00:00:00Z',
        results: [],
      }
      mockFindById.mockResolvedValue(run)

      const result = await getRun('run-1')
      expect(result).toBe(run)
    })
  })
})
