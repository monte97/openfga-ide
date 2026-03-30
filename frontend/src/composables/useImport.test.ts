import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToast } from '@/composables/useToast'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const mockPayload = {
  model: { schema_version: '1.1', type_definitions: [] },
  tuples: [{ user: 'user:alice', relation: 'viewer', object: 'doc:1' }],
}

const mockResult = {
  storeId: 'new-store-01',
  storeName: 'Restored',
  modelWritten: true,
  tuplesImported: 1,
}

describe('useImport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  it('importToNewStore calls POST /api/import, selectStore, and shows success toast', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => mockResult,
    })
    const { useImport } = await import('./useImport')
    const { importToNewStore } = useImport()
    const result = await importToNewStore('Restored', mockPayload)

    expect(result.storeId).toBe('new-store-01')
    const { toasts } = useToast()
    expect([...toasts].some((t) => t.message.includes('1 tuples imported'))).toBe(true)
    // selectStore should have been called with the returned storeId
    const { useConnectionStore } = await import('@/stores/connection')
    const connectionStore = useConnectionStore()
    expect(connectionStore.storeId).toBe('new-store-01')
    // fetchStores was triggered (at least 2 fetch calls: import POST + fetchStores GET)
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('importToNewStore sets importError and rethrows on error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'bad request' }),
    })
    const { useImport } = await import('./useImport')
    const { importing, importError, importToNewStore } = useImport()

    await expect(importToNewStore('X', mockPayload)).rejects.toThrow()
    expect(importError.value).toBeTruthy()
    expect(importing.value).toBe(false)
  })

  it('importToCurrentStore calls POST /api/stores/{storeId}/import with current storeId', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...mockResult, storeId: 'current-store' }) })

    const { useConnectionStore } = await import('@/stores/connection')
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('current-store')

    const { useImport } = await import('./useImport')
    const { importToCurrentStore } = useImport()
    await importToCurrentStore(mockPayload)

    const callUrl = fetchMock.mock.calls[0][0] as string
    expect(callUrl).toContain('/api/stores/current-store/import')
  })

  it('importToStore calls POST /api/stores/{targetId}/import with specified storeId', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...mockResult, storeId: 'target-store' }) })

    const { useImport } = await import('./useImport')
    const { importToStore } = useImport()
    await importToStore('target-store', mockPayload)

    const callUrl = fetchMock.mock.calls[0][0] as string
    expect(callUrl).toContain('/api/stores/target-store/import')
  })

  it('importing is true during request and false after', async () => {
    let resolveReq!: (v: unknown) => void
    fetchMock.mockReturnValue(new Promise((res) => { resolveReq = res }))

    const { useImport } = await import('./useImport')
    const { importing, importToCurrentStore } = useImport()

    const promise = importToCurrentStore(mockPayload).catch(() => {})
    expect(importing.value).toBe(true)
    resolveReq({ ok: true, json: async () => mockResult })
    await promise
    expect(importing.value).toBe(false)
  })
})
