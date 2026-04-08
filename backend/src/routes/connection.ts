import { Router } from 'express'
import { openfgaClient } from '../services/openfga-client.js'
import { validate } from '../middleware/validate.js'
import { testConnectionSchema, updateConnectionSchema, type TestConnectionBody, type UpdateConnectionBody } from '../schemas/connection.js'

const router = Router()

router.get('/api/connection', (_req, res) => {
  res.json({
    url: openfgaClient.url,
    storeId: openfgaClient.storeId,
    status: 'connected',
  })
})

router.post('/api/connection/test', validate(testConnectionSchema), async (req, res) => {
  const { url } = req.body as TestConnectionBody
  try {
    await openfgaClient.testConnection(url)
    res.json({ status: 'connected' })
  } catch (err) {
    res.status(502).json({
      error: 'Connection failed',
      details: 'Could not reach OpenFGA instance',
    })
  }
})

router.put('/api/connection', validate(updateConnectionSchema), async (req, res) => {
  const { url } = req.body as UpdateConnectionBody
  try {
    await openfgaClient.testConnection(url)
    openfgaClient.updateUrl(url)
    res.json({
      url: openfgaClient.url,
      storeId: openfgaClient.storeId,
      status: 'connected',
    })
  } catch (err) {
    res.status(502).json({
      error: 'Connection failed',
      details: 'Could not reach OpenFGA instance',
    })
  }
})

export default router
