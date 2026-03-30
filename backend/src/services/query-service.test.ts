import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./openfga-client.js', () => ({
  openfgaClient: {
    post: vi.fn(),
  },
}))

const { openfgaClient } = await import('./openfga-client.js')
const mockClient = openfgaClient as unknown as { post: ReturnType<typeof vi.fn> }

const { check, listObjects, listUsers, expand } = await import('./query-service.js')

describe('query-service', () => {
  beforeEach(() => {
    mockClient.post.mockReset()
  })

  describe('check', () => {
    it('calls POST /stores/{id}/check with tuple_key and returns allowed:true', async () => {
      mockClient.post.mockResolvedValue({ allowed: true, resolution: '' })

      const result = await check('store-01', { user: 'user:alice', relation: 'viewer', object: 'document:roadmap' })

      expect(mockClient.post).toHaveBeenCalledWith('/stores/store-01/check', {
        tuple_key: { user: 'user:alice', relation: 'viewer', object: 'document:roadmap' },
      })
      expect(result).toEqual({ allowed: true })
    })

    it('returns allowed:false when OpenFGA denies', async () => {
      mockClient.post.mockResolvedValue({ allowed: false, resolution: '' })

      const result = await check('store-01', { user: 'user:bob', relation: 'owner', object: 'document:secret' })
      expect(result).toEqual({ allowed: false })
    })
  })

  describe('listObjects', () => {
    it('calls POST /stores/{id}/list-objects with flat body and returns objects', async () => {
      mockClient.post.mockResolvedValue({ objects: ['document:roadmap', 'document:specs'] })

      const result = await listObjects('store-01', { user: 'user:alice', relation: 'viewer', type: 'document' })

      expect(mockClient.post).toHaveBeenCalledWith('/stores/store-01/list-objects', {
        user: 'user:alice',
        relation: 'viewer',
        type: 'document',
      })
      expect(result).toEqual({ objects: ['document:roadmap', 'document:specs'] })
    })

    it('returns empty array when no objects match', async () => {
      mockClient.post.mockResolvedValue({ objects: [] })

      const result = await listObjects('store-01', { user: 'user:nobody', relation: 'viewer', type: 'document' })
      expect(result).toEqual({ objects: [] })
    })
  })

  describe('listUsers', () => {
    it('calls POST /stores/{id}/list-users with user_filters and returns flattened users', async () => {
      mockClient.post.mockResolvedValue({
        users: [
          { object: { type: 'user', id: 'alice' } },
          { object: { type: 'user', id: 'marco' } },
        ],
      })

      const result = await listUsers('store-01', { object: { type: 'document', id: 'roadmap' }, relation: 'viewer' })

      expect(mockClient.post).toHaveBeenCalledWith('/stores/store-01/list-users', {
        object: { type: 'document', id: 'roadmap' },
        relation: 'viewer',
        user_filters: [{ type: 'user' }],
      })
      expect(result).toEqual({ users: ['user:alice', 'user:marco'] })
    })

    it('transforms nested object format to type:id strings', async () => {
      mockClient.post.mockResolvedValue({
        users: [{ object: { type: 'team', id: 'backend' } }],
      })

      const result = await listUsers('store-01', { object: { type: 'repo', id: 'api' }, relation: 'member' })
      expect(result.users).toEqual(['team:backend'])
    })
  })

  describe('expand', () => {
    it('calls POST /stores/{id}/expand with tuple_key and returns tree', async () => {
      const tree = { root: { name: 'document:roadmap#viewer', union: { nodes: [] } } }
      mockClient.post.mockResolvedValue({ tree })

      const result = await expand('store-01', { relation: 'viewer', object: 'document:roadmap' })

      expect(mockClient.post).toHaveBeenCalledWith('/stores/store-01/expand', {
        tuple_key: { relation: 'viewer', object: 'document:roadmap' },
      })
      expect(result).toEqual({ tree })
    })
  })

  describe('error propagation', () => {
    it('propagates errors from openfgaClient for check', async () => {
      mockClient.post.mockRejectedValue(Object.assign(new Error('Store not found'), { statusCode: 404 }))
      await expect(check('bad', { user: 'u', relation: 'r', object: 'o' })).rejects.toThrow('Store not found')
    })

    it('propagates errors from openfgaClient for listObjects', async () => {
      mockClient.post.mockRejectedValue(new Error('Timeout'))
      await expect(listObjects('s', { user: 'u', relation: 'r', type: 't' })).rejects.toThrow('Timeout')
    })

    it('propagates errors from openfgaClient for listUsers', async () => {
      mockClient.post.mockRejectedValue(Object.assign(new Error('Unauthorized'), { statusCode: 401 }))
      await expect(listUsers('s', { object: { type: 'doc', id: '1' }, relation: 'viewer' })).rejects.toThrow('Unauthorized')
    })

    it('propagates errors from openfgaClient for expand', async () => {
      mockClient.post.mockRejectedValue(new Error('Model not found'))
      await expect(expand('s', { relation: 'viewer', object: 'doc:1' })).rejects.toThrow('Model not found')
    })
  })
})
