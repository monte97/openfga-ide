import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ExpandQuery from './ExpandQuery.vue'
import { useQueryStore } from '@/stores/queries'
import { useConnectionStore } from '@/stores/connection'

vi.stubGlobal('fetch', vi.fn())

let pinia: ReturnType<typeof createPinia>

function mountComponent() {
  return mount(ExpandQuery, {
    global: {
      plugins: [pinia],
      stubs: { ExpandTreeNode: true },
    },
  })
}

describe('ExpandQuery', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders Relation select, Object input, and Expand button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Relation')
    expect(wrapper.text()).toContain('Object')
    expect(wrapper.text()).toContain('Expand')
  })

  it('calls queryStore.expand with storeId when button clicked with valid inputs', async () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-test')
    const queryStore = useQueryStore()
    queryStore.expandInputs.relation = 'viewer'
    queryStore.expandInputs.object = 'document:roadmap'
    queryStore.expand = vi.fn().mockResolvedValue(undefined)

    const wrapper = mountComponent()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Expand'))
    await btn!.trigger('click')

    expect(queryStore.expand).toHaveBeenCalledWith('store-test')
  })

  it('button is disabled when inputs are incomplete', () => {
    const wrapper = mountComponent()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Expand'))
    expect(btn!.attributes('disabled')).toBeDefined()
  })

  it('renders ExpandTreeNode stub when expandResult is available', () => {
    const queryStore = useQueryStore()
    queryStore.expandResult = { root: { name: 'document:roadmap#viewer' } }

    const wrapper = mountComponent()
    expect(wrapper.find('expand-tree-node-stub').exists()).toBe(true)
  })

  it('does not render tree when expandResult is null', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('expand-tree-node-stub').exists()).toBe(false)
  })

  it('shows "Expanding..." text when loading', () => {
    const queryStore = useQueryStore()
    queryStore.expandLoading = true

    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Expanding...')
  })
})
