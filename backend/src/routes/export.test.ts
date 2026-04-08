import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import app from '../app.js'
import type { Server } from 'node:http'

vi.mock('../services/export-service.js', () => ({
  exportStore: vi.fn(),
}))

const { exportStore: mockExportStore } = await import('../services/export-service.js') as {
  exportStore: ReturnType<typeof vi.fn>
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
  mockExportStore.mockReset()
})

const mockPayload = {
  storeName: 'My Store',
  exportedAt: '2026-03-27T10:00:00.000Z',
  model: { id: 'model-01', schema_version: '1.1', type_definitions: [] },
  tuples: [{ user: 'user:alice', relation: 'viewer', object: 'doc:1' }],
}

describe('GET /api/stores/:storeId/export', () => {
  it('returns 200 with correct JSON body', async () => {
    mockExportStore.mockResolvedValue(mockPayload)

    const res = await fetch(`${base}/api/stores/store-01/export`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      storeName: 'My Store',
      exportedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      model: expect.objectContaining({ id: 'model-01' }),
      tuples: expect.arrayContaining([expect.objectContaining({ user: 'user:alice' })]),
    })
  })

  it('returns Content-Disposition attachment header', async () => {
    mockExportStore.mockResolvedValue(mockPayload)

    const res = await fetch(`${base}/api/stores/store-01/export`)
    const disposition = res.headers.get('content-disposition') ?? ''
    expect(disposition).toContain('attachment')
    expect(disposition).toContain('filename=')
  })

  it('returns model: null and tuples: [] for empty store', async () => {
    const emptyPayload = {
      storeName: 'Empty',
      exportedAt: '2026-03-27T10:00:00.000Z',
      model: null,
      tuples: [],
    }
    mockExportStore.mockResolvedValue(emptyPayload)

    const res = await fetch(`${base}/api/stores/store-01/export`)
    expect(res.status).toBe(200)
    const body = await res.json() as typeof emptyPayload
    expect(body.model).toBeNull()
    expect(body.tuples).toEqual([])
  })

  it('returns 404 when storeId path segment is empty', async () => {
    const res = await fetch(`${base}/api/stores//export`)
    expect(res.status).toBe(404)
  })

  it('returns 500 when service throws', async () => {
    mockExportStore.mockRejectedValue(new Error('service error'))

    const res = await fetch(`${base}/api/stores/store-01/export`)
    expect(res.status).toBe(500)
  })
})
