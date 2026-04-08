import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import app from '../app.js'
import type { Server } from 'node:http'

vi.mock('../services/model-service.js', () => ({
  getModel: vi.fn(),
}))

vi.mock('@openfga/syntax-transformer', () => ({
  default: {
    transformer: {
      transformJSONStringToDSL: vi.fn().mockReturnValue('model\n  schema 1.1'),
    },
  },
}))

const { getModel: mockGetModel } = await import('../services/model-service.js') as {
  getModel: ReturnType<typeof vi.fn>
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

const sampleModelResponse = {
  json: {
    id: 'model-01',
    schema_version: '1.1',
    type_definitions: [{ type: 'user', relations: {}, metadata: null }],
    conditions: {},
  },
  dsl: 'model\n  schema 1.1\n\ntype user',
  authorizationModelId: 'model-01',
}

describe('GET /api/stores/:storeId/model', () => {
  it('returns 200 with model data when model exists', async () => {
    mockGetModel.mockResolvedValue(sampleModelResponse)

    const res = await fetch(`${base}/api/stores/store-01/model`)
    expect(res.status).toBe(200)
    const body = await res.json() as typeof sampleModelResponse
    expect(body.authorizationModelId).toBe('model-01')
    expect(body.dsl).toBe('model\n  schema 1.1\n\ntype user')
    expect(body.json).toHaveProperty('schema_version', '1.1')
  })

  it('returns 200 with null fields when no model exists', async () => {
    mockGetModel.mockResolvedValue({ json: null, dsl: null, authorizationModelId: null })

    const res = await fetch(`${base}/api/stores/store-empty/model`)
    expect(res.status).toBe(200)
    const body = await res.json() as { json: null; dsl: null; authorizationModelId: null }
    expect(body).toEqual({ json: null, dsl: null, authorizationModelId: null })
  })

  it('returns 404 when service throws a 404 error', async () => {
    mockGetModel.mockRejectedValue(
      Object.assign(new Error('Store not found'), { statusCode: 404 }),
    )

    const res = await fetch(`${base}/api/stores/nonexistent/model`)
    expect(res.status).toBe(404)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Store not found')
  })

  it('returns 500 when OpenFGA is unreachable', async () => {
    mockGetModel.mockRejectedValue(
      Object.assign(new Error('Connection refused'), { statusCode: 503 }),
    )

    const res = await fetch(`${base}/api/stores/store-01/model`)
    expect(res.status).toBe(503)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error')
  })
})
