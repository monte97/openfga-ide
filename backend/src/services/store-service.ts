import { openfgaClient } from './openfga-client.js'
import type { StoreInfo } from '../types/openfga.js'

export async function createStore(name: string): Promise<StoreInfo> {
  const store = await openfgaClient.post('/stores', { name }) as StoreInfo
  return store
}

export async function deleteStore(storeId: string): Promise<void> {
  await openfgaClient.delete(`/stores/${storeId}`)
  if (openfgaClient.storeId === storeId) {
    openfgaClient.storeId = ''
  }
}
