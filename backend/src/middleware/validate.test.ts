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
        details: expect.any(Array),
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
