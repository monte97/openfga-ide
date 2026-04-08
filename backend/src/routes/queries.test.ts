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

vi.mock('../services/query-service.js', () => ({
  check: vi.fn(),
  listObjects: vi.fn(),
  listUsers: vi.fn(),
  expand: vi.fn(),
}))

const {
  check: mockCheck,
  listObjects: mockListObjects,
  listUsers: mockListUsers,
  expand: mockExpand,
} = await import('../services/query-service.js') as {
  check: ReturnType<typeof vi.fn>
  listObjects: ReturnType<typeof vi.fn>
  listUsers: ReturnType<typeof vi.fn>
  expand: ReturnType<typeof vi.fn>
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
  mockCheck.mockReset()
  mockListObjects.mockReset()
  mockListUsers.mockReset()
  mockExpand.mockReset()
})

describe('POST /api/stores/:storeId/query/check', () => {
  it('returns 200 with allowed boolean', async () => {
    mockCheck.mockResolvedValue({ allowed: true })

    const res = await fetch(`${base}/api/stores/store-01/query/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'user:alice', relation: 'viewer', object: 'document:roadmap' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { allowed: boolean }
    expect(body.allowed).toBe(true)
  })

  it('returns 400 when fields are missing', async () => {
    const res = await fetch(`${base}/api/stores/store-01/query/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'user:alice' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/stores/:storeId/query/list-objects', () => {
  it('returns 200 with objects array', async () => {
    mockListObjects.mockResolvedValue({ objects: ['document:roadmap'] })

    const res = await fetch(`${base}/api/stores/store-01/query/list-objects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'user:alice', relation: 'viewer', type: 'document' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { objects: string[] }
    expect(body.objects).toEqual(['document:roadmap'])
  })

  it('returns 400 when fields are missing', async () => {
    const res = await fetch(`${base}/api/stores/store-01/query/list-objects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'user:alice' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/stores/:storeId/query/list-users', () => {
  it('returns 200 with users array', async () => {
    mockListUsers.mockResolvedValue({ users: ['user:alice', 'user:marco'] })

    const res = await fetch(`${base}/api/stores/store-01/query/list-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ object: { type: 'document', id: 'roadmap' }, relation: 'viewer' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { users: string[] }
    expect(body.users).toEqual(['user:alice', 'user:marco'])
  })

  it('returns 400 when fields are missing', async () => {
    const res = await fetch(`${base}/api/stores/store-01/query/list-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relation: 'viewer' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/stores/:storeId/query/expand', () => {
  it('returns 200 with tree', async () => {
    const tree = { root: { name: 'document:roadmap#viewer' } }
    mockExpand.mockResolvedValue({ tree })

    const res = await fetch(`${base}/api/stores/store-01/query/expand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relation: 'viewer', object: 'document:roadmap' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { tree: unknown }
    expect(body.tree).toEqual(tree)
  })

  it('returns 400 when fields are missing', async () => {
    const res = await fetch(`${base}/api/stores/store-01/query/expand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relation: 'viewer' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('Error handling', () => {
  it('returns error status when service throws', async () => {
    mockCheck.mockRejectedValue(
      Object.assign(new Error('Store not found'), { statusCode: 404 }),
    )

    const res = await fetch(`${base}/api/stores/bad/query/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'u:a', relation: 'r', object: 'o:b' }),
    })
    expect(res.status).toBe(404)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })
})
