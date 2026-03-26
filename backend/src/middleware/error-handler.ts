import type { Request, Response, NextFunction } from 'express'
import { logger } from '../logger.js'

interface AppError extends Error {
  statusCode?: number
  details?: unknown
}

export function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'

  logger.error(
    { err: { message, stack: err.stack }, req: { method: req.method, url: req.url } },
    'Request failed',
  )

  res.status(statusCode).json({
    error: message,
    ...(err.details ? { details: err.details } : {}),
  })
}
