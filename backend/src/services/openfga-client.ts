import { config } from '../config.js'
import { logger } from '../logger.js'

class OpenFgaClient {
  private baseUrl: string
  private apiKey: string
  public storeId: string

  constructor() {
    this.baseUrl = config.openfga.url
    this.apiKey = config.openfga.apiKey
    this.storeId = config.openfga.storeId
  }

  get url(): string {
    return this.baseUrl
  }

  updateUrl(url: string): void {
    this.baseUrl = url
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      h['Authorization'] = `Bearer ${this.apiKey}`
    }
    return h
  }

  async get(path: string): Promise<unknown> {
    const url = `${this.baseUrl}${path}`
    logger.debug({ url, method: 'GET' }, 'OpenFGA request')
    const res = await fetch(url, { headers: this.headers(), signal: AbortSignal.timeout(5000) })
    return this.handleResponse(res)
  }

  async post(path: string, body: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`
    logger.debug({ url, method: 'POST' }, 'OpenFGA request')
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    return this.handleResponse(res)
  }

  async delete(path: string, body?: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`
    logger.debug({ url, method: 'DELETE' }, 'OpenFGA request')
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
    })
    return this.handleResponse(res)
  }

  private async handleResponse(res: Response): Promise<unknown> {
    const data = res.status === 204 ? null : await res.json().catch(() => null)
    if (!res.ok) {
      const message = (data as Record<string, unknown>)?.message ?? res.statusText
      const err = new Error(String(message))
      ;(err as Error & { statusCode: number }).statusCode = res.status
      ;(err as Error & { details: unknown }).details = data
      throw err
    }
    return data
  }

  async testConnection(url?: string): Promise<void> {
    const targetUrl = url || this.baseUrl
    const res = await fetch(`${targetUrl}/stores`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      throw new Error(`Connection failed: ${res.status} ${res.statusText}`)
    }
  }
}

export const openfgaClient = new OpenFgaClient()
