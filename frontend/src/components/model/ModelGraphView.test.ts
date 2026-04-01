import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { ref } from 'vue'
import ModelGraphView from './ModelGraphView.vue'
import { useModelStore } from '@/stores/model'

// Stub Vue Flow to avoid canvas/DOM API issues in jsdom
vi.mock('@vue-flow/core', () => ({
  VueFlow: { template: '<div class="vue-flow-stub"><slot /></div>' },
  BackgroundVariant: { Dots: 'dots' },
  markRaw: (v: unknown) => v,
}))
vi.mock('@vue-flow/background', () => ({
  Background: { template: '<div />' },
  BackgroundVariant: { Dots: 'dots' },
}))
vi.mock('@vue-flow/controls', () => ({
  Controls: { template: '<div />' },
}))

const mockLayoutDone = ref(true)
vi.mock('@/composables/useModelGraph', () => ({
  useModelGraph: vi.fn(() => ({
    nodes: ref([]),
    edges: ref([]),
    layoutDone: mockLayoutDone,
  })),
}))

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }],
})

let pinia: ReturnType<typeof createPinia>

function mountView() {
  return mount(ModelGraphView, {
    global: { plugins: [pinia, router] },
  })
}

describe('ModelGraphView', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    mockLayoutDone.value = true
  })

  it('shows EmptyState when modelStore.json is null', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('No authorization model loaded')
  })

  it('shows VueFlow canvas when json is present and layoutDone', () => {
    const modelStore = useModelStore()
    modelStore.json = { id: 'm1', schema_version: '1.1', type_definitions: [] }

    const wrapper = mountView()
    expect(wrapper.find('.vue-flow-stub').exists()).toBe(true)
  })

  it('shows LoadingSpinner when layoutDone is false', async () => {
    mockLayoutDone.value = false

    const modelStore = useModelStore()
    modelStore.json = { id: 'm1', schema_version: '1.1', type_definitions: [] }

    const wrapper = mountView()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true)
  })

  it('shows GraphNodeDetail when selectedNode is set via node click', async () => {
    const modelStore = useModelStore()
    modelStore.json = { id: 'm1', schema_version: '1.1', type_definitions: [] }

    const wrapper = mountView()
    const vm = wrapper.vm as unknown as { selectedNode: { typeName: string; color: string; relations: string[]; directlyAssignableTypes: unknown[]; referencedByTypes: unknown[] } | null }
    vm.selectedNode = {
      typeName: 'document',
      color: '#3b82f6',
      relations: [],
      directlyAssignableTypes: [],
      referencedByTypes: [],
    }
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'GraphNodeDetail' }).exists()).toBe(true)
  })

  it('closes GraphNodeDetail on close event from panel', async () => {
    const modelStore = useModelStore()
    modelStore.json = { id: 'm1', schema_version: '1.1', type_definitions: [] }

    const wrapper = mountView()
    const vm = wrapper.vm as unknown as { selectedNode: unknown }
    vm.selectedNode = { typeName: 'doc', color: '#3b82f6', relations: [], directlyAssignableTypes: [], referencedByTypes: [] }
    await wrapper.vm.$nextTick()

    const detail = wrapper.findComponent({ name: 'GraphNodeDetail' })
    await detail.vm.$emit('close')
    await wrapper.vm.$nextTick()

    expect(vm.selectedNode).toBeNull()
  })
})
