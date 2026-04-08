import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToast } from '@/composables/useToast'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function makeOkResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

function makeErrorResponse(error: string, status = 400) {
  return { ok: false, status, json: async () => ({ error }) }
}

describe('useApi', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  describe('get()', () => {
    it('passes signal to fetch', async () => {
      const { useApi } = await import('./useApi')
      const api = useApi()
      const controller = new AbortController()
      fetchMock.mockResolvedValue(makeOkResponse({ ok: true }))
      await api.get('test', controller.signal)
      expect(fetchMock).toHaveBeenCalledWith('/api/test', { signal: controller.signal })
    })

    it('calls fetch without options object when signal is undefined', async () => {
      const { useApi } = await import('./useApi')
      const api = useApi()
      fetchMock.mockResolvedValue(makeOkResponse({ ok: true }))
      await api.get('test')
      expect(fetchMock).toHaveBeenCalledWith('/api/test')
    })

    it('rethrows AbortError without showing toast', async () => {
      const { useApi } = await import('./useApi')
      const api = useApi()
      const { toasts } = useToast()
      const controller = new AbortController()
      controller.abort()
      const abortError = new DOMException('Aborted', 'AbortError')
      fetchMock.mockRejectedValue(abortError)
      await expect(api.get('test', controller.signal)).rejects.toBe(abortError)
      expect(toasts.length).toBe(0)
    })

    it('shows toast and throws on network error', async () => {
      const { useApi } = await import('./useApi')
      const api = useApi()
      const { toasts } = useToast()
      fetchMock.mockRejectedValue(new Error('network'))
      await expect(api.get('test')).rejects.toThrow('Network error')
      expect(toasts.length).toBe(1)
      expect(toasts[0].type).toBe('error')
    })

    it('shows toast and throws on non-ok response', async () => {
      const { useApi } = await import('./useApi')
      const api = useApi()
      const { toasts } = useToast()
      fetchMock.mockResolvedValue(makeErrorResponse('Not found', 404))
      await expect(api.get('test')).rejects.toThrow('Not found')
      expect(toasts.length).toBe(1)
    })
  })

  describe('put()', () => {
    it('passes signal to fetch', async () => {
      const { useApi } = await import('./useApi')
      const api = useApi()
      const controller = new AbortController()
      fetchMock.mockResolvedValue(makeOkResponse({}))
      await api.put('test', { foo: 'bar' }, controller.signal)
      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(options.signal).toBe(controller.signal)
      expect(options.method).toBe('PUT')
    })

    it('rethrows AbortError without showing toast', async () => {
      const { useApi } = await import('./useApi')
      const api = useApi()
      const { toasts } = useToast()
      const abortError = new DOMException('Aborted', 'AbortError')
      fetchMock.mockRejectedValue(abortError)
      await expect(api.put('test', {}, new AbortController().signal)).rejects.toBe(abortError)
      expect(toasts.length).toBe(0)
    })
  })

  describe('post()', () => {
    it('passes signal to fetch', async () => {
      const { useApi } = await import('./useApi')
      const api = useApi()
      const controller = new AbortController()
      fetchMock.mockResolvedValue(makeOkResponse({}))
      await api.post('test', { foo: 'bar' }, controller.signal)
      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(options.signal).toBe(controller.signal)
      expect(options.method).toBe('POST')
    })

    it('rethrows AbortError without showing toast', async () => {
      const { useApi } = await import('./useApi')
      const api = useApi()
      const { toasts } = useToast()
      const abortError = new DOMException('Aborted', 'AbortError')
      fetchMock.mockRejectedValue(abortError)
      await expect(api.post('test', {}, new AbortController().signal)).rejects.toBe(abortError)
      expect(toasts.length).toBe(0)
    })
  })

  describe('del()', () => {
    it('passes signal to fetch', async () => {
      const { useApi } = await import('./useApi')
      const api = useApi()
      const controller = new AbortController()
      fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
      await api.del('test', undefined, controller.signal)
      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(options.signal).toBe(controller.signal)
      expect(options.method).toBe('DELETE')
    })

    it('rethrows AbortError without showing toast', async () => {
      const { useApi } = await import('./useApi')
      const api = useApi()
      const { toasts } = useToast()
      const abortError = new DOMException('Aborted', 'AbortError')
      fetchMock.mockRejectedValue(abortError)
      await expect(api.del('test', undefined, new AbortController().signal)).rejects.toBe(abortError)
      expect(toasts.length).toBe(0)
    })
  })
})
