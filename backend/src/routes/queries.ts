import { Router, type Request } from 'express'
import { validate } from '../middleware/validate.js'
import { queryParamsSchema, checkBodySchema, listObjectsBodySchema, listUsersBodySchema, expandBodySchema } from '../schemas/query.js'
import { check, listObjects, listUsers, expand } from '../services/query-service.js'

const router = Router({ mergeParams: true })

router.post(
  '/check',
  validate(queryParamsSchema, 'params'),
  validate(checkBodySchema),
  async (req: Request<{ storeId: string }>, res) => {
    const storeId = req.params.storeId
    const result = await check(storeId, req.body)
    res.json(result)
  },
)

router.post(
  '/list-objects',
  validate(queryParamsSchema, 'params'),
  validate(listObjectsBodySchema),
  async (req: Request<{ storeId: string }>, res) => {
    const storeId = req.params.storeId
    const result = await listObjects(storeId, req.body)
    res.json(result)
  },
)

router.post(
  '/list-users',
  validate(queryParamsSchema, 'params'),
  validate(listUsersBodySchema),
  async (req: Request<{ storeId: string }>, res) => {
    const storeId = req.params.storeId
    const result = await listUsers(storeId, req.body)
    res.json(result)
  },
)

router.post(
  '/expand',
  validate(queryParamsSchema, 'params'),
  validate(expandBodySchema),
  async (req: Request<{ storeId: string }>, res) => {
    const storeId = req.params.storeId
    const result = await expand(storeId, req.body)
    res.json(result)
  },
)

export default router
