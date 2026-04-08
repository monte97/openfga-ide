import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Server } from 'node:http'

// Mock pool availability — default to available
vi.mock('../../test-suites/db/pool.js', () => ({
  isAvailable: vi.fn().mockReturnValue(true),
}))

// Mock all other services/clients that app.ts imports (needed for existing routes)
vi.mock('../../services/openfga-client.js', () => ({
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

vi.mock('../services/suite-service.js', () => ({
  listSuites: vi.fn(),
  getSuite: vi.fn(),
  createSuite: vi.fn(),
  updateSuite: vi.fn(),
  deleteSuite: vi.fn(),
}))

const poolModule = await import('../../test-suites/db/pool.js')
const mockIsAvailable = vi.mocked(poolModule.isAvailable)

const svc = await import('../services/suite-service.js')
const mockListSuites = vi.mocked(svc.listSuites)
const mockGetSuite = vi.mocked(svc.getSuite)
const mockCreateSuite = vi.mocked(svc.createSuite)
const mockUpdateSuite = vi.mocked(svc.updateSuite)
const mockDeleteSuite = vi.mocked(svc.deleteSuite)

import app from '../../app.js'

let server: Server
const PORT = 3097
const base = `http://localhost:${PORT}`

beforeAll(() => {
  server = app.listen(PORT)
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  vi.clearAllMocks()
  mockIsAvailable.mockReturnValue(true)
})

const sampleSuite = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  name: 'My Suite',
  description: null,
  tags: [],
  definition: null,
  createdAt: '2026-03-31T10:00:00Z',
  updatedAt: '2026-03-31T10:00:00Z',
}

describe('GET /api/suites', () => {
  it('returns 503 when database is not available', async () => {
    mockIsAvailable.mockReturnValue(false)
    const res = await fetch(`${base}/api/suites`)
    expect(res.status).toBe(503)
    const body = await res.json() as Record<string, unknown>
    expect(body).toEqual({ error: 'Database not configured' })
  })

  it('returns suite list', async () => {
    mockListSuites.mockResolvedValue([sampleSuite])
    const res = await fetch(`${base}/api/suites`)
    expect(res.status).toBe(200)
    const body = await res.json() as { suites: unknown[] }
    expect(body.suites).toHaveLength(1)
  })
})

describe('POST /api/suites', () => {
  it('creates a suite and returns 201', async () => {
    mockCreateSuite.mockResolvedValue(sampleSuite)
    const res = await fetch(`${base}/api/suites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Suite' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as Record<string, unknown>
    expect(body.id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479')
  })

  it('returns 400 when name is missing', async () => {
    const res = await fetch(`${base}/api/suites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Validation error')
  })

  it('returns 400 when name is empty string', async () => {
    const res = await fetch(`${base}/api/suites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/suites/:suiteId', () => {
  it('returns suite when found', async () => {
    mockGetSuite.mockResolvedValue(sampleSuite)
    const res = await fetch(`${base}/api/suites/f47ac10b-58cc-4372-a567-0e02b2c3d479`)
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479')
  })

  it('returns 404 when suite not found', async () => {
    mockGetSuite.mockRejectedValue(
      Object.assign(new Error('Suite not found'), { statusCode: 404 }),
    )
    const res = await fetch(`${base}/api/suites/f47ac10b-58cc-4372-a567-0e02b2c3d400`)
    expect(res.status).toBe(404)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Suite not found')
  })

  it('returns 400 when suiteId is not a valid UUID', async () => {
    const res = await fetch(`${base}/api/suites/not-a-uuid`)
    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Validation error')
  })
})

describe('PUT /api/suites/:suiteId', () => {
  it('updates suite and returns updated', async () => {
    const updated = { ...sampleSuite, name: 'Updated' }
    mockUpdateSuite.mockResolvedValue(updated)
    const res = await fetch(`${base}/api/suites/f47ac10b-58cc-4372-a567-0e02b2c3d479`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.name).toBe('Updated')
  })

  it('returns 400 for invalid definition structure', async () => {
    const res = await fetch(`${base}/api/suites/f47ac10b-58cc-4372-a567-0e02b2c3d479`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition: { groups: 'not-an-array' } }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 when suite not found', async () => {
    mockUpdateSuite.mockRejectedValue(
      Object.assign(new Error('Suite not found'), { statusCode: 404 }),
    )
    const res = await fetch(`${base}/api/suites/f47ac10b-58cc-4372-a567-0e02b2c3d400`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns 400 when body has no updatable fields', async () => {
    mockUpdateSuite.mockRejectedValue(
      Object.assign(new Error('No fields to update'), { statusCode: 400 }),
    )
    const res = await fetch(`${base}/api/suites/f47ac10b-58cc-4372-a567-0e02b2c3d479`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('accepts description: null to clear the field', async () => {
    const cleared = { ...sampleSuite, description: null }
    mockUpdateSuite.mockResolvedValue(cleared)
    const res = await fetch(`${base}/api/suites/f47ac10b-58cc-4372-a567-0e02b2c3d479`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: null }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.description).toBeNull()
  })
})

describe('GET /api/suites/:suiteId/export', () => {
  it('returns export shape without id/timestamps', async () => {
    mockGetSuite.mockResolvedValue(sampleSuite)
    const res = await fetch(`${base}/api/suites/f47ac10b-58cc-4372-a567-0e02b2c3d479/export`)
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body).toEqual({
      name: 'My Suite',
      description: null,
      tags: [],
      definition: null,
    })
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('createdAt')
    expect(body).not.toHaveProperty('updatedAt')
  })

  it('returns 404 when suite not found', async () => {
    mockGetSuite.mockRejectedValue(
      Object.assign(new Error('Suite not found'), { statusCode: 404 }),
    )
    const res = await fetch(`${base}/api/suites/f47ac10b-58cc-4372-a567-0e02b2c3d400/export`)
    expect(res.status).toBe(404)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Suite not found')
  })
})

describe('DELETE /api/suites/:suiteId', () => {
  it('returns 204 on successful delete', async () => {
    mockDeleteSuite.mockResolvedValue(undefined)
    const res = await fetch(`${base}/api/suites/f47ac10b-58cc-4372-a567-0e02b2c3d479`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(204)
  })

  it('returns 404 when suite not found', async () => {
    mockDeleteSuite.mockRejectedValue(
      Object.assign(new Error('Suite not found'), { statusCode: 404 }),
    )
    const res = await fetch(`${base}/api/suites/f47ac10b-58cc-4372-a567-0e02b2c3d400`, {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Suite not found')
  })
})
