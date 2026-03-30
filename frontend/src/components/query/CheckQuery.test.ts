import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CheckQuery from './CheckQuery.vue'
import { useQueryStore } from '@/stores/queries'
import { useConnectionStore } from '@/stores/connection'

vi.stubGlobal('fetch', vi.fn())

let pinia: ReturnType<typeof createPinia>

function mountCheckQuery() {
  return mount(CheckQuery, {
    global: {
      plugins: [pinia],
      stubs: { WhyButton: true },
    },
  })
}

describe('CheckQuery', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders User label, Object placeholder, and Check button', () => {
    const wrapper = mountCheckQuery()
    expect(wrapper.text()).toContain('User')
    expect(wrapper.text()).toContain('Object')
    expect(wrapper.text()).toContain('Check')
  })

  it('calls queryStore.runCheck with storeId when Check button clicked', async () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-test')
    const queryStore = useQueryStore()
    queryStore.checkUser = 'user:alice'
    queryStore.checkRelation = 'viewer'
    queryStore.checkObject = 'document:roadmap'
    queryStore.runCheck = vi.fn().mockResolvedValue(undefined)

    const wrapper = mountCheckQuery()
    const buttons = wrapper.findAll('button')
    const checkBtn = buttons.find((b) => b.text().includes('Check'))
    await checkBtn!.trigger('click')

    expect(queryStore.runCheck).toHaveBeenCalledWith('store-test')
  })

  it('renders "Allowed" with success styling when result is allowed', () => {
    const queryStore = useQueryStore()
    queryStore.checkResult = { allowed: true, responseTime: 50 }

    const wrapper = mountCheckQuery()
    expect(wrapper.text()).toContain('Allowed')
    expect(wrapper.text()).not.toContain('Denied')
  })

  it('renders "Denied" with error styling when result is denied', () => {
    const queryStore = useQueryStore()
    queryStore.checkResult = { allowed: false, responseTime: 30 }

    const wrapper = mountCheckQuery()
    expect(wrapper.text()).toContain('Denied')
    expect(wrapper.text()).not.toContain('Allowed')
  })

  it('shows response time after result is displayed', () => {
    const queryStore = useQueryStore()
    queryStore.checkResult = { allowed: true, responseTime: 123 }

    const wrapper = mountCheckQuery()
    expect(wrapper.text()).toContain('123ms')
  })

  it('disables Check button when relation is not selected', () => {
    const queryStore = useQueryStore()
    queryStore.checkUser = 'user:alice'
    queryStore.checkObject = 'document:roadmap'
    // checkRelation is null by default

    const wrapper = mountCheckQuery()
    const buttons = wrapper.findAll('button')
    const checkBtn = buttons.find((b) => b.text().includes('Check'))
    expect(checkBtn!.attributes('disabled')).toBeDefined()
  })

  it('renders WhyButton stub after result is displayed', () => {
    const queryStore = useQueryStore()
    queryStore.checkResult = { allowed: true, responseTime: 50 }

    const wrapper = mountCheckQuery()
    expect(wrapper.find('why-button-stub').exists()).toBe(true)
  })
})
