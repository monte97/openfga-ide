import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/openfga-client.js', () => ({
  openfgaClient: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../repositories/run-repository.js', () => ({
  updateStatus: vi.fn(),
  saveResults: vi.fn(),
  saveSummary: vi.fn(),
}))

import { openfgaClient } from '../../services/openfga-client.js'
import * as runRepository from '../repositories/run-repository.js'
import { executeRun } from './execution-engine.js'
import type { Suite } from '../types/suite.js'

const mockPost = vi.mocked(openfgaClient.post)
const mockDelete = vi.mocked(openfgaClient.delete)
const mockUpdateStatus = vi.mocked(runRepository.updateStatus)
const mockSaveResults = vi.mocked(runRepository.saveResults)
const mockSaveSummary = vi.mocked(runRepository.saveSummary)

function makeSuite(overrides: Partial<Suite> = {}): Suite {
  return {
    id: 'suite-1',
    name: 'My Suite',
    description: null,
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    definition: {
      fixture: {
        model: { schema_version: '1.1', type_definitions: [] },
        tuples: [],
      },
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

describe('execution-engine', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default: store creation returns an ID
    mockPost.mockResolvedValue({ id: 'ephemeral-store-1' })
    mockUpdateStatus.mockResolvedValue(undefined)
    mockSaveResults.mockResolvedValue(undefined)
    mockSaveSummary.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue(null)
  })

  it('happy path — all checks pass, status ends completed, store deleted', async () => {
    // store creation → model write → check (allowed: true)
    mockPost
      .mockResolvedValueOnce({ id: 'ephemeral-store-1' }) // POST /stores
      .mockResolvedValueOnce({}) // POST authorization-models
      .mockResolvedValueOnce({ allowed: true }) // check

    await executeRun('run-1', makeSuite())

    expect(mockUpdateStatus).toHaveBeenNthCalledWith(1, 'run-1', 'provisioning')
    expect(mockUpdateStatus).toHaveBeenNthCalledWith(2, 'run-1', 'running')
    expect(mockUpdateStatus).toHaveBeenNthCalledWith(3, 'run-1', 'completed')
    expect(mockSaveResults).toHaveBeenCalledOnce()
    const savedResults = mockSaveResults.mock.calls[0][1]
    expect(savedResults[0].passed).toBe(true)
    expect(savedResults[0].actual).toBe(true)
    expect(mockDelete).toHaveBeenCalledWith('/stores/ephemeral-store-1')
  })

  it('assertion failure — check returns allowed:false when expected:true → status failed', async () => {
    mockPost
      .mockResolvedValueOnce({ id: 'ephemeral-store-1' })
      .mockResolvedValueOnce({}) // model
      .mockResolvedValueOnce({ allowed: false }) // check fails assertion

    await executeRun('run-1', makeSuite())

    const savedResults = mockSaveResults.mock.calls[0][1]
    expect(savedResults[0].passed).toBe(false)
    expect(savedResults[0].actual).toBe(false)
    expect(savedResults[0].error).toBeNull()

    const finalStatus = mockUpdateStatus.mock.calls.at(-1)![1]
    expect(finalStatus).toBe('failed')
    expect(mockDelete).toHaveBeenCalledWith('/stores/ephemeral-store-1')
  })

  it('fixture error — model write throws → status failed with error message, store deleted', async () => {
    mockPost
      .mockResolvedValueOnce({ id: 'ephemeral-store-1' })
      .mockRejectedValueOnce(new Error('Invalid model syntax'))

    await executeRun('run-1', makeSuite())

    expect(mockUpdateStatus).toHaveBeenCalledWith('run-1', 'failed', 'Invalid model syntax')
    expect(mockDelete).toHaveBeenCalledWith('/stores/ephemeral-store-1')
    expect(mockSaveResults).not.toHaveBeenCalled()
  })

  it('individual check error — result has error field, other tests continue, run marked failed', async () => {
    const suite = makeSuite({
      definition: {
        fixture: { tuples: [] },
        groups: [
          {
            name: 'Group 1',
            testCases: [
              { user: 'user:alice', relation: 'reader', object: 'doc:1', expected: true },
              { user: 'user:bob', relation: 'reader', object: 'doc:2', expected: false },
            ],
          },
        ],
      },
    })

    mockPost
      .mockResolvedValueOnce({ id: 'ephemeral-store-1' })
      .mockRejectedValueOnce(new Error('Network timeout')) // first check fails
      .mockResolvedValueOnce({ allowed: false }) // second check succeeds

    await executeRun('run-1', suite)

    const savedResults = mockSaveResults.mock.calls[0][1]
    expect(savedResults).toHaveLength(2)
    expect(savedResults[0].error).toBe('Network timeout')
    expect(savedResults[0].actual).toBeNull()
    expect(savedResults[0].passed).toBe(false)
    expect(savedResults[1].passed).toBe(true)

    const finalStatus = mockUpdateStatus.mock.calls.at(-1)![1]
    expect(finalStatus).toBe('failed') // errored count > 0
    expect(mockDelete).toHaveBeenCalledWith('/stores/ephemeral-store-1')
  })

  it('cleanup guarantee — delete called even when running phase throws', async () => {
    mockPost
      .mockResolvedValueOnce({ id: 'ephemeral-store-1' })
      .mockResolvedValueOnce({}) // model write ok
    mockUpdateStatus
      .mockResolvedValueOnce(undefined) // provisioning
      .mockRejectedValueOnce(new Error('DB gone')) // running status update fails

    await executeRun('run-1', makeSuite())

    expect(mockDelete).toHaveBeenCalledWith('/stores/ephemeral-store-1')
  })

  it('no orphaned stores — delete called even on provisioning failure before store is created', async () => {
    mockPost.mockRejectedValueOnce(new Error('OpenFGA unreachable'))

    await executeRun('run-1', makeSuite())

    // ephemeralStoreId is null → delete should NOT be called
    expect(mockDelete).not.toHaveBeenCalled()
    expect(mockUpdateStatus).toHaveBeenCalledWith('run-1', 'failed', 'OpenFGA unreachable')
  })

  it('testCaseId filter — runs only the matching test case', async () => {
    const suite = makeSuite({
      definition: {
        fixture: { tuples: [] },
        groups: [
          {
            name: 'Group 1',
            testCases: [
              { id: 'tc-1', user: 'user:alice', relation: 'reader', object: 'doc:1', expected: true },
              { id: 'tc-2', user: 'user:bob', relation: 'reader', object: 'doc:2', expected: false },
            ],
          },
        ],
      },
    })

    mockPost
      .mockResolvedValueOnce({ id: 'ephemeral-store-1' }) // store create
      .mockResolvedValueOnce({ allowed: true }) // single check

    await executeRun('run-1', suite, 'tc-1')

    const savedResults = mockSaveResults.mock.calls[0][1]
    expect(savedResults).toHaveLength(1)
    expect(savedResults[0].testCase.user).toBe('user:alice')
  })

  it('testCaseId filter — runs all test cases when testCaseId is undefined', async () => {
    const suite = makeSuite({
      definition: {
        fixture: { tuples: [] },
        groups: [
          {
            name: 'Group 1',
            testCases: [
              { id: 'tc-1', user: 'user:alice', relation: 'reader', object: 'doc:1', expected: true },
              { id: 'tc-2', user: 'user:bob', relation: 'reader', object: 'doc:2', expected: false },
            ],
          },
        ],
      },
    })

    mockPost
      .mockResolvedValueOnce({ id: 'ephemeral-store-1' })
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false })

    await executeRun('run-1', suite)

    const savedResults = mockSaveResults.mock.calls[0][1]
    expect(savedResults).toHaveLength(2)
  })

  it('tuples are sent in batches of 100', async () => {
    const tuples = Array.from({ length: 150 }, (_, i) => ({
      user: `user:${i}`,
      relation: 'reader',
      object: 'doc:1',
    }))
    const suite = makeSuite({
      definition: {
        fixture: { tuples },
        groups: [],
      },
    })

    mockPost
      .mockResolvedValueOnce({ id: 'ephemeral-store-1' }) // store create
      .mockResolvedValue({}) // all other posts

    await executeRun('run-1', suite)

    const writeCalls = mockPost.mock.calls.filter(([path]) =>
      (path as string).includes('/write'),
    )
    expect(writeCalls).toHaveLength(2) // 100 + 50
    expect((writeCalls[0][1] as { writes: { tuple_keys: unknown[] } }).writes.tuple_keys).toHaveLength(100)
    expect((writeCalls[1][1] as { writes: { tuple_keys: unknown[] } }).writes.tuple_keys).toHaveLength(50)
  })
})
