import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ModelDslView from './ModelDslView.vue'
import { useToast } from '@/composables/useToast'

vi.mock('@/composables/useShiki', () => ({
  highlightDsl: vi.fn().mockResolvedValue('<pre><code>mocked dsl</code></pre>'),
}))

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }],
})

function mountComponent(props: { dsl: string | null }) {
  return mount(ModelDslView, {
    props,
    global: {
      plugins: [createPinia(), router],
    },
  })
}

describe('ModelDslView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    })
  })

  it('renders EmptyState when dsl is null', () => {
    const wrapper = mountComponent({ dsl: null })
    expect(wrapper.text()).toContain('No authorization model loaded')
  })

  it('renders EmptyState when dsl is empty string', () => {
    const wrapper = mountComponent({ dsl: '' })
    expect(wrapper.text()).toContain('No authorization model loaded')
  })

  it('renders code block element when dsl is provided', async () => {
    const wrapper = mountComponent({ dsl: 'model\n  schema 1.1' })
    // wait for async highlight watch
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('div[class*="overflow-auto"]').exists()).toBe(true)
  })

  it('Copy button calls navigator.clipboard.writeText with dsl value', async () => {
    const dsl = 'model\n  schema 1.1'
    const wrapper = mountComponent({ dsl })
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()

    const copyBtn = wrapper.find('button')
    await copyBtn.trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(dsl)
  })

  it('Copy success shows toast "DSL copied to clipboard"', async () => {
    const { toasts } = useToast()
    const dsl = 'model\n  schema 1.1'
    const wrapper = mountComponent({ dsl })
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()

    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()

    expect(toasts.some((t) => t.message === 'DSL copied to clipboard')).toBe(true)
  })
})
