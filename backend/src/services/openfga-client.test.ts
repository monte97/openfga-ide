import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config.js', () => ({
  config: {
    port: 3000,
    openfga: {
      url: 'http://test-openfga:8080',
      apiKey: 'test-key-123',
      storeId: 'store-abc',
    },
  },
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// Import after mocks
const { openfgaClient } = await import('./openfga-client.js')

describe('openfgaClient', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('exposes configured URL without API key', () => {
    expect(openfgaClient.url).toBe('http://test-openfga:8080')
    expect(openfgaClient.storeId).toBe('store-abc')
  })

  it('injects Authorization header on GET', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ stores: [] }) })
    await openfgaClient.get('/stores')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://test-openfga:8080/stores',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key-123',
        }),
      }),
    )
  })

  it('injects Authorization header on POST with body', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    await openfgaClient.post('/stores', { name: 'test' })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://test-openfga:8080/stores',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key-123',
        }),
      }),
    )
  })

  it('throws with statusCode on non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Store not found' }),
    })
    await expect(openfgaClient.get('/stores/bad')).rejects.toThrow('Store not found')
  })

  it('supports mutable URL update', () => {
    openfgaClient.updateUrl('http://new-host:9090')
    expect(openfgaClient.url).toBe('http://new-host:9090')
    openfgaClient.updateUrl('http://test-openfga:8080') // restore
  })

  it('testConnection calls /stores on target URL', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    await openfgaClient.testConnection('http://other:8080')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://other:8080/stores',
      expect.any(Object),
    )
  })

  it('testConnection throws on failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' })
    await expect(openfgaClient.testConnection('http://down:8080')).rejects.toThrow('Connection failed')
  })
})
