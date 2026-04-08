import { Router, type Request } from 'express'
import { validate } from '../middleware/validate.js'
import { tupleParamsSchema, tupleQuerySchema, tupleBodySchema, tupleBatchDeleteSchema } from '../schemas/tuple.js'
import { readTuples, writeTuple, deleteTuple, deleteTuplesBatch } from '../services/tuple-service.js'

const router = Router({ mergeParams: true })

router.get(
  '/',
  validate(tupleParamsSchema, 'params'),
  validate(tupleQuerySchema, 'query'),
  async (req: Request<{ storeId: string }>, res) => {
    const storeId = req.params.storeId
    const { type, relation, user, pageSize, continuationToken } = req.query as {
      type?: string
      relation?: string
      user?: string
      pageSize?: number
      continuationToken?: string
    }
    const result = await readTuples(storeId, { type, relation, user, pageSize, continuationToken })
    res.json(result)
  },
)

router.post(
  '/',
  validate(tupleParamsSchema, 'params'),
  validate(tupleBodySchema),
  async (req: Request<{ storeId: string }>, res) => {
    const storeId = req.params.storeId
    const tupleKey = await writeTuple(storeId, req.body)
    res.status(201).json(tupleKey)
  },
)

router.delete(
  '/',
  validate(tupleParamsSchema, 'params'),
  validate(tupleBodySchema),
  async (req: Request<{ storeId: string }>, res) => {
    const storeId = req.params.storeId
    await deleteTuple(storeId, req.body)
    res.json({ success: true })
  },
)

router.delete(
  '/batch',
  validate(tupleParamsSchema, 'params'),
  validate(tupleBatchDeleteSchema),
  async (req: Request<{ storeId: string }>, res) => {
    const storeId = req.params.storeId
    const result = await deleteTuplesBatch(storeId, req.body.deletes)
    res.json(result)
  },
)

export default router
