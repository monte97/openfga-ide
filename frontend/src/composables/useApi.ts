import { useToast } from './useToast'

export function useApi() {
  const toast = useToast()

  async function get<T>(path: string): Promise<T> {
    let res: Response
    try {
      res = await fetch(`/api/${path}`)
    } catch {
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

  async function post<T>(path: string, body: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetch(`/api/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
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

  async function put<T>(path: string, body: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetch(`/api/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
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

  async function del<T>(path: string): Promise<T> {
    let res: Response
    try {
      res = await fetch(`/api/${path}`, { method: 'DELETE' })
    } catch {
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
