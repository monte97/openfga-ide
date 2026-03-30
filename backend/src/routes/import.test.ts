import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import app from '../app.js'
import type { Server } from 'node:http'

vi.mock('../services/import-service.js', () => ({
  importToNewStore: vi.fn(),
  importToExistingStore: vi.fn(),
}))

const { importToNewStore: mockImportNew, importToExistingStore: mockImportExisting } =
  await import('../services/import-service.js') as {
    importToNewStore: ReturnType<typeof vi.fn>
    importToExistingStore: ReturnType<typeof vi.fn>
  }

let server: Server
const PORT = 3093

beforeAll(async () => {
  server = app.listen(PORT)
})

afterAll(() => {
  server.close()
})

const base = `http://localhost:${PORT}`

beforeEach(() => {
  mockImportNew.mockReset()
  mockImportExisting.mockReset()
})

const validBody = {
  storeName: 'Restored Store',
  model: { schema_version: '1.1', type_definitions: [] },
  tuples: [{ user: 'user:alice', relation: 'viewer', object: 'doc:1' }],
}

const mockImportResult = {
  storeId: 'new-store-01',
  storeName: 'Restored Store',
  modelWritten: true,
  tuplesImported: 1,
}

describe('POST /api/import', () => {
  it('returns 201 with ImportResult for valid body', async () => {
    mockImportNew.mockResolvedValue(mockImportResult)

    const res = await fetch(`${base}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as typeof mockImportResult
    expect(body.storeId).toBe('new-store-01')
    expect(body.tuplesImported).toBe(1)
  })

  it('returns 400 when storeName is missing', async () => {
    const { storeName: _, ...bodyWithoutName } = validBody
    const res = await fetch(`${base}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithoutName),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when tuples field is missing', async () => {
    const res = await fetch(`${base}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName: 'S', model: null }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 500 when service throws', async () => {
    mockImportNew.mockRejectedValue(new Error('service error'))

    const res = await fetch(`${base}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(500)
  })
})

describe('POST /api/stores/:storeId/import', () => {
  it('returns 200 with ImportResult for valid body', async () => {
    const existingResult = { storeId: 'store-01', storeName: '', modelWritten: true, tuplesImported: 1 }
    mockImportExisting.mockResolvedValue(existingResult)

    const res = await fetch(`${base}/api/stores/store-01/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: null, tuples: validBody.tuples }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as typeof existingResult
    expect(body.storeId).toBe('store-01')
  })

  it('returns 400 when tuples field is missing', async () => {
    const res = await fetch(`${base}/api/stores/store-01/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: null }),
    })
    expect(res.status).toBe(400)
  })

  it('returns error envelope when service throws', async () => {
    mockImportExisting.mockRejectedValue(new Error('import failed'))

    const res = await fetch(`${base}/api/stores/store-01/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: null, tuples: [] }),
    })
    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body.error).toBeDefined()
  })
})
