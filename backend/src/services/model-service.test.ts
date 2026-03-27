import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./openfga-client.js', () => ({
  openfgaClient: {
    get: vi.fn(),
  },
}))

vi.mock('../logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}))

const mockTransformJSONStringToDSL = vi.fn()

vi.mock('@openfga/syntax-transformer', () => ({
  default: {
    transformer: {
      transformJSONStringToDSL: mockTransformJSONStringToDSL,
    },
  },
}))

const { openfgaClient } = await import('./openfga-client.js')
const mockGet = openfgaClient as unknown as { get: ReturnType<typeof vi.fn> }

const { logger } = await import('../logger.js')
const mockLogger = logger as unknown as { warn: ReturnType<typeof vi.fn> }

const { getModel } = await import('./model-service.js')

const sampleModel = {
  id: 'model-01',
  schema_version: '1.1',
  type_definitions: [
    { type: 'user', relations: {}, metadata: null },
    { type: 'document', relations: {}, metadata: null },
  ],
  conditions: {},
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTransformJSONStringToDSL.mockReturnValue('model\n  schema 1.1\n\ntype user\n\ntype document')
})

describe('getModel', () => {
  it('returns json, dsl, and authorizationModelId when model exists and transformer succeeds', async () => {
    mockGet.get.mockResolvedValue({
      authorization_models: [sampleModel],
      continuation_token: '',
    })

    const result = await getModel('store-01')

    expect(result.authorizationModelId).toBe('model-01')
    expect(result.json).toEqual(sampleModel)
    expect(result.dsl).toBe('model\n  schema 1.1\n\ntype user\n\ntype document')
    expect(mockTransformJSONStringToDSL).toHaveBeenCalledWith(JSON.stringify(sampleModel))
  })

  it('returns null fields when no model exists', async () => {
    mockGet.get.mockResolvedValue({
      authorization_models: [],
      continuation_token: '',
    })

    const result = await getModel('store-empty')

    expect(result).toEqual({ json: null, dsl: null, authorizationModelId: null })
    expect(mockTransformJSONStringToDSL).not.toHaveBeenCalled()
  })

  it('returns null fields when authorization_models is missing from response', async () => {
    mockGet.get.mockResolvedValue({})

    const result = await getModel('store-bad')

    expect(result).toEqual({ json: null, dsl: null, authorizationModelId: null })
  })

  it('returns json with dsl:null and logs warning when transformer throws', async () => {
    mockGet.get.mockResolvedValue({
      authorization_models: [sampleModel],
    })
    mockTransformJSONStringToDSL.mockImplementation(() => {
      throw new Error('conversion error')
    })

    const result = await getModel('store-01')

    expect(result.json).toEqual(sampleModel)
    expect(result.authorizationModelId).toBe('model-01')
    expect(result.dsl).toBeNull()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: 'model-01' }),
      'DSL conversion failed',
    )
  })

  it('propagates errors from openfgaClient.get', async () => {
    const err = Object.assign(new Error('Store not found'), { statusCode: 404 })
    mockGet.get.mockRejectedValue(err)

    await expect(getModel('nonexistent')).rejects.toThrow('Store not found')
  })
})
