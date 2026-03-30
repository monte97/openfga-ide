import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { queryParamsSchema, checkBodySchema, listObjectsBodySchema, listUsersBodySchema, expandBodySchema } from '../schemas/query.js'
import { check, listObjects, listUsers, expand } from '../services/query-service.js'

const router = Router({ mergeParams: true })

router.post(
  '/check',
  validate(queryParamsSchema, 'params'),
  validate(checkBodySchema),
  async (req, res) => {
    const storeId = req.params['storeId'] as string
    const result = await check(storeId, req.body)
    res.json(result)
  },
)

router.post(
  '/list-objects',
  validate(queryParamsSchema, 'params'),
  validate(listObjectsBodySchema),
  async (req, res) => {
    const storeId = req.params['storeId'] as string
    const result = await listObjects(storeId, req.body)
    res.json(result)
  },
)

router.post(
  '/list-users',
  validate(queryParamsSchema, 'params'),
  validate(listUsersBodySchema),
  async (req, res) => {
    const storeId = req.params['storeId'] as string
    const result = await listUsers(storeId, req.body)
    res.json(result)
  },
)

router.post(
  '/expand',
  validate(queryParamsSchema, 'params'),
  validate(expandBodySchema),
  async (req, res) => {
    const storeId = req.params['storeId'] as string
    const result = await expand(storeId, req.body)
    res.json(result)
  },
)

export default router
