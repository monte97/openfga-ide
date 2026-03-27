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
