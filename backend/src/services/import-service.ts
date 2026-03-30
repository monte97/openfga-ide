import { openfgaClient } from './openfga-client.js'
import type { ImportResult, TupleKey } from '../types/openfga.js'

async function writeTuplesInBatches(storeId: string, tuples: TupleKey[], batchSize = 100): Promise<void> {
  for (let i = 0; i < tuples.length; i += batchSize) {
    const chunk = tuples.slice(i, i + batchSize)
    await openfgaClient.post(`/stores/${storeId}/write`, {
      writes: { tuple_keys: chunk },
    })
  }
}

function stripModelId(model: unknown): unknown {
  if (typeof model !== 'object' || model === null) return model
  const { id: _id, ...rest } = model as Record<string, unknown>
  return rest
}

export async function importToNewStore(
  storeName: string,
  model: unknown,
  tuples: TupleKey[],
): Promise<ImportResult> {
  const created = await openfgaClient.post('/stores', { name: storeName }) as { id: string; name: string }
  const newStoreId = created.id

  const modelWritten = model !== null
  if (modelWritten) {
    await openfgaClient.post(`/stores/${newStoreId}/authorization-models`, stripModelId(model))
  }

  await writeTuplesInBatches(newStoreId, tuples)

  return {
    storeId: newStoreId,
    storeName,
    modelWritten,
    tuplesImported: tuples.length,
  }
}

export async function importToExistingStore(
  storeId: string,
  model: unknown,
  tuples: TupleKey[],
): Promise<ImportResult> {
  const modelWritten = model !== null
  if (modelWritten) {
    await openfgaClient.post(`/stores/${storeId}/authorization-models`, stripModelId(model))
  }

  await writeTuplesInBatches(storeId, tuples)

  return {
    storeId,
    storeName: '',
    modelWritten,
    tuplesImported: tuples.length,
  }
}
