import { openfgaClient } from './openfga-client.js'
import type { TupleKey, ReadTuplesResponse, OpenFgaReadResponse } from '../types/openfga.js'

interface ReadTuplesFilters {
  type?: string
  relation?: string
  user?: string
  pageSize?: number
  continuationToken?: string
}

export async function readTuples(
  storeId: string,
  filters?: ReadTuplesFilters,
): Promise<ReadTuplesResponse> {
  const body: Record<string, unknown> = {}

  if (filters) {
    const tupleKey: Record<string, string> = {}
    if (filters.type) tupleKey.object = `${filters.type}:`
    if (filters.relation) tupleKey.relation = filters.relation
    if (filters.user) tupleKey.user = filters.user
    if (Object.keys(tupleKey).length > 0) body.tuple_key = tupleKey
    if (filters.pageSize) body.page_size = Number(filters.pageSize)
    if (filters.continuationToken) body.continuation_token = filters.continuationToken
  }

  const data = await openfgaClient.post(
    `/stores/${storeId}/read`,
    body,
  ) as OpenFgaReadResponse

  return {
    tuples: data.tuples ?? [],
    continuationToken: data.continuation_token || null,
  }
}

export async function writeTuple(
  storeId: string,
  tupleKey: TupleKey,
): Promise<TupleKey> {
  await openfgaClient.post(`/stores/${storeId}/write`, {
    writes: { tuple_keys: [tupleKey] },
  })
  return tupleKey
}

export async function deleteTuple(
  storeId: string,
  tupleKey: TupleKey,
): Promise<void> {
  await openfgaClient.post(`/stores/${storeId}/write`, {
    deletes: { tuple_keys: [tupleKey] },
  })
}

export async function deleteTuplesBatch(
  storeId: string,
  tupleKeys: TupleKey[],
): Promise<{ deleted: number }> {
  await openfgaClient.post(`/stores/${storeId}/write`, {
    deletes: { tuple_keys: tupleKeys },
  })
  return { deleted: tupleKeys.length }
}
