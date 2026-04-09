import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModelStore } from '@/stores/model'
import { useModelOptions } from './useModelOptions'

describe('useModelOptions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns empty arrays when model json is null', () => {
    const { typeOptions, relationOptions } = useModelOptions()
    expect(typeOptions.value).toEqual([])
    expect(relationOptions.value).toEqual([])
  })

  it('returns sorted type options from type_definitions', () => {
    const modelStore = useModelStore()
    modelStore.json = {
      type_definitions: [
        { type: 'document', relations: {} },
        { type: 'user', relations: {} },
        { type: 'team', relations: {} },
      ],
    }
    const { typeOptions } = useModelOptions()
    expect(typeOptions.value).toEqual([
      { value: 'document', label: 'document' },
      { value: 'team', label: 'team' },
      { value: 'user', label: 'user' },
    ])
  })

  it('returns sorted unique relation options from all type_definitions', () => {
    const modelStore = useModelStore()
    modelStore.json = {
      type_definitions: [
        { type: 'document', relations: { viewer: {}, editor: {} } },
        { type: 'team', relations: { member: {}, viewer: {} } },
      ],
    }
    const { relationOptions } = useModelOptions()
    expect(relationOptions.value).toEqual([
      { value: 'editor', label: 'editor' },
      { value: 'member', label: 'member' },
      { value: 'viewer', label: 'viewer' },
    ])
  })

  it('returns empty arrays when type_definitions is missing', () => {
    const modelStore = useModelStore()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelStore.json = {} as any
    const { typeOptions, relationOptions } = useModelOptions()
    expect(typeOptions.value).toEqual([])
    expect(relationOptions.value).toEqual([])
  })
})
