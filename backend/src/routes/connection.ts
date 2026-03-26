import { Router } from 'express'
import { openfgaClient } from '../services/openfga-client.js'
import { validate } from '../middleware/validate.js'
import { testConnectionSchema, updateConnectionSchema } from '../schemas/connection.js'

const router = Router()

router.get('/api/connection', (_req, res) => {
  res.json({
    url: openfgaClient.url,
    storeId: openfgaClient.storeId,
    status: 'connected',
  })
})

router.post('/api/connection/test', validate(testConnectionSchema), async (req, res) => {
  const { url } = req.body as { url: string }
  try {
    await openfgaClient.testConnection(url)
    res.json({ status: 'connected' })
  } catch (err) {
    res.status(502).json({
      error: 'Connection failed',
      details: (err as Error).message,
    })
  }
})

router.put('/api/connection', validate(updateConnectionSchema), async (req, res) => {
  const { url } = req.body as { url: string }
  const previousUrl = openfgaClient.url
  openfgaClient.updateUrl(url)
  try {
    await openfgaClient.testConnection()
    res.json({
      url: openfgaClient.url,
      storeId: openfgaClient.storeId,
      status: 'connected',
    })
  } catch (err) {
    openfgaClient.updateUrl(previousUrl)
    res.status(502).json({
      error: 'Connection failed',
      details: (err as Error).message,
    })
  }
})

export default router
