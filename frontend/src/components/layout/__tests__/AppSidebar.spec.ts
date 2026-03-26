import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppSidebar from '../AppSidebar.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/model-viewer', component: { template: '<div />' } },
    { path: '/tuple-manager', component: { template: '<div />' } },
    { path: '/query-console', component: { template: '<div />' } },
    { path: '/relationship-graph', component: { template: '<div />' } },
    { path: '/store-admin', component: { template: '<div />' } },
    { path: '/import-export', component: { template: '<div />' } },
  ],
})

beforeAll(async () => {
  await router.push('/model-viewer')
})

function mountSidebar() {
  return mount(AppSidebar, {
    global: { plugins: [router] },
    attachTo: document.body,
  })
}

describe('AppSidebar', () => {
  let innerWidthSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    localStorage.clear()
    innerWidthSpy = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('renders all 6 navigation links', () => {
    const wrapper = mountSidebar()
    const links = wrapper.findAll('a')
    expect(links).toHaveLength(6)
    const hrefs = links.map((l) => l.attributes('href') ?? '')
    expect(hrefs).toContain('/model-viewer')
    expect(hrefs).toContain('/tuple-manager')
    expect(hrefs).toContain('/query-console')
    expect(hrefs).toContain('/relationship-graph')
    expect(hrefs).toContain('/store-admin')
    expect(hrefs).toContain('/import-export')
  })

  it('starts expanded on wide viewport (innerWidth >= 1280)', async () => {
    const wrapper = mountSidebar()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('nav').classes()).toContain('w-60')
  })

  it('auto-collapses when innerWidth < 1280', async () => {
    innerWidthSpy.mockReturnValue(1024)
    const wrapper = mountSidebar()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('nav').classes()).toContain('w-16')
  })

  it('toggle button switches between expanded and collapsed', async () => {
    const wrapper = mountSidebar()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('nav').classes()).toContain('w-60')

    const toggleBtn = wrapper.find('button')
    await toggleBtn.trigger('click')
    expect(wrapper.find('nav').classes()).toContain('w-16')

    await toggleBtn.trigger('click')
    expect(wrapper.find('nav').classes()).toContain('w-60')
  })

  it('saves collapsed state to localStorage on toggle', async () => {
    const wrapper = mountSidebar()
    await wrapper.vm.$nextTick()
    const toggleBtn = wrapper.find('button')
    await toggleBtn.trigger('click')
    expect(localStorage.getItem('sidebar-collapsed')).toBe('true')
    await toggleBtn.trigger('click')
    expect(localStorage.getItem('sidebar-collapsed')).toBe('false')
  })

  it('reads collapsed state from localStorage on mount', async () => {
    localStorage.setItem('sidebar-collapsed', 'true')
    const wrapper = mountSidebar()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('nav').classes()).toContain('w-16')
  })
})
