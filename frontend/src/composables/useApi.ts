import { useToast } from './useToast'

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function useApi() {
  const toast = useToast()

  async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
    let res: Response
    try {
      res = signal ? await fetch(`/api/${path}`, { signal }) : await fetch(`/api/${path}`)
    } catch (err) {
      if (isAbortError(err)) throw err
      toast.show({ type: 'error', message: 'Network error' })
      throw new Error('Network error')
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const message = (body as { error?: string }).error || 'Request failed'
      toast.show({ type: 'error', message })
      throw new Error(message)
    }
    return res.json() as Promise<T>
  }

  async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    let res: Response
    try {
      res = await fetch(`/api/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })
    } catch (err) {
      if (isAbortError(err)) throw err
      toast.show({ type: 'error', message: 'Network error' })
      throw new Error('Network error')
    }
    if (!res.ok) {
      const resBody = await res.json().catch(() => ({}))
      const message = (resBody as { error?: string }).error || 'Request failed'
      toast.show({ type: 'error', message })
      throw new Error(message)
    }
    return res.json() as Promise<T>
  }

  async function put<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    let res: Response
    try {
      res = await fetch(`/api/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })
    } catch (err) {
      if (isAbortError(err)) throw err
      toast.show({ type: 'error', message: 'Network error' })
      throw new Error('Network error')
    }
    if (!res.ok) {
      const resBody = await res.json().catch(() => ({}))
      const message = (resBody as { error?: string }).error || 'Request failed'
      toast.show({ type: 'error', message })
      throw new Error(message)
    }
    return res.json() as Promise<T>
  }

  async function del<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    let res: Response
    try {
      const options: RequestInit = { method: 'DELETE', signal }
      if (body !== undefined) {
        options.headers = { 'Content-Type': 'application/json' }
        options.body = JSON.stringify(body)
      }
      res = await fetch(`/api/${path}`, options)
    } catch (err) {
      if (isAbortError(err)) throw err
      toast.show({ type: 'error', message: 'Network error' })
      throw new Error('Network error')
    }
    if (!res.ok) {
      const resBody = await res.json().catch(() => ({}))
      const message = (resBody as { error?: string }).error || 'Request failed'
      toast.show({ type: 'error', message })
      throw new Error(message)
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  return { get, post, put, del }
}
