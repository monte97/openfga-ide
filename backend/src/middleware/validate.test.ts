import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validate } from './validate.js'
import type { Request, Response, NextFunction } from 'express'

function mockReqRes(body: unknown) {
  const req = { body } as Request
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
  const next = vi.fn() as NextFunction
  return { req, res, next }
}

function mockReqResParams(params: unknown) {
  const req = { body: {}, params, query: {} } as unknown as Request
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
  const next = vi.fn() as NextFunction
  return { req, res, next }
}

function mockReqResQuery(query: unknown) {
  const req = { body: {}, params: {}, query } as unknown as Request
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
  const next = vi.fn() as NextFunction
  return { req, res, next }
}

describe('validate middleware', () => {
  const schema = z.object({ url: z.string().url() })

  it('calls next() for valid body', () => {
    const { req, res, next } = mockReqRes({ url: 'http://example.com' })
    validate(schema)(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.body).toEqual({ url: 'http://example.com' })
  })

  it('returns 400 with error envelope for invalid body', () => {
    const { req, res, next } = mockReqRes({})
    validate(schema)(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation error',
        details: expect.any(String),
      }),
    )
  })

  it('returns 400 for invalid URL format', () => {
    const { req, res, next } = mockReqRes({ url: 'not-a-url' })
    validate(schema)(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('validate middleware — params target', () => {
  const paramsSchema = z.object({ storeId: z.string().trim().min(1) })

  it('calls next() for valid params', () => {
    const { req, res, next } = mockReqResParams({ storeId: 'store-123' })
    validate(paramsSchema, 'params')(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('propagates trimmed value to req.params', () => {
    const { req, res, next } = mockReqResParams({ storeId: '  store-123  ' })
    validate(paramsSchema, 'params')(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.params.storeId).toBe('store-123')
  })

  it('returns 400 for whitespace-only storeId', () => {
    const { req, res, next } = mockReqResParams({ storeId: '   ' })
    validate(paramsSchema, 'params')(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('validate middleware — query target', () => {
  const querySchema = z.object({ name: z.string().trim().min(1).optional() })

  it('calls next() for valid query', () => {
    const { req, res, next } = mockReqResQuery({ name: 'hello' })
    validate(querySchema, 'query')(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('propagates trimmed value to req.query', () => {
    const { req, res, next } = mockReqResQuery({ name: '  hello  ' })
    validate(querySchema, 'query')(req, res, next)
    expect(next).toHaveBeenCalled()
    expect((req.query as Record<string, string>).name).toBe('hello')
  })

  it('returns 400 for whitespace-only query param', () => {
    const { req, res, next } = mockReqResQuery({ name: '   ' })
    validate(querySchema, 'query')(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
