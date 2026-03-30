import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import RelationshipGraphCanvas from './RelationshipGraphCanvas.vue'

vi.mock('@vue-flow/core', () => ({
  VueFlow: { template: '<div class="vue-flow-mock"><slot /></div>', name: 'VueFlow' },
  BackgroundVariant: { Dots: 'dots' },
  Handle: { template: '<div />' },
  Position: { Top: 'top', Bottom: 'bottom' },
}))

vi.mock('@vue-flow/background', () => ({
  Background: { template: '<div />' },
}))

vi.mock('@vue-flow/controls', () => ({
  Controls: { template: '<div />' },
}))

vi.mock('@/stores/relationshipGraph', () => ({
  useRelationshipGraphStore: vi.fn(),
}))

// Stub child components that depend on the store
vi.mock('@/components/graph/GraphTypeFilter.vue', () => ({
  default: { template: '<div class="graph-type-filter-mock" />' },
}))

vi.mock('@/components/graph/GraphNodeDetail.vue', () => ({
  default: { template: '<div class="graph-node-detail-mock" />' },
}))

import { useRelationshipGraphStore } from '@/stores/relationshipGraph'
import type { Node } from '@vue-flow/core'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
})

function makeStore(overrides: {
  loading?: boolean
  nodes?: Node[]
  visibleNodes?: Node[]
  visibleEdges?: unknown[]
  layoutDone?: boolean
}) {
  return {
    loading: overrides.loading ?? false,
    nodes: overrides.nodes ?? [],
    visibleNodes: overrides.visibleNodes ?? [],
    visibleEdges: overrides.visibleEdges ?? [],
    layoutDone: overrides.layoutDone ?? true,
    setSelectedNode: vi.fn(),
  }
}

const mountOpts = {
  global: {
    plugins: [router],
    stubs: { RouterLink: { template: '<a><slot /></a>' } },
  },
}

describe('RelationshipGraphCanvas.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows LoadingSpinner when store.loading is true', () => {
    vi.mocked(useRelationshipGraphStore).mockReturnValue(
      makeStore({ loading: true }) as ReturnType<typeof useRelationshipGraphStore>,
    )
    const wrapper = mount(RelationshipGraphCanvas, mountOpts)
    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(false)
  })

  it('shows EmptyState when loading is false and nodes is empty', () => {
    vi.mocked(useRelationshipGraphStore).mockReturnValue(
      makeStore({ loading: false, nodes: [], layoutDone: true }) as ReturnType<typeof useRelationshipGraphStore>,
    )
    const wrapper = mount(RelationshipGraphCanvas, mountOpts)
    expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(false)
  })

  it('does NOT show EmptyState while loading is true', () => {
    vi.mocked(useRelationshipGraphStore).mockReturnValue(
      makeStore({ loading: true, nodes: [] }) as ReturnType<typeof useRelationshipGraphStore>,
    )
    const wrapper = mount(RelationshipGraphCanvas, mountOpts)
    expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(false)
  })

  it('renders VueFlow when nodes are present and layoutDone is true', () => {
    vi.mocked(useRelationshipGraphStore).mockReturnValue(
      makeStore({
        loading: false,
        nodes: [{ id: 'user:alice', type: 'entityNode', position: { x: 0, y: 0 }, data: {} }],
        visibleNodes: [{ id: 'user:alice', type: 'entityNode', position: { x: 0, y: 0 }, data: {} }],
        layoutDone: true,
      }) as ReturnType<typeof useRelationshipGraphStore>,
    )
    const wrapper = mount(RelationshipGraphCanvas, mountOpts)
    expect(wrapper.find('.vue-flow-mock').exists()).toBe(true)
  })

  it('calls store.setSelectedNode when a node is clicked', async () => {
    const setSelectedNode = vi.fn()
    vi.mocked(useRelationshipGraphStore).mockReturnValue({
      ...makeStore({
        loading: false,
        nodes: [{ id: 'user:alice', type: 'entityNode', position: { x: 0, y: 0 }, data: {} }],
        visibleNodes: [{ id: 'user:alice', type: 'entityNode', position: { x: 0, y: 0 }, data: {} }],
        layoutDone: true,
      }),
      setSelectedNode,
    } as ReturnType<typeof useRelationshipGraphStore>)
    const wrapper = mount(RelationshipGraphCanvas, mountOpts)
    const vueFlow = wrapper.findComponent({ name: 'VueFlow' })
    await vueFlow.vm.$emit('node-click', { node: { id: 'user:alice' } })
    expect(setSelectedNode).toHaveBeenCalledWith('user:alice')
  })

  it('EmptyState has action-to="/tuple-manager"', () => {
    vi.mocked(useRelationshipGraphStore).mockReturnValue(
      makeStore({ loading: false, nodes: [], layoutDone: true }) as ReturnType<typeof useRelationshipGraphStore>,
    )
    const wrapper = mount(RelationshipGraphCanvas, mountOpts)
    expect(wrapper.findComponent({ name: 'EmptyState' }).props('actionTo')).toBe('/tuple-manager')
  })
})
