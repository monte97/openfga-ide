import { Router } from 'express'
import { openfgaClient } from '../services/openfga-client.js'
import { createStore, deleteStore } from '../services/store-service.js'
import { validate } from '../middleware/validate.js'
import { createStoreSchema } from '../schemas/store.js'
import type { ListStoresResponse } from '../types/openfga.js'

const router = Router()

router.get('/api/stores', async (_req, res) => {
  const data = await openfgaClient.get('/stores') as ListStoresResponse
  res.json(data)
})

router.post('/api/stores', validate(createStoreSchema), async (req, res) => {
  const { name } = req.body as { name: string }
  const store = await createStore(name)
  res.status(201).json(store)
})

router.delete('/api/stores/:storeId', async (req, res) => {
  const { storeId } = req.params
  await deleteStore(storeId)
  res.status(204).send()
})

export default router
