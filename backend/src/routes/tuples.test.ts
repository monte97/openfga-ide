import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import app from '../app.js'
import type { Server } from 'node:http'

vi.mock('../services/openfga-client.js', () => ({
  openfgaClient: {
    url: 'http://test-openfga:8080',
    storeId: '',
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    testConnection: vi.fn(),
    updateUrl: vi.fn(),
  },
}))

vi.mock('../services/tuple-service.js', () => ({
  readTuples: vi.fn(),
  writeTuple: vi.fn(),
  deleteTuple: vi.fn(),
  deleteTuplesBatch: vi.fn(),
}))

const {
  readTuples: mockReadTuples,
  writeTuple: mockWriteTuple,
  deleteTuple: mockDeleteTuple,
  deleteTuplesBatch: mockDeleteTuplesBatch,
} = await import('../services/tuple-service.js') as {
  readTuples: ReturnType<typeof vi.fn>
  writeTuple: ReturnType<typeof vi.fn>
  deleteTuple: ReturnType<typeof vi.fn>
  deleteTuplesBatch: ReturnType<typeof vi.fn>
}

let server: Server

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, resolve).on('error', reject)
  })
  base = `http://localhost:${(server.address() as { port: number }).port}`
})

afterAll(() => {
  server.close()
})

let base: string

beforeEach(() => {
  mockReadTuples.mockReset()
  mockWriteTuple.mockReset()
  mockDeleteTuple.mockReset()
  mockDeleteTuplesBatch.mockReset()
})

describe('GET /api/stores/:storeId/tuples', () => {
  it('returns 200 with tuples and continuationToken', async () => {
    mockReadTuples.mockResolvedValue({
      tuples: [{ key: { user: 'user:alice', relation: 'viewer', object: 'document:roadmap' }, timestamp: '2026-01-01T00:00:00Z' }],
      continuationToken: null,
    })

    const res = await fetch(`${base}/api/stores/store-01/tuples`)
    expect(res.status).toBe(200)
    const body = await res.json() as { tuples: unknown[]; continuationToken: unknown }
    expect(body.tuples).toHaveLength(1)
    expect(body.continuationToken).toBeNull()
  })

  it('passes query filters to service', async () => {
    mockReadTuples.mockResolvedValue({ tuples: [], continuationToken: null })

    await fetch(`${base}/api/stores/store-01/tuples?type=user&relation=viewer`)
    expect(mockReadTuples).toHaveBeenCalledWith('store-01', expect.objectContaining({
      type: 'user',
      relation: 'viewer',
    }))
  })
})

describe('POST /api/stores/:storeId/tuples', () => {
  it('returns 201 with the created tuple key', async () => {
    const tupleKey = { user: 'user:alice', relation: 'viewer', object: 'document:roadmap' }
    mockWriteTuple.mockResolvedValue(tupleKey)

    const res = await fetch(`${base}/api/stores/store-01/tuples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tupleKey),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as Record<string, unknown>
    expect(body.user).toBe('user:alice')
  })

  it('returns 400 when fields are missing', async () => {
    const res = await fetch(`${base}/api/stores/store-01/tuples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'user:alice' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Validation error')
  })
})

describe('DELETE /api/stores/:storeId/tuples', () => {
  it('returns 200 on successful single delete', async () => {
    mockDeleteTuple.mockResolvedValue(undefined)

    const res = await fetch(`${base}/api/stores/store-01/tuples`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'user:alice', relation: 'viewer', object: 'document:roadmap' }),
    })
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/stores/:storeId/tuples/batch', () => {
  it('returns 200 with deleted count', async () => {
    mockDeleteTuplesBatch.mockResolvedValue({ deleted: 2 })

    const res = await fetch(`${base}/api/stores/store-01/tuples/batch`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deletes: [
          { user: 'user:alice', relation: 'viewer', object: 'document:roadmap' },
          { user: 'user:bob', relation: 'editor', object: 'document:spec' },
        ],
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { deleted: number }
    expect(body.deleted).toBe(2)
  })

  it('returns 400 when deletes array is empty', async () => {
    const res = await fetch(`${base}/api/stores/store-01/tuples/batch`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deletes: [] }),
    })
    expect(res.status).toBe(400)
  })
})

describe('Error handling', () => {
  it('returns error status when service throws', async () => {
    mockReadTuples.mockRejectedValue(
      Object.assign(new Error('Store not found'), { statusCode: 404 }),
    )

    const res = await fetch(`${base}/api/stores/bad-store/tuples`)
    expect(res.status).toBe(404)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })
})
