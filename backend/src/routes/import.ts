import { Router, type Request } from 'express'
import { validate } from '../middleware/validate.js'
import { importNewStoreBodySchema, importBodySchema, importParamsSchema } from '../schemas/import.js'
import { importToNewStore, importToExistingStore } from '../services/import-service.js'
import type { TupleKey } from '../types/openfga.js'

export const importRouter = Router()

importRouter.post(
  '/',
  validate(importNewStoreBodySchema),
  async (req, res) => {
    const { storeName, model, tuples } = req.body as { storeName: string; model: unknown; tuples: TupleKey[] }
    const result = await importToNewStore(storeName, model, tuples)
    res.status(201).json(result)
  },
)

export const storeImportRouter = Router({ mergeParams: true })

storeImportRouter.post(
  '/',
  validate(importParamsSchema, 'params'),
  validate(importBodySchema),
  async (req: Request<{ storeId: string }>, res) => {
    const storeId = req.params.storeId
    const { model, tuples } = req.body as { model: unknown; tuples: TupleKey[] }
    const result = await importToExistingStore(storeId, model, tuples)
    res.json(result)
  },
)
