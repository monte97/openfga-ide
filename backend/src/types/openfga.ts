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

export interface TypeDefinition {
  type: string
  relations: Record<string, unknown>
  metadata: Record<string, unknown> | null
}

export interface AuthorizationModel {
  id: string
  schema_version: string
  type_definitions: TypeDefinition[]
  conditions?: Record<string, unknown>
}

export interface ListAuthorizationModelsResponse {
  authorization_models: AuthorizationModel[]
  continuation_token?: string
}

export interface ModelResponse {
  json: AuthorizationModel | null
  dsl: string | null
  authorizationModelId: string | null
}

export interface TupleKey {
  user: string
  relation: string
  object: string
}

export interface Tuple {
  key: TupleKey
  timestamp: string
}

export interface ReadTuplesResponse {
  tuples: Tuple[]
  continuationToken: string | null
}

export interface OpenFgaReadResponse {
  tuples: Array<{ key: { user: string; relation: string; object: string }; timestamp: string }>
  continuation_token: string
}

export interface ImportPayload {
  storeName?: string
  model: AuthorizationModel | null
  tuples: TupleKey[]
}

export interface ImportResult {
  storeId: string
  storeName: string
  modelWritten: boolean
  tuplesImported: number
}

export interface ExportPayload {
  storeName: string
  exportedAt: string
  model: AuthorizationModel | null
  tuples: TupleKey[]
}

// Query request types
export interface CheckRequest {
  user: string
  relation: string
  object: string
  authorizationModelId?: string
}

export interface ListObjectsRequest {
  user: string
  relation: string
  type: string
  authorizationModelId?: string
}

export interface ListUsersRequest {
  object: { type: string; id: string }
  relation: string
  userFilters?: Array<{ type: string }>
  authorizationModelId?: string
}

export interface ExpandRequest {
  relation: string
  object: string
  authorizationModelId?: string
}

// Query response types
export interface CheckResponse {
  allowed: boolean
}

export interface ListObjectsResponse {
  objects: string[]
}

export interface ListUsersResponse {
  users: string[]
}

export interface ExpandResponse {
  tree: unknown
}

export interface OpenFgaCheckResponse {
  allowed: boolean
  resolution?: string
}

export interface OpenFgaListObjectsResponse {
  objects: string[]
}

export interface OpenFgaListUsersResponse {
  users: Array<{ object: { type: string; id: string } }>
}

export interface OpenFgaExpandResponse {
  tree: { root: { name: string; [key: string]: unknown } }
}
