import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useToast } from '../useToast'
import { useApi } from '../useApi'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('useApi', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  it('get() prepends /api/ prefix', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ stores: [] }),
    })
    const { get } = useApi()
    await get('stores')
    expect(fetchMock).toHaveBeenCalledWith('/api/stores', expect.any(Object))
  })

  it('get() returns typed data on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ stores: [{ id: '1', name: 'test' }] }),
    })
    const { get } = useApi()
    const result = await get<{ stores: { id: string; name: string }[] }>('stores')
    expect(result.stores).toHaveLength(1)
    expect(result.stores[0].id).toBe('1')
  })

  it('get() parses error envelope on failure and triggers toast', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Store not found' }),
    })
    const { get } = useApi()
    const { toasts } = useToast()

    await expect(get('stores/bad')).rejects.toThrow('Store not found')
    expect(toasts.some((t) => t.message === 'Store not found' && t.type === 'error')).toBe(true)
  })

  it('get() shows "Network error" toast on fetch failure', async () => {
    fetchMock.mockRejectedValue(new Error('Failed to fetch'))
    const { get } = useApi()
    const { toasts } = useToast()

    await expect(get('stores')).rejects.toThrow('Network error')
    expect(toasts.some((t) => t.message === 'Network error' && t.type === 'error')).toBe(true)
  })

  it('post() prepends /api/ prefix with body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new-store' }),
    })
    const { post } = useApi()
    await post('stores', { name: 'my-store' })
    expect(fetchMock).toHaveBeenCalledWith('/api/stores', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'my-store' }),
    }))
  })
})
