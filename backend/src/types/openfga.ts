export interface StoreInfo {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface ListStoresResponse {
  stores: StoreInfo[]
  continuation_token?: string
}
