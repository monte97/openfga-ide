export interface ErrorEnvelope {
  error: string
  details?: unknown
}

export interface ConnectionStatus {
  url: string
  storeId: string
  status: 'connected' | 'error'
}
