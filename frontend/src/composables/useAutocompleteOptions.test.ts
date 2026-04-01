import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAutocompleteOptions } from './useAutocompleteOptions'
import { useModelStore } from '@/stores/model'
import { useTupleStore } from '@/stores/tuples'

vi.mock('@/stores/model', () => ({ useModelStore: vi.fn() }))
vi.mock('@/stores/tuples', () => ({ useTupleStore: vi.fn() }))

function makeModelStore(json: unknown = null) {
  return { json }
}

function makeTupleStore(tuples: unknown[] = []) {
  return { tuples }
}

describe('useAutocompleteOptions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(useModelStore).mockReturnValue(makeModelStore() as ReturnType<typeof useModelStore>)
    vi.mocked(useTupleStore).mockReturnValue(makeTupleStore() as ReturnType<typeof useTupleStore>)
  })

  it('returns empty options when stores are empty', () => {
    const { userOptions, relationOptions, objectOptions } = useAutocompleteOptions()
    expect(userOptions.value).toEqual([])
    expect(relationOptions.value).toEqual([])
    expect(objectOptions.value).toEqual([])
  })

  it('populates options from model type_definitions', () => {
    vi.mocked(useModelStore).mockReturnValue(
      makeModelStore({
        type_definitions: [
          { type: 'user', relations: {} },
          { type: 'document', relations: { viewer: {}, editor: {} } },
        ],
      }) as ReturnType<typeof useModelStore>
    )
    const { userOptions, relationOptions, objectOptions } = useAutocompleteOptions()
    expect(userOptions.value.map((o) => o.value)).toContain('user:')
    expect(objectOptions.value.map((o) => o.value)).toContain('document:')
    expect(relationOptions.value.map((o) => o.value)).toContain('viewer')
    expect(relationOptions.value.map((o) => o.value)).toContain('editor')
  })

  it('populates user/relation/object options from tuples', () => {
    vi.mocked(useTupleStore).mockReturnValue(
      makeTupleStore([
        { key: { user: 'user:alice', relation: 'viewer', object: 'document:1' } },
      ]) as ReturnType<typeof useTupleStore>
    )
    const { userOptions, relationOptions, objectOptions } = useAutocompleteOptions()
    expect(userOptions.value.map((o) => o.value)).toContain('user:alice')
    expect(relationOptions.value.map((o) => o.value)).toContain('viewer')
    expect(objectOptions.value.map((o) => o.value)).toContain('document:1')
  })

  it('skips tuples with missing user/relation/object (null guard)', () => {
    vi.mocked(useTupleStore).mockReturnValue(
      makeTupleStore([
        { key: { user: undefined, relation: undefined, object: undefined } },
        { key: { user: null, relation: null, object: null } },
        { key: { user: '', relation: '', object: '' } },
        { key: { user: 'user:bob', relation: 'editor', object: 'document:2' } },
      ]) as unknown as ReturnType<typeof useTupleStore>
    )
    const { userOptions, relationOptions, objectOptions } = useAutocompleteOptions()
    // Only the valid tuple should produce options
    expect(userOptions.value.map((o) => o.value)).toEqual(['user:bob'])
    expect(relationOptions.value.map((o) => o.value)).toEqual(['editor'])
    expect(objectOptions.value.map((o) => o.value)).toEqual(['document:2'])
    // No undefined/null/empty values in options
    expect(userOptions.value.every((o) => !!o.value)).toBe(true)
  })

  it('deduplicates options from multiple tuples', () => {
    vi.mocked(useTupleStore).mockReturnValue(
      makeTupleStore([
        { key: { user: 'user:alice', relation: 'viewer', object: 'document:1' } },
        { key: { user: 'user:alice', relation: 'viewer', object: 'document:1' } },
      ]) as ReturnType<typeof useTupleStore>
    )
    const { userOptions, relationOptions, objectOptions } = useAutocompleteOptions()
    expect(userOptions.value.filter((o) => o.value === 'user:alice')).toHaveLength(1)
    expect(relationOptions.value.filter((o) => o.value === 'viewer')).toHaveLength(1)
    expect(objectOptions.value.filter((o) => o.value === 'document:1')).toHaveLength(1)
  })
})
