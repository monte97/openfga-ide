import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Suite, SuiteListItem } from '../types/suite.js'

const mockQuery = vi.fn()

vi.mock('../db/pool.js', () => ({
  getPool: vi.fn(() => ({ query: mockQuery })),
}))

const { findAll, findById, create, update, remove } = await import('./suite-repository.js')

const NOW = new Date('2026-03-31T10:00:00Z')

const dbRow = {
  id: 'suite-uuid-1',
  name: 'My Suite',
  description: 'A test suite',
  tags: ['tag1', 'tag2'],
  definition: null,
  created_at: NOW,
  updated_at: NOW,
  group_count: 0,
  test_count: 0,
}

describe('suite-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findAll()', () => {
    it('returns mapped list items ordered by updatedAt', async () => {
      mockQuery.mockResolvedValue({ rows: [dbRow] })

      const result = await findAll()

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY s.updated_at DESC'),
      )
      expect(result).toHaveLength(1)
      const item = result[0] as SuiteListItem
      expect(item.id).toBe('suite-uuid-1')
      expect(item.name).toBe('My Suite')
      expect(item.tags).toEqual(['tag1', 'tag2'])
      expect(item.createdAt).toBe(NOW.toISOString())
      expect(item.groupCount).toBe(0)
      expect(item.testCount).toBe(0)
    })

    it('returns lastRun as null when no run exists for the suite', async () => {
      mockQuery.mockResolvedValue({ rows: [dbRow] })
      const result = await findAll()
      expect(result[0].lastRun).toBeNull()
    })

    it('returns lastRun with status and summary when a run exists', async () => {
      const rowWithRun = {
        ...dbRow,
        last_run_status: 'completed',
        last_run_summary: { total: 5, passed: 4, failed: 1, errored: 0, durationMs: 300 },
      }
      mockQuery.mockResolvedValue({ rows: [rowWithRun] })
      const result = await findAll()
      expect(result[0].lastRun).toEqual({
        status: 'completed',
        summary: { total: 5, passed: 4, failed: 1, errored: 0, durationMs: 300 },
      })
    })

    it('returns lastRun with null summary when run failed with no summary', async () => {
      const rowWithFailedRun = {
        ...dbRow,
        last_run_status: 'failed',
        last_run_summary: null,
      }
      mockQuery.mockResolvedValue({ rows: [rowWithFailedRun] })
      const result = await findAll()
      expect(result[0].lastRun).toEqual({ status: 'failed', summary: null })
    })

    it('uses LEFT JOIN LATERAL in query', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      await findAll()
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN LATERAL'),
      )
    })

    it('returns empty array when no suites exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      const result = await findAll()
      expect(result).toEqual([])
    })

    it('returns groupCount and testCount from definition', async () => {
      const rowWithCounts = { ...dbRow, group_count: 2, test_count: 5 }
      mockQuery.mockResolvedValue({ rows: [rowWithCounts] })
      const result = await findAll()
      expect(result[0].groupCount).toBe(2)
      expect(result[0].testCount).toBe(5)
    })

    it('returns groupCount 0 and testCount 0 when definition is null', async () => {
      const rowWithNull = { ...dbRow, group_count: 0, test_count: 0 }
      mockQuery.mockResolvedValue({ rows: [rowWithNull] })
      const result = await findAll()
      expect(result[0].groupCount).toBe(0)
      expect(result[0].testCount).toBe(0)
    })
  })

  describe('findById()', () => {
    it('returns full suite when found', async () => {
      const rowWithDef = { ...dbRow, definition: { groups: [] } }
      mockQuery.mockResolvedValue({ rows: [rowWithDef] })

      const result = await findById('suite-uuid-1')

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['suite-uuid-1'])
      expect(result).not.toBeNull()
      const suite = result as Suite
      expect(suite.id).toBe('suite-uuid-1')
      expect(suite.definition).toEqual({ groups: [] })
    })

    it('returns null when suite not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      const result = await findById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('create()', () => {
    it('inserts suite and returns mapped row', async () => {
      mockQuery.mockResolvedValue({ rows: [dbRow] })

      const result = await create({ name: 'My Suite', description: 'A test suite', tags: ['tag1', 'tag2'] })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO suites'),
        expect.arrayContaining(['My Suite', 'A test suite', ['tag1', 'tag2'], null]),
      )
      expect(result.name).toBe('My Suite')
    })

    it('uses empty array for tags when not provided', async () => {
      mockQuery.mockResolvedValue({ rows: [dbRow] })
      await create({ name: 'Suite' })
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([[]]),
      )
    })
  })

  describe('update()', () => {
    it('updates suite fields and returns updated row', async () => {
      const updatedRow = { ...dbRow, name: 'Updated Suite' }
      mockQuery.mockResolvedValue({ rows: [updatedRow] })

      const result = await update('suite-uuid-1', { name: 'Updated Suite' })

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE suites'),
        expect.arrayContaining(['Updated Suite', 'suite-uuid-1']),
      )
      expect(result?.name).toBe('Updated Suite')
    })

    it('returns null when suite not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] })
      const result = await update('nonexistent', { name: 'X' })
      expect(result).toBeNull()
    })

    it('falls through to findById when no fields to update', async () => {
      mockQuery.mockResolvedValue({ rows: [dbRow] })
      const result = await update('suite-uuid-1', {})
      expect(result?.id).toBe('suite-uuid-1')
    })
  })

  describe('remove()', () => {
    it('returns true when suite is deleted', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 })
      const result = await remove('suite-uuid-1')
      expect(result).toBe(true)
    })

    it('returns false when suite not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 })
      const result = await remove('nonexistent')
      expect(result).toBe(false)
    })
  })
})
