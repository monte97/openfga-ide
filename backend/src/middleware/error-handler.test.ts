import { describe, it, expect, vi } from 'vitest'
import { errorHandler } from './error-handler.js'
import type { Request, Response, NextFunction } from 'express'

function mockReqRes() {
  const req = { method: 'GET', url: '/api/test' } as Request
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
  const next = vi.fn() as NextFunction
  return { req, res, next }
}

describe('errorHandler', () => {
  it('returns error envelope with 500 for generic errors', () => {
    const { req, res, next } = mockReqRes()
    const err = new Error('Something broke')
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Something broke' })
  })

  it('uses statusCode from error if present', () => {
    const { req, res, next } = mockReqRes()
    const err = Object.assign(new Error('Not found'), { statusCode: 404 })
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' })
  })

  it('includes details if present on error', () => {
    const { req, res, next } = mockReqRes()
    const err = Object.assign(new Error('Bad request'), {
      statusCode: 400,
      details: { field: 'url' },
    })
    errorHandler(err, req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Bad request',
      details: { field: 'url' },
    })
  })
})
