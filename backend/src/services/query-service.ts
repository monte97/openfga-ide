import { openfgaClient } from './openfga-client.js'
import type {
  CheckResponse,
  ListObjectsResponse,
  ListUsersResponse,
  ExpandResponse,
  OpenFgaCheckResponse,
  OpenFgaListObjectsResponse,
  OpenFgaListUsersResponse,
  OpenFgaExpandResponse,
} from '../types/openfga.js'

export async function check(
  storeId: string,
  params: { user: string; relation: string; object: string },
): Promise<CheckResponse> {
  const data = await openfgaClient.post(`/stores/${storeId}/check`, {
    tuple_key: { user: params.user, relation: params.relation, object: params.object },
  }) as OpenFgaCheckResponse
  return { allowed: data.allowed ?? false }
}

export async function listObjects(
  storeId: string,
  params: { user: string; relation: string; type: string },
): Promise<ListObjectsResponse> {
  const data = await openfgaClient.post(`/stores/${storeId}/list-objects`, {
    user: params.user,
    relation: params.relation,
    type: params.type,
  }) as OpenFgaListObjectsResponse
  return { objects: data.objects ?? [] }
}

export async function listUsers(
  storeId: string,
  params: { object: { type: string; id: string }; relation: string },
): Promise<ListUsersResponse> {
  const data = await openfgaClient.post(`/stores/${storeId}/list-users`, {
    object: params.object,
    relation: params.relation,
    user_filters: [{ type: 'user' }],
  }) as OpenFgaListUsersResponse
  const users = (data.users ?? []).filter((u) => u.object).map((u) => `${u.object.type}:${u.object.id}`)
  return { users }
}

export async function expand(
  storeId: string,
  params: { relation: string; object: string },
): Promise<ExpandResponse> {
  const data = await openfgaClient.post(`/stores/${storeId}/expand`, {
    tuple_key: { relation: params.relation, object: params.object },
  }) as OpenFgaExpandResponse
  return { tree: data.tree ?? null }
}
