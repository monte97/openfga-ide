import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Suite, SuiteListItem } from '../types/suite.js'

vi.mock('../repositories/suite-repository.js', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

const repo = await import('../repositories/suite-repository.js')
const { listSuites, getSuite, createSuite, updateSuite, deleteSuite } = await import('./suite-service.js')

const mockSuite: Suite = {
  id: 'suite-1',
  name: 'My Suite',
  description: null,
  tags: [],
  definition: null,
  createdAt: '2026-03-31T10:00:00Z',
  updatedAt: '2026-03-31T10:00:00Z',
}

const mockListItem: SuiteListItem = {
  id: 'suite-1',
  name: 'My Suite',
  description: null,
  tags: [],
  createdAt: '2026-03-31T10:00:00Z',
  updatedAt: '2026-03-31T10:00:00Z',
}

describe('suite-service', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('listSuites()', () => {
    it('returns suite list from repository', async () => {
      vi.mocked(repo.findAll).mockResolvedValue([mockListItem])
      const result = await listSuites()
      expect(result).toEqual([mockListItem])
    })
  })

  describe('getSuite()', () => {
    it('returns suite when found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(mockSuite)
      const result = await getSuite('suite-1')
      expect(result).toEqual(mockSuite)
    })

    it('throws 404 when suite not found', async () => {
      vi.mocked(repo.findById).mockResolvedValue(null)
      await expect(getSuite('nonexistent')).rejects.toMatchObject({
        message: 'Suite not found',
        statusCode: 404,
      })
    })
  })

  describe('createSuite()', () => {
    it('creates and returns suite', async () => {
      vi.mocked(repo.create).mockResolvedValue(mockSuite)
      const result = await createSuite({ name: 'My Suite' })
      expect(repo.create).toHaveBeenCalledWith({ name: 'My Suite' })
      expect(result).toEqual(mockSuite)
    })
  })

  describe('updateSuite()', () => {
    it('updates and returns suite', async () => {
      const updated = { ...mockSuite, name: 'Updated' }
      vi.mocked(repo.update).mockResolvedValue(updated)
      const result = await updateSuite('suite-1', { name: 'Updated' })
      expect(result).toEqual(updated)
    })

    it('throws 404 when suite not found', async () => {
      vi.mocked(repo.update).mockResolvedValue(null)
      await expect(updateSuite('nonexistent', { name: 'X' })).rejects.toMatchObject({
        message: 'Suite not found',
        statusCode: 404,
      })
    })

    it('throws 400 when body has no updatable fields', async () => {
      await expect(updateSuite('suite-1', {})).rejects.toMatchObject({
        message: 'No fields to update',
        statusCode: 400,
      })
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('clears description when null is passed', async () => {
      const cleared = { ...mockSuite, description: null }
      vi.mocked(repo.update).mockResolvedValue(cleared)
      const result = await updateSuite('suite-1', { description: null })
      expect(repo.update).toHaveBeenCalledWith('suite-1', { description: null })
      expect(result.description).toBeNull()
    })
  })

  describe('deleteSuite()', () => {
    it('resolves when suite deleted', async () => {
      vi.mocked(repo.remove).mockResolvedValue(true)
      await expect(deleteSuite('suite-1')).resolves.toBeUndefined()
    })

    it('throws 404 when suite not found', async () => {
      vi.mocked(repo.remove).mockResolvedValue(false)
      await expect(deleteSuite('nonexistent')).rejects.toMatchObject({
        message: 'Suite not found',
        statusCode: 404,
      })
    })
  })
})
