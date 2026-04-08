import type { Request, Response, NextFunction } from 'express'
import type { ZodType } from 'zod'

export function validate(schema: ZodType, target: 'body' | 'params' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = target === 'params' ? req.params : target === 'query' ? req.query : req.body
    const result = schema.safeParse(data)
    if (!result.success) {
      const details = result.error.issues
        .map((i) => (i.path.length > 0 ? `${i.path.join('.')}: ${i.message}` : i.message))
        .join('; ')
      res.status(400).json({ error: 'Validation error', details })
      return
    }
    if (target === 'body') req.body = result.data
    else if (target === 'params') Object.assign(req.params, result.data)
    else if (target === 'query') Object.assign(req.query, result.data)
    next()
  }
}
