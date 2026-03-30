import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ListObjectsQuery from './ListObjectsQuery.vue'
import { useQueryStore } from '@/stores/queries'
import { useConnectionStore } from '@/stores/connection'
import { useModelStore } from '@/stores/model'

vi.stubGlobal('fetch', vi.fn())

let pinia: ReturnType<typeof createPinia>

function mountComponent() {
  return mount(ListObjectsQuery, {
    global: { plugins: [pinia] },
  })
}

describe('ListObjectsQuery', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders User label, Relation select, Type select, and List Objects button', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('User')
    expect(wrapper.text()).toContain('Relation')
    expect(wrapper.text()).toContain('Type')
    expect(wrapper.text()).toContain('List Objects')
  })

  it('calls queryStore.listObjects with storeId when button clicked with valid inputs', async () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-test')
    const queryStore = useQueryStore()
    queryStore.listObjectsInputs.user = 'user:alice'
    queryStore.listObjectsInputs.relation = 'viewer'
    queryStore.listObjectsInputs.type = 'document'
    queryStore.listObjects = vi.fn().mockResolvedValue(undefined)

    const wrapper = mountComponent()
    const buttons = wrapper.findAll('button')
    const btn = buttons.find((b) => b.text().includes('List Objects'))
    await btn!.trigger('click')

    expect(queryStore.listObjects).toHaveBeenCalledWith('store-test')
  })

  it('button is disabled when inputs are incomplete', () => {
    const wrapper = mountComponent()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('List Objects'))
    expect(btn!.attributes('disabled')).toBeDefined()
  })

  it('renders TypeBadge and identifier text for each result', () => {
    const queryStore = useQueryStore()
    queryStore.listObjectsResult = ['document:roadmap', 'document:specs']

    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('document:roadmap')
    expect(wrapper.text()).toContain('document:specs')
    const badges = wrapper.findAllComponents({ name: 'TypeBadge' })
    expect(badges.length).toBe(2)
    expect(badges[0].props('typeName')).toBe('document')
  })

  it('renders "No objects found" when result is an empty array', () => {
    const queryStore = useQueryStore()
    queryStore.listObjectsResult = []

    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('No objects found')
  })

  it('does not render result area when result is null', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).not.toContain('No objects found')
  })

  it('relation options come from model store', () => {
    const modelStore = useModelStore()
    modelStore.json = {
      type_definitions: [{ type: 'document', relations: { viewer: {} } }],
    }
    const wrapper = mountComponent()
    // AppSelect placeholder changes when options are available
    expect(wrapper.text()).toContain('Select relation...')
  })

  it('shows "Listing..." text when loading', () => {
    const queryStore = useQueryStore()
    queryStore.listObjectsLoading = true

    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Listing...')
  })
})
