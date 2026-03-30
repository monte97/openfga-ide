import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref, reactive, nextTick } from 'vue'
import RelationshipGraph from './RelationshipGraph.vue'

vi.mock('@/stores/connection', () => ({
  useConnectionStore: vi.fn(),
}))

vi.mock('@/stores/relationshipGraph', () => ({
  useRelationshipGraphStore: vi.fn(),
}))

vi.mock('@/components/graph/RelationshipGraphCanvas.vue', () => ({
  default: {
    template: '<div class="relationship-graph-canvas-mock" />',
    name: 'RelationshipGraphCanvas',
  },
}))

import { useConnectionStore } from '@/stores/connection'
import { useRelationshipGraphStore } from '@/stores/relationshipGraph'

const mountOptions = {
  global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
}

describe('RelationshipGraph.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(useRelationshipGraphStore).mockReturnValue({
      loadGraph: vi.fn().mockResolvedValue(undefined),
      resetFilters: vi.fn(),
    } as unknown as ReturnType<typeof useRelationshipGraphStore>)
  })

  it('renders "No store selected" EmptyState when storeId is empty', () => {
    vi.mocked(useConnectionStore).mockReturnValue({ storeId: '' } as ReturnType<typeof useConnectionStore>)
    const wrapper = mount(RelationshipGraph, mountOptions)
    expect(wrapper.text()).toContain('No store selected')
  })

  it('calls loadGraph on mount when storeId is set', async () => {
    const loadGraph = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useRelationshipGraphStore).mockReturnValue({ loadGraph, resetFilters: vi.fn() } as unknown as ReturnType<typeof useRelationshipGraphStore>)
    vi.mocked(useConnectionStore).mockReturnValue({ storeId: 'store-123' } as ReturnType<typeof useConnectionStore>)
    mount(RelationshipGraph, mountOptions)
    await Promise.resolve()
    expect(loadGraph).toHaveBeenCalledWith('store-123')
  })

  it('renders RelationshipGraphCanvas when storeId is set', () => {
    vi.mocked(useConnectionStore).mockReturnValue({ storeId: 'store-123' } as ReturnType<typeof useConnectionStore>)
    const wrapper = mount(RelationshipGraph, mountOptions)
    expect(wrapper.find('.relationship-graph-canvas-mock').exists()).toBe(true)
  })

  it('renders page title "Relationship Graph" when storeId is set', () => {
    vi.mocked(useConnectionStore).mockReturnValue({ storeId: 'store-123' } as ReturnType<typeof useConnectionStore>)
    const wrapper = mount(RelationshipGraph, mountOptions)
    expect(wrapper.text()).toContain('Relationship Graph')
  })

  it('does NOT render the canvas when storeId is empty', () => {
    vi.mocked(useConnectionStore).mockReturnValue({ storeId: '' } as ReturnType<typeof useConnectionStore>)
    const wrapper = mount(RelationshipGraph, mountOptions)
    expect(wrapper.find('.relationship-graph-canvas-mock').exists()).toBe(false)
  })

  it('calls loadGraph when storeId changes to a new value', async () => {
    const storeIdRef = ref('')
    const loadGraph = vi.fn().mockResolvedValue(undefined)
    const resetFilters = vi.fn()
    vi.mocked(useRelationshipGraphStore).mockReturnValue({ loadGraph, resetFilters } as unknown as ReturnType<typeof useRelationshipGraphStore>)
    vi.mocked(useConnectionStore).mockReturnValue(
      reactive({ storeId: storeIdRef }) as unknown as ReturnType<typeof useConnectionStore>,
    )
    mount(RelationshipGraph, mountOptions)
    storeIdRef.value = 'store-new'
    await nextTick()
    expect(loadGraph).toHaveBeenCalledWith('store-new')
  })

  it('calls resetFilters when storeId is cleared', async () => {
    const storeIdRef = ref('store-123')
    const loadGraph = vi.fn().mockResolvedValue(undefined)
    const resetFilters = vi.fn()
    vi.mocked(useRelationshipGraphStore).mockReturnValue({ loadGraph, resetFilters } as unknown as ReturnType<typeof useRelationshipGraphStore>)
    vi.mocked(useConnectionStore).mockReturnValue(
      reactive({ storeId: storeIdRef }) as unknown as ReturnType<typeof useConnectionStore>,
    )
    mount(RelationshipGraph, mountOptions)
    loadGraph.mockClear()
    storeIdRef.value = ''
    await nextTick()
    expect(resetFilters).toHaveBeenCalled()
    expect(loadGraph).not.toHaveBeenCalled()
  })
})
