import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import GraphNodeDetail from './GraphNodeDetail.vue'

vi.mock('@/stores/relationshipGraph', () => ({
  useRelationshipGraphStore: vi.fn(),
}))

vi.mock('@/stores/queries', () => ({
  useQueryStore: vi.fn(),
}))

import { useRelationshipGraphStore } from '@/stores/relationshipGraph'
import { useQueryStore } from '@/stores/queries'
import type { Edge } from '@vue-flow/core'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/query-console', component: { template: '<div />' } },
  ],
})

function makeGraphStore(overrides: {
  selectedNodeId?: string | null
  edges?: Edge[]
  setSelectedNode?: ReturnType<typeof vi.fn>
}) {
  return {
    selectedNodeId: overrides.selectedNodeId ?? null,
    edges: overrides.edges ?? [],
    setSelectedNode: overrides.setSelectedNode ?? vi.fn(),
  }
}

function makeQueryStore() {
  return {
    activeTab: 'check',
    checkUser: '',
    checkObject: '',
  }
}

function mountPanel(graphStoreOverrides: Parameters<typeof makeGraphStore>[0] = {}) {
  setActivePinia(createPinia())
  const graphStore = makeGraphStore(graphStoreOverrides)
  const queryStore = makeQueryStore()
  vi.mocked(useRelationshipGraphStore).mockReturnValue(graphStore as ReturnType<typeof useRelationshipGraphStore>)
  vi.mocked(useQueryStore).mockReturnValue(queryStore as ReturnType<typeof useQueryStore>)
  const wrapper = mount(GraphNodeDetail, { global: { plugins: [router] } })
  return { wrapper, graphStore, queryStore }
}

describe('GraphNodeDetail.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('panel is not visible (display:none) when selectedNodeId is null', () => {
    const { wrapper } = mountPanel({ selectedNodeId: null })
    expect(wrapper.find('aside').attributes('style')).toContain('display: none')
  })

  it('panel is visible when selectedNodeId is set', () => {
    const { wrapper } = mountPanel({ selectedNodeId: 'user:alice', edges: [] })
    expect(wrapper.find('aside').attributes('style') ?? '').not.toContain('display: none')
  })

  it('shows typeName and entityLocalId in header', () => {
    const { wrapper } = mountPanel({ selectedNodeId: 'document:roadmap', edges: [] })
    expect(wrapper.text()).toContain('document')
    expect(wrapper.text()).toContain('roadmap')
  })

  it('shows relationships involving the selected node', () => {
    const { wrapper } = mountPanel({
      selectedNodeId: 'user:alice',
      edges: [{ id: 'e1', source: 'user:alice', target: 'document:roadmap', label: 'viewer' }] as Edge[],
    })
    expect(wrapper.text()).toContain('viewer')
    expect(wrapper.text()).toContain('roadmap')
  })

  it('pressing Esc calls setSelectedNode(null)', async () => {
    const setSelectedNode = vi.fn()
    mountPanel({ selectedNodeId: 'user:alice', edges: [], setSelectedNode })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await new Promise((r) => setTimeout(r, 0))
    expect(setSelectedNode).toHaveBeenCalledWith(null)
  })

  it('clicking outside the panel calls setSelectedNode(null)', async () => {
    const setSelectedNode = vi.fn()
    mountPanel({ selectedNodeId: 'user:alice', edges: [], setSelectedNode })
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 0))
    expect(setSelectedNode).toHaveBeenCalledWith(null)
  })

  it('shows "No relationships" when selected node has no edges', () => {
    const { wrapper } = mountPanel({ selectedNodeId: 'user:alice', edges: [] })
    expect(wrapper.text()).toContain('No relationships')
  })

  it('"Query this entity" pre-fills checkUser for user-side entity and navigates', async () => {
    const { wrapper, queryStore } = mountPanel({
      selectedNodeId: 'user:alice',
      edges: [
        { id: 'e1', source: 'user:alice', target: 'document:roadmap', label: 'viewer' },
        { id: 'e2', source: 'user:alice', target: 'document:spec', label: 'editor' },
      ] as Edge[],
    })
    const btn = wrapper.find('button.w-full')
    await btn.trigger('click')
    expect(queryStore.checkUser).toBe('user:alice')
    expect(queryStore.activeTab).toBe('check')
  })

  it('"Query this entity" pre-fills checkObject for object-side entity', async () => {
    const { wrapper, queryStore } = mountPanel({
      selectedNodeId: 'document:roadmap',
      edges: [
        { id: 'e1', source: 'user:alice', target: 'document:roadmap', label: 'viewer' },
        { id: 'e2', source: 'user:bob', target: 'document:roadmap', label: 'editor' },
      ] as Edge[],
    })
    const btn = wrapper.find('button.w-full')
    await btn.trigger('click')
    expect(queryStore.checkObject).toBe('document:roadmap')
  })
})
