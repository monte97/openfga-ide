import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { modelParamsSchema } from '../schemas/model.js'
import { getModel } from '../services/model-service.js'

const router = Router({ mergeParams: true })

router.get('/', validate(modelParamsSchema, 'params'), async (req, res) => {
  const storeId = req.params['storeId'] as string
  const model = await getModel(storeId)
  res.json(model)
})

export default router
