import { describe, it, expect, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { Search } from 'lucide-vue-next'
import EmptyState from '../EmptyState.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/model-viewer', component: { template: '<div />' } },
    { path: '/import-export', component: { template: '<div />' } },
  ],
})

beforeAll(async () => {
  await router.push('/model-viewer')
})

describe('EmptyState', () => {
  it('renders the icon when provided', () => {
    const wrapper = mount(EmptyState, {
      props: { icon: Search, message: 'No data' },
      global: { plugins: [router] },
    })
    expect(wrapper.findComponent(Search).exists()).toBe(true)
  })

  it('renders title when provided', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'Query Console', message: 'No model loaded' },
      global: { plugins: [router] },
    })
    expect(wrapper.text()).toContain('Query Console')
  })

  it('renders message', () => {
    const wrapper = mount(EmptyState, {
      props: { message: 'No data available' },
      global: { plugins: [router] },
    })
    expect(wrapper.text()).toContain('No data available')
  })

  it('renders action button with router-link when actionLabel and actionTo are provided', () => {
    const wrapper = mount(EmptyState, {
      props: {
        message: 'Empty',
        actionLabel: 'Go to Import/Export',
        actionTo: '/import-export',
      },
      global: { plugins: [router] },
    })
    expect(wrapper.text()).toContain('Go to Import/Export')
    expect(wrapper.find('a').exists()).toBe(true)
  })

  it('renders action button without router-link when actionLabel provided but no actionTo', () => {
    const wrapper = mount(EmptyState, {
      props: { message: 'Empty', actionLabel: 'Create Store' },
      global: { plugins: [router] },
    })
    const btn = wrapper.findComponent({ name: 'AppButton' })
    expect(btn.exists()).toBe(true)
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('emits action event when button clicked (no actionTo)', async () => {
    const wrapper = mount(EmptyState, {
      props: { message: 'Empty', actionLabel: 'Do Something' },
      global: { plugins: [router] },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('action')).toBeTruthy()
  })

  it('does not render button when actionLabel is omitted', () => {
    const wrapper = mount(EmptyState, {
      props: { message: 'Empty' },
      global: { plugins: [router] },
    })
    expect(wrapper.findComponent({ name: 'AppButton' }).exists()).toBe(false)
  })
})
