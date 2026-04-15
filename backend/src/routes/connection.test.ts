import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import app from '../app.js'
import type { Server } from 'node:http'

let server: Server

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, resolve).on('error', reject)
  })
  base = `http://localhost:${(server.address() as { port: number }).port}`
})

afterAll(() => {
  server.close()
})

let base: string

describe('GET /api/connection', () => {
  it('returns connection status without API key', async () => {
    const res = await fetch(`${base}/api/connection`)
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('url')
    expect(body).toHaveProperty('storeId')
    expect(body).toHaveProperty('status', 'connected')
    expect(body).not.toHaveProperty('apiKey')
  })
})

describe('POST /api/connection/test', () => {
  it('returns 400 for missing url', async () => {
    const res = await fetch(`${base}/api/connection/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Validation error')
    expect(body).toHaveProperty('details')
  })

  it('returns 400 for invalid url format', async () => {
    const res = await fetch(`${base}/api/connection/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 502 for unreachable URL', async () => {
    const res = await fetch(`${base}/api/connection/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://localhost:19999' }),
    })
    expect(res.status).toBe(502)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Connection failed')
  })
})

describe('PUT /api/connection', () => {
  it('returns 400 for missing url', async () => {
    const res = await fetch(`${base}/api/connection`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Validation error')
  })

  it('returns 400 for invalid url format', async () => {
    const res = await fetch(`${base}/api/connection`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 502 and reverts URL for unreachable URL', async () => {
    const originalRes = await fetch(`${base}/api/connection`)
    const { url: originalUrl } = await originalRes.json() as { url: string }

    const res = await fetch(`${base}/api/connection`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://localhost:19999' }),
    })
    expect(res.status).toBe(502)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('error', 'Connection failed')

    // Verify URL was reverted
    const afterRes = await fetch(`${base}/api/connection`)
    const { url: afterUrl } = await afterRes.json() as { url: string }
    expect(afterUrl).toBe(originalUrl)
  })
})

describe('GET /api/health', () => {
  it('still returns ok', async () => {
    const res = await fetch(`${base}/api/health`)
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body).toEqual({ status: 'ok' })
  })
})
