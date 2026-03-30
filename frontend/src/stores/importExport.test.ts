import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToast } from '@/composables/useToast'
import { useImportExportStore } from './importExport'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url')
const revokeObjectURLMock = vi.fn()
vi.stubGlobal('URL', {
  createObjectURL: createObjectURLMock,
  revokeObjectURL: revokeObjectURLMock,
})

const anchorClickMock = vi.fn()
const mockAnchor = { href: '', download: '', click: anchorClickMock }
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'a') return mockAnchor as unknown as HTMLElement
  return document.createElement(tag)
})

const mockPayload = {
  storeName: 'My Store',
  exportedAt: '2026-03-27T10:00:00.000Z',
  model: { id: 'model-01', schema_version: '1.1', type_definitions: [] },
  tuples: [
    { user: 'user:alice', relation: 'viewer', object: 'doc:1' },
    { user: 'user:bob', relation: 'editor', object: 'doc:2' },
  ],
}

beforeEach(() => {
  setActivePinia(createPinia())
  fetchMock.mockReset()
  anchorClickMock.mockReset()
  createObjectURLMock.mockReset().mockReturnValue('blob:mock-url')
  revokeObjectURLMock.mockReset()
  const { toasts, dismiss } = useToast()
  ;[...toasts].forEach((t) => dismiss(t.id))
})

describe('useImportExportStore', () => {
  it('exportStore triggers browser download via Blob URL', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => mockPayload })

    const store = useImportExportStore()
    await store.exportStore('store-01', 'My Store')

    expect(createObjectURLMock).toHaveBeenCalledOnce()
    expect(anchorClickMock).toHaveBeenCalledOnce()
    expect(revokeObjectURLMock).toHaveBeenCalledOnce()
  })

  it('exportStore shows success toast with correct tuple count', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => mockPayload })
    const { toasts } = useToast()

    const store = useImportExportStore()
    await store.exportStore('store-01', 'My Store')

    expect([...toasts].some((t) => t.message.includes('2 tuples exported'))).toBe(true)
  })

  it('exportStore uses "Backup" label when specified', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => mockPayload })
    const { toasts } = useToast()

    const store = useImportExportStore()
    await store.exportStore('store-01', 'My Store', 'Backup')

    expect([...toasts].some((t) => t.message.startsWith('Backup complete'))).toBe(true)
  })

  it('exportStore sets error and shows error toast on failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, text: async () => 'server error' })

    const store = useImportExportStore()
    await store.exportStore('store-01', 'My Store')

    expect(store.error).toBe('server error')
    const { toasts } = useToast()
    expect([...toasts].some((t) => t.type === 'error')).toBe(true)
  })

  it('loading is true during fetch and false after', async () => {
    let resolveReq!: (v: unknown) => void
    fetchMock.mockReturnValue(new Promise((res) => { resolveReq = res }))

    const store = useImportExportStore()
    const promise = store.exportStore('store-01', 'My Store')
    expect(store.loading).toBe(true)
    resolveReq({ ok: true, json: async () => mockPayload })
    await promise
    expect(store.loading).toBe(false)
  })
})
