import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
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

vi.mock('../services/store-service.js', () => ({
  createStore: vi.fn(),
  deleteStore: vi.fn(),
}))

const { openfgaClient } = await import('../services/openfga-client.js')
const mockClient = openfgaClient as unknown as { get: ReturnType<typeof vi.fn> }

const { createStore: mockCreateStore, deleteStore: mockDeleteStore } = await import('../services/store-service.js') as {
  createStore: ReturnType<typeof vi.fn>
  deleteStore: ReturnType<typeof vi.fn>
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

describe('GET /api/stores', () => {
  it('returns store list from OpenFGA', async () => {
    mockClient.get.mockResolvedValue({
      stores: [
        { id: 'store-1', name: 'My Store', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      ],
      continuation_token: '',
    })

    const res = await fetch(`${base}/api/stores`)
    expect(res.status).toBe(200)
    const body = await res.json() as { stores: unknown[] }
    expect(body).toHaveProperty('stores')
    expect(body.stores).toHaveLength(1)
  })

  it('returns empty store list when no stores exist', async () => {
    mockClient.get.mockResolvedValue({ stores: [] })

    const res = await fetch(`${base}/api/stores`)
    expect(res.status).toBe(200)
    const body = await res.json() as { stores: unknown[] }
    expect(body.stores).toHaveLength(0)
  })

  it('returns 500 when OpenFGA is unreachable', async () => {
    mockClient.get.mockRejectedValue(
      Object.assign(new Error('Connection refused'), { statusCode: 503 })
    )

    const res = await fetch(`${base}/api/stores`)
    expect(res.status).toBe(503)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })
})

describe('POST /api/stores', () => {
  it('creates a store and returns 201', async () => {
    const created = { id: 'store-new', name: 'New Store', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
    mockCreateStore.mockResolvedValue(created)

    const res = await fetch(`${base}/api/stores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Store' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as Record<string, unknown>
    expect(body.name).toBe('New Store')
    expect(body.id).toBe('store-new')
  })

  it('returns 400 when name is missing', async () => {
    const res = await fetch(`${base}/api/stores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Validation error')
  })

  it('returns 400 when name is empty string', async () => {
    const res = await fetch(`${base}/api/stores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/stores/:storeId', () => {
  it('returns 204 on successful deletion', async () => {
    mockDeleteStore.mockResolvedValue(undefined)

    const res = await fetch(`${base}/api/stores/store-to-delete`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(204)
  })

  it('returns 404 when store not found', async () => {
    mockDeleteStore.mockRejectedValue(
      Object.assign(new Error('Store not found'), { statusCode: 404 })
    )

    const res = await fetch(`${base}/api/stores/nonexistent`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })
})
