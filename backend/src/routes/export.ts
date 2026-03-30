import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { exportParamsSchema } from '../schemas/export.js'
import { exportStore } from '../services/export-service.js'

const router = Router({ mergeParams: true })

router.get(
  '/',
  validate(exportParamsSchema, 'params'),
  async (req, res) => {
    const storeId = req.params['storeId'] as string
    const payload = await exportStore(storeId)
    const filename = `${payload.storeName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'application/json')
    res.json(payload)
  },
)

export default router
