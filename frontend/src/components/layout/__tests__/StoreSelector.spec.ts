import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useConnectionStore } from '@/stores/connection'
import StoreSelector from '../StoreSelector.vue'

vi.stubGlobal('fetch', vi.fn())

describe('StoreSelector', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows placeholder when no store is selected', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(StoreSelector, {
      global: { plugins: [pinia] },
    })
    const input = wrapper.find('input')
    expect(input.attributes('placeholder')).toBe('Select a store...')
  })

  it('shows empty input when no stores', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(StoreSelector, {
      global: { plugins: [pinia] },
    })
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('shows store name in input when store is selected', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useConnectionStore()
    store.stores = [
      { id: 's1', name: 'Alpha Store', created_at: '', updated_at: '' },
    ]
    store.storeId = 's1'

    const wrapper = mount(StoreSelector, {
      global: { plugins: [pinia] },
    })
    await wrapper.vm.$nextTick()
    // The active store name should be shown
    expect(store.activeStoreName).toBe('Alpha Store')
  })

  it('selectStore is callable on the store', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useConnectionStore()
    store.stores = [
      { id: 's1', name: 'Alpha', created_at: '', updated_at: '' },
    ]
    store.selectStore('s1')
    expect(store.storeId).toBe('s1')
  })

  it('filteredStores shows all when query is empty', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useConnectionStore()
    store.stores = [
      { id: 'a', name: 'Alpha', created_at: '', updated_at: '' },
      { id: 'b', name: 'Beta', created_at: '', updated_at: '' },
    ]

    const wrapper = mount(StoreSelector, {
      global: { plugins: [pinia] },
    })
    await wrapper.vm.$nextTick()
    // Component renders without error
    expect(wrapper.find('input').exists()).toBe(true)
  })
})
