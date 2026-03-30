import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GraphTypeFilter from './GraphTypeFilter.vue'

vi.mock('@/composables/useRelationshipGraph', () => ({
  useRelationshipGraph: vi.fn(),
}))

vi.mock('@/stores/tuples', () => ({
  useTupleStore: vi.fn(),
}))

vi.mock('@/stores/relationshipGraph', () => ({
  useRelationshipGraphStore: vi.fn(),
}))

import { useRelationshipGraphStore } from '@/stores/relationshipGraph'

function makeStore(overrides: { allTypes?: string[]; hiddenTypes?: Set<string>; toggleTypeVisibility?: ReturnType<typeof vi.fn> }) {
  return {
    allTypes: overrides.allTypes ?? [],
    hiddenTypes: overrides.hiddenTypes ?? new Set<string>(),
    toggleTypeVisibility: overrides.toggleTypeVisibility ?? vi.fn(),
  }
}

describe('GraphTypeFilter.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders one checkbox per type', () => {
    vi.mocked(useRelationshipGraphStore).mockReturnValue(
      makeStore({ allTypes: ['document', 'user'], hiddenTypes: new Set() }) as ReturnType<typeof useRelationshipGraphStore>,
    )
    const wrapper = mount(GraphTypeFilter)
    expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(2)
  })

  it('checkbox is checked when type is NOT in hiddenTypes', () => {
    vi.mocked(useRelationshipGraphStore).mockReturnValue(
      makeStore({ allTypes: ['user'], hiddenTypes: new Set() }) as ReturnType<typeof useRelationshipGraphStore>,
    )
    const wrapper = mount(GraphTypeFilter)
    const cb = wrapper.find('input[type="checkbox"]')
    expect((cb.element as HTMLInputElement).checked).toBe(true)
  })

  it('checkbox is unchecked when type IS in hiddenTypes', () => {
    vi.mocked(useRelationshipGraphStore).mockReturnValue(
      makeStore({ allTypes: ['user'], hiddenTypes: new Set(['user']) }) as ReturnType<typeof useRelationshipGraphStore>,
    )
    const wrapper = mount(GraphTypeFilter)
    const cb = wrapper.find('input[type="checkbox"]')
    expect((cb.element as HTMLInputElement).checked).toBe(false)
  })

  it('calls toggleTypeVisibility on checkbox change', async () => {
    const toggleSpy = vi.fn()
    vi.mocked(useRelationshipGraphStore).mockReturnValue(
      makeStore({ allTypes: ['user'], hiddenTypes: new Set(), toggleTypeVisibility: toggleSpy }) as ReturnType<typeof useRelationshipGraphStore>,
    )
    const wrapper = mount(GraphTypeFilter)
    await wrapper.find('input[type="checkbox"]').trigger('change')
    expect(toggleSpy).toHaveBeenCalledWith('user')
  })

  it('calls toggleTypeVisibility a second time when re-checking (toggle back)', async () => {
    const toggleSpy = vi.fn()
    vi.mocked(useRelationshipGraphStore).mockReturnValue(
      makeStore({ allTypes: ['user'], hiddenTypes: new Set(['user']), toggleTypeVisibility: toggleSpy }) as ReturnType<typeof useRelationshipGraphStore>,
    )
    const wrapper = mount(GraphTypeFilter)
    await wrapper.find('input[type="checkbox"]').trigger('change')
    await wrapper.find('input[type="checkbox"]').trigger('change')
    expect(toggleSpy).toHaveBeenCalledTimes(2)
    expect(toggleSpy).toHaveBeenCalledWith('user')
  })

  it('renders nothing when allTypes is empty', () => {
    vi.mocked(useRelationshipGraphStore).mockReturnValue(
      makeStore({ allTypes: [] }) as ReturnType<typeof useRelationshipGraphStore>,
    )
    const wrapper = mount(GraphTypeFilter)
    expect(wrapper.find('[role="group"]').exists()).toBe(false)
  })
})
