import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./openfga-client.js', () => ({
  openfgaClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const { openfgaClient } = await import('./openfga-client.js') as {
  openfgaClient: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }
}

const { importToNewStore, importToExistingStore } = await import('./import-service.js')

const mockModel = {
  id: 'model-old-id',
  schema_version: '1.1',
  type_definitions: [{ type: 'user', relations: {}, metadata: null }],
}

const mockTuples = [
  { user: 'user:alice', relation: 'viewer', object: 'doc:1' },
  { user: 'user:bob', relation: 'editor', object: 'doc:2' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('importToNewStore', () => {
  it('creates store, writes model without id field, writes tuples, returns ImportResult', async () => {
    openfgaClient.post
      .mockResolvedValueOnce({ id: 'new-store-01', name: 'My Store' }) // create store
      .mockResolvedValueOnce({ authorization_model_id: 'model-new-01' }) // write model
      .mockResolvedValueOnce({}) // write tuples

    const result = await importToNewStore('My Store', mockModel, mockTuples)

    expect(result).toEqual({
      storeId: 'new-store-01',
      storeName: 'My Store',
      modelWritten: true,
      tuplesImported: 2,
    })
    // Ensure model id was stripped
    const modelCallBody = openfgaClient.post.mock.calls[1][1] as Record<string, unknown>
    expect(modelCallBody).not.toHaveProperty('id')
    expect(modelCallBody.schema_version).toBe('1.1')
  })

  it('paginates tuples in batches of 100 (250 tuples = 3 batch calls)', async () => {
    openfgaClient.post.mockResolvedValue({ id: 'new-store-02', name: 'Big' })
    const tuples = Array.from({ length: 250 }, (_, i) => ({
      user: `user:${i}`,
      relation: 'viewer',
      object: `doc:${i}`,
    }))
    openfgaClient.post
      .mockResolvedValueOnce({ id: 'new-store-02', name: 'Big' }) // create store
    // model is null, so 3 batch write calls for 250 tuples
    openfgaClient.post.mockResolvedValue({})

    await importToNewStore('Big', null, tuples)

    // 1 create store + 3 batch writes = 4 total calls
    expect(openfgaClient.post).toHaveBeenCalledTimes(4)
  })

  it('skips model write and sets modelWritten: false when model is null', async () => {
    openfgaClient.post
      .mockResolvedValueOnce({ id: 'store-x', name: 'Empty' })
      .mockResolvedValueOnce({}) // tuple write

    const result = await importToNewStore('Empty', null, [{ user: 'user:a', relation: 'r', object: 'obj:b' }])

    expect(result.modelWritten).toBe(false)
    // Only 2 calls: create store + 1 tuple batch
    expect(openfgaClient.post).toHaveBeenCalledTimes(2)
  })

  it('propagates store creation failure immediately', async () => {
    openfgaClient.post.mockRejectedValue(new Error('create failed'))

    await expect(importToNewStore('Fail', null, [])).rejects.toThrow('create failed')
  })
})

describe('importToExistingStore', () => {
  it('writes model and tuples to existing storeId', async () => {
    openfgaClient.post
      .mockResolvedValueOnce({}) // model write
      .mockResolvedValueOnce({}) // tuple write

    const result = await importToExistingStore('store-01', mockModel, mockTuples)

    expect(result).toEqual({
      storeId: 'store-01',
      storeName: '',
      modelWritten: true,
      tuplesImported: 2,
    })
    expect(openfgaClient.post.mock.calls[0][0]).toContain('/stores/store-01/authorization-models')
  })

  it('propagates error on second batch (no partial silencing)', async () => {
    const tuples = Array.from({ length: 150 }, (_, i) => ({
      user: `user:${i}`,
      relation: 'viewer',
      object: `doc:${i}`,
    }))
    openfgaClient.post
      .mockResolvedValueOnce({}) // first batch OK
      .mockRejectedValueOnce(new Error('batch 2 failed'))

    await expect(importToExistingStore('store-01', null, tuples)).rejects.toThrow('batch 2 failed')
  })
})
