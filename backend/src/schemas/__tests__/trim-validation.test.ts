import { describe, it, expect } from 'vitest'
import { tupleParamsSchema, tupleBodySchema } from '../tuple.js'
import { exportParamsSchema } from '../export.js'
import { modelParamsSchema } from '../model.js'
import { createStoreSchema } from '../store.js'
import { importParamsSchema } from '../import.js'

describe('schema whitespace rejection via .trim()', () => {
  it('tupleParamsSchema rejects whitespace-only storeId', () => {
    expect(tupleParamsSchema.safeParse({ storeId: '   ' }).success).toBe(false)
  })

  it('tupleBodySchema rejects whitespace-only user', () => {
    expect(tupleBodySchema.safeParse({ user: '   ', relation: 'viewer', object: 'doc:1' }).success).toBe(false)
  })

  it('tupleBodySchema rejects whitespace-only relation', () => {
    expect(tupleBodySchema.safeParse({ user: 'user:alice', relation: '  ', object: 'doc:1' }).success).toBe(false)
  })

  it('tupleBodySchema rejects whitespace-only object', () => {
    expect(tupleBodySchema.safeParse({ user: 'user:alice', relation: 'viewer', object: '  ' }).success).toBe(false)
  })

  it('createStoreSchema rejects whitespace-only name', () => {
    expect(createStoreSchema.safeParse({ name: '   ' }).success).toBe(false)
  })

  it('createStoreSchema trims and accepts padded name', () => {
    const result = createStoreSchema.safeParse({ name: '  My Store  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('My Store')
  })

  it('exportParamsSchema rejects whitespace-only storeId', () => {
    expect(exportParamsSchema.safeParse({ storeId: '   ' }).success).toBe(false)
  })

  it('modelParamsSchema rejects whitespace-only storeId', () => {
    expect(modelParamsSchema.safeParse({ storeId: '   ' }).success).toBe(false)
  })

  it('importParamsSchema rejects whitespace-only storeId', () => {
    expect(importParamsSchema.safeParse({ storeId: '   ' }).success).toBe(false)
  })
})
