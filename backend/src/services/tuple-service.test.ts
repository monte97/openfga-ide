import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./openfga-client.js', () => ({
  openfgaClient: {
    post: vi.fn(),
  },
}))

const { openfgaClient } = await import('./openfga-client.js')
const mockClient = openfgaClient as unknown as { post: ReturnType<typeof vi.fn> }

const { readTuples, writeTuple, deleteTuple, deleteTuplesBatch } = await import('./tuple-service.js')

const sampleTuple = {
  key: { user: 'user:alice', relation: 'viewer', object: 'document:roadmap' },
  timestamp: '2026-03-27T10:00:00Z',
}

describe('tuple-service', () => {
  beforeEach(() => {
    mockClient.post.mockReset()
  })

  describe('readTuples', () => {
    it('calls POST /stores/{id}/read with empty body when no filters', async () => {
      mockClient.post.mockResolvedValue({ tuples: [sampleTuple], continuation_token: '' })

      const result = await readTuples('store-01')

      expect(mockClient.post).toHaveBeenCalledWith('/stores/store-01/read', {})
      expect(result.tuples).toHaveLength(1)
      expect(result.tuples[0].key.user).toBe('user:alice')
    })

    it('sends tuple_key.object with colon suffix for type filter', async () => {
      mockClient.post.mockResolvedValue({ tuples: [], continuation_token: '' })

      await readTuples('store-01', { type: 'document' })

      expect(mockClient.post).toHaveBeenCalledWith('/stores/store-01/read', {
        tuple_key: { object: 'document:' },
      })
    })

    it('sends correct tuple_key with all filters', async () => {
      mockClient.post.mockResolvedValue({ tuples: [], continuation_token: '' })

      await readTuples('store-01', { type: 'document', relation: 'viewer', user: 'user:alice' })

      expect(mockClient.post).toHaveBeenCalledWith('/stores/store-01/read', {
        tuple_key: { object: 'document:', relation: 'viewer', user: 'user:alice' },
      })
    })

    it('sends page_size and continuation_token for pagination', async () => {
      mockClient.post.mockResolvedValue({ tuples: [], continuation_token: '' })

      await readTuples('store-01', { pageSize: 50, continuationToken: 'token123' })

      expect(mockClient.post).toHaveBeenCalledWith('/stores/store-01/read', {
        page_size: 50,
        continuation_token: 'token123',
      })
    })

    it('transforms continuation_token to continuationToken, empty string becomes null', async () => {
      mockClient.post.mockResolvedValue({ tuples: [], continuation_token: '' })

      const result = await readTuples('store-01')
      expect(result.continuationToken).toBeNull()
    })

    it('preserves non-empty continuation_token as continuationToken', async () => {
      mockClient.post.mockResolvedValue({ tuples: [], continuation_token: 'nextpage' })

      const result = await readTuples('store-01')
      expect(result.continuationToken).toBe('nextpage')
    })
  })

  describe('writeTuple', () => {
    it('calls POST /stores/{id}/write with writes field', async () => {
      mockClient.post.mockResolvedValue({})
      const tupleKey = { user: 'user:alice', relation: 'viewer', object: 'document:roadmap' }

      const result = await writeTuple('store-01', tupleKey)

      expect(mockClient.post).toHaveBeenCalledWith('/stores/store-01/write', {
        writes: { tuple_keys: [tupleKey] },
      })
      expect(result).toEqual(tupleKey)
    })
  })

  describe('deleteTuple', () => {
    it('calls POST /stores/{id}/write with deletes field', async () => {
      mockClient.post.mockResolvedValue({})
      const tupleKey = { user: 'user:alice', relation: 'viewer', object: 'document:roadmap' }

      await deleteTuple('store-01', tupleKey)

      expect(mockClient.post).toHaveBeenCalledWith('/stores/store-01/write', {
        deletes: { tuple_keys: [tupleKey] },
      })
    })
  })

  describe('deleteTuplesBatch', () => {
    it('calls POST /stores/{id}/write with multiple tuple keys in deletes', async () => {
      mockClient.post.mockResolvedValue({})
      const keys = [
        { user: 'user:alice', relation: 'viewer', object: 'document:roadmap' },
        { user: 'user:bob', relation: 'editor', object: 'document:spec' },
      ]

      const result = await deleteTuplesBatch('store-01', keys)

      expect(mockClient.post).toHaveBeenCalledWith('/stores/store-01/write', {
        deletes: { tuple_keys: keys },
      })
      expect(result).toEqual({ deleted: 2 })
    })
  })

  describe('error propagation', () => {
    it('propagates errors from openfgaClient', async () => {
      const err = Object.assign(new Error('Store not found'), { statusCode: 404 })
      mockClient.post.mockRejectedValue(err)

      await expect(readTuples('bad-store')).rejects.toThrow('Store not found')
    })
  })
})
