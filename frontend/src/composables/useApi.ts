import { useToast } from './useToast'

interface ApiOptions {
  signal?: AbortSignal
  silent?: boolean
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function useApi() {
  const toast = useToast()

  async function get<T>(path: string, options?: AbortSignal | ApiOptions): Promise<T> {
    const opts: ApiOptions = options instanceof AbortSignal ? { signal: options } : (options ?? {})
    let res: Response
    try {
      res = await fetch(`/api/${path}`, { signal: opts.signal })
    } catch (err) {
      if (isAbortError(err)) throw err
      if (!opts.silent) toast.show({ type: 'error', message: 'Network error' })
      throw new Error('Network error')
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const message = (body as { error?: string }).error || 'Request failed'
      if (!opts.silent) toast.show({ type: 'error', message })
      throw new Error(message)
    }
    return res.json() as Promise<T>
  }

  async function post<T>(path: string, body: unknown, options?: AbortSignal | ApiOptions): Promise<T> {
    const opts: ApiOptions = options instanceof AbortSignal ? { signal: options } : (options ?? {})
    let res: Response
    try {
      res = await fetch(`/api/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: opts.signal,
      })
    } catch (err) {
      if (isAbortError(err)) throw err
      if (!opts.silent) toast.show({ type: 'error', message: 'Network error' })
      throw new Error('Network error')
    }
    if (!res.ok) {
      const resBody = await res.json().catch(() => ({}))
      const message = (resBody as { error?: string }).error || 'Request failed'
      if (!opts.silent) toast.show({ type: 'error', message })
      throw new Error(message)
    }
    return res.json() as Promise<T>
  }

  async function put<T>(path: string, body: unknown, options?: AbortSignal | ApiOptions): Promise<T> {
    const opts: ApiOptions = options instanceof AbortSignal ? { signal: options } : (options ?? {})
    let res: Response
    try {
      res = await fetch(`/api/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: opts.signal,
      })
    } catch (err) {
      if (isAbortError(err)) throw err
      if (!opts.silent) toast.show({ type: 'error', message: 'Network error' })
      throw new Error('Network error')
    }
    if (!res.ok) {
      const resBody = await res.json().catch(() => ({}))
      const message = (resBody as { error?: string }).error || 'Request failed'
      if (!opts.silent) toast.show({ type: 'error', message })
      throw new Error(message)
    }
    return res.json() as Promise<T>
  }

  async function del<T>(path: string, body?: unknown, options?: AbortSignal | ApiOptions): Promise<T> {
    const opts: ApiOptions = options instanceof AbortSignal ? { signal: options } : (options ?? {})
    let res: Response
    try {
      const fetchOptions: RequestInit = { method: 'DELETE', signal: opts.signal }
      if (body !== undefined) {
        fetchOptions.headers = { 'Content-Type': 'application/json' }
        fetchOptions.body = JSON.stringify(body)
      }
      res = await fetch(`/api/${path}`, fetchOptions)
    } catch (err) {
      if (isAbortError(err)) throw err
      if (!opts.silent) toast.show({ type: 'error', message: 'Network error' })
      throw new Error('Network error')
    }
    if (!res.ok) {
      const resBody = await res.json().catch(() => ({}))
      const message = (resBody as { error?: string }).error || 'Request failed'
      if (!opts.silent) toast.show({ type: 'error', message })
      throw new Error(message)
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  return { get, post, put, del }
}
