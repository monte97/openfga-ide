import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./openfga-client.js', () => ({
  openfgaClient: {
    url: 'http://test-openfga:8080',
    storeId: 'active-store',
    post: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  },
}))

const { openfgaClient } = await import('./openfga-client.js')
const mockClient = openfgaClient as {
  post: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  storeId: string
}

const { createStore, deleteStore } = await import('./store-service.js')

describe('store-service', () => {
  beforeEach(() => {
    mockClient.post.mockReset()
    mockClient.delete.mockReset()
    mockClient.storeId = 'active-store'
  })

  describe('createStore', () => {
    it('calls POST /stores with name and returns store', async () => {
      const created = { id: 'new-store', name: 'My Store', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
      mockClient.post.mockResolvedValue(created)

      const result = await createStore('My Store')
      expect(mockClient.post).toHaveBeenCalledWith('/stores', { name: 'My Store' })
      expect(result).toEqual(created)
    })

    it('throws when OpenFGA returns error', async () => {
      mockClient.post.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))
      await expect(createStore('Bad Store')).rejects.toThrow('Forbidden')
    })
  })

  describe('deleteStore', () => {
    it('calls DELETE /stores/:storeId', async () => {
      mockClient.delete.mockResolvedValue(undefined)
      await deleteStore('store-xyz')
      expect(mockClient.delete).toHaveBeenCalledWith('/stores/store-xyz')
    })

    it('clears storeId on client when deleting the active store', async () => {
      mockClient.delete.mockResolvedValue(undefined)
      mockClient.storeId = 'active-store'
      await deleteStore('active-store')
      expect(mockClient.storeId).toBe('')
    })

    it('does NOT clear storeId when deleting a different store', async () => {
      mockClient.delete.mockResolvedValue(undefined)
      mockClient.storeId = 'active-store'
      await deleteStore('other-store')
      expect(mockClient.storeId).toBe('active-store')
    })
  })
})
