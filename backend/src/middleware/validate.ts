import type { Request, Response, NextFunction } from 'express'
import type { ZodType } from 'zod'

export function validate(schema: ZodType, target: 'body' | 'params' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = target === 'params' ? req.params : target === 'query' ? req.query : req.body
    const result = schema.safeParse(data)
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.issues,
      })
      return
    }
    if (target === 'body') req.body = result.data
    next()
  }
}
