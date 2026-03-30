import { openfgaClient } from './openfga-client.js'
import { getModel } from './model-service.js'
import type { ExportPayload, OpenFgaReadResponse, StoreInfo, TupleKey } from '../types/openfga.js'

export async function exportStore(storeId: string): Promise<ExportPayload> {
  const storesData = await openfgaClient.get('/stores') as { stores: StoreInfo[] }
  const store = storesData.stores.find((s) => s.id === storeId)
  const storeName = store?.name ?? storeId

  const modelResponse = await getModel(storeId)

  const allTuples: TupleKey[] = []
  let token: string | null = null
  do {
    const page = await openfgaClient.post(`/stores/${storeId}/read`, {
      page_size: 100,
      ...(token ? { continuation_token: token } : {}),
    }) as OpenFgaReadResponse
    const keys = (page.tuples ?? []).map((t) => t.key)
    allTuples.push(...keys)
    token = page.continuation_token || null
  } while (token)

  return {
    storeName,
    exportedAt: new Date().toISOString(),
    model: modelResponse.json,
    tuples: allTuples,
  }
}
