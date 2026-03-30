import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import WhyButton from './WhyButton.vue'
import { useQueryStore } from '@/stores/queries'
import { useConnectionStore } from '@/stores/connection'

vi.stubGlobal('fetch', vi.fn())

let pinia: ReturnType<typeof createPinia>

function mountWhyButton() {
  return mount(WhyButton, {
    global: {
      plugins: [pinia],
      stubs: { ResolutionPath: true },
    },
  })
}

describe('WhyButton', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders "Why?" button text', () => {
    const wrapper = mountWhyButton()
    expect(wrapper.text()).toContain('Why?')
  })

  it('first click triggers expand API call with storeId', async () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-1')
    const queryStore = useQueryStore()
    queryStore.runExpand = vi.fn().mockResolvedValue(undefined)

    const wrapper = mountWhyButton()
    await wrapper.find('button').trigger('click')

    expect(queryStore.runExpand).toHaveBeenCalledWith('store-1')
  })

  it('shows LoadingSpinner and hides Why? text during expand', () => {
    const queryStore = useQueryStore()
    queryStore.expandLoading = true

    const wrapper = mountWhyButton()
    expect(wrapper.findComponent({ name: 'LoadingSpinner' }).exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Why?')
  })

  it('shows ResolutionPath when expandResult available and toggled expanded', async () => {
    const queryStore = useQueryStore()
    queryStore.expandResult = { root: { name: 'doc:1#viewer' } }
    queryStore.checkResult = { allowed: true, responseTime: 50 }
    queryStore.runExpand = vi.fn().mockResolvedValue(undefined)

    const wrapper = mountWhyButton()
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('resolution-path-stub').exists()).toBe(true)
  })
})
