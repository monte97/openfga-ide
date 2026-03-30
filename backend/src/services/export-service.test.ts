import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./openfga-client.js', () => ({
  openfgaClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('./model-service.js', () => ({
  getModel: vi.fn(),
}))

const { openfgaClient } = await import('./openfga-client.js') as {
  openfgaClient: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }
}

const { getModel } = await import('./model-service.js') as {
  getModel: ReturnType<typeof vi.fn>
}

const { exportStore } = await import('./export-service.js')

const mockModel = {
  id: 'model-01',
  schema_version: '1.1',
  type_definitions: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('exportStore', () => {
  it('returns correct ExportPayload shape with model and tuples', async () => {
    openfgaClient.get.mockResolvedValue({ stores: [{ id: 'store-01', name: 'My Store' }] })
    getModel.mockResolvedValue({ json: mockModel, dsl: null, authorizationModelId: 'model-01' })
    openfgaClient.post.mockResolvedValue({
      tuples: [
        { key: { user: 'user:alice', relation: 'viewer', object: 'doc:1' }, timestamp: 't1' },
      ],
      continuation_token: '',
    })

    const result = await exportStore('store-01')

    expect(result.storeName).toBe('My Store')
    expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.model).toEqual(mockModel)
    expect(result.tuples).toEqual([{ user: 'user:alice', relation: 'viewer', object: 'doc:1' }])
  })

  it('returns model: null and tuples: [] when store has no model or tuples', async () => {
    openfgaClient.get.mockResolvedValue({ stores: [{ id: 'store-01', name: 'Empty Store' }] })
    getModel.mockResolvedValue({ json: null, dsl: null, authorizationModelId: null })
    openfgaClient.post.mockResolvedValue({ tuples: [], continuation_token: '' })

    const result = await exportStore('store-01')

    expect(result.model).toBeNull()
    expect(result.tuples).toEqual([])
  })

  it('paginates and collects all tuples across multiple pages', async () => {
    openfgaClient.get.mockResolvedValue({ stores: [{ id: 'store-01', name: 'Big Store' }] })
    getModel.mockResolvedValue({ json: null, dsl: null, authorizationModelId: null })
    openfgaClient.post
      .mockResolvedValueOnce({
        tuples: [{ key: { user: 'user:a', relation: 'viewer', object: 'doc:1' }, timestamp: 't1' }],
        continuation_token: 'token-page-2',
      })
      .mockResolvedValueOnce({
        tuples: [{ key: { user: 'user:b', relation: 'editor', object: 'doc:2' }, timestamp: 't2' }],
        continuation_token: '',
      })

    const result = await exportStore('store-01')

    expect(openfgaClient.post).toHaveBeenCalledTimes(2)
    expect(result.tuples).toHaveLength(2)
    expect(result.tuples[0]).toEqual({ user: 'user:a', relation: 'viewer', object: 'doc:1' })
    expect(result.tuples[1]).toEqual({ user: 'user:b', relation: 'editor', object: 'doc:2' })
  })

  it('stops after single page when continuation_token is empty string', async () => {
    openfgaClient.get.mockResolvedValue({ stores: [{ id: 'store-01', name: 'S' }] })
    getModel.mockResolvedValue({ json: null, dsl: null, authorizationModelId: null })
    openfgaClient.post.mockResolvedValue({
      tuples: [{ key: { user: 'user:x', relation: 'owner', object: 'doc:x' }, timestamp: 't' }],
      continuation_token: '',
    })

    await exportStore('store-01')

    expect(openfgaClient.post).toHaveBeenCalledTimes(1)
  })

  it('propagates errors from openfgaClient without swallowing', async () => {
    openfgaClient.get.mockRejectedValue(new Error('network error'))

    await expect(exportStore('store-01')).rejects.toThrow('network error')
  })
})
