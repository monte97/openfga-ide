import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GraphNodeDetail from './GraphNodeDetail.vue'

const nodeData = {
  typeName: 'document',
  color: '#3b82f6',
  relations: ['viewer', 'editor'],
  directlyAssignableTypes: [{ type: 'user' }],
  referencedByTypes: [{ type: 'folder', relation: 'parent' }],
}

function mountPanel(node = nodeData) {
  return mount(GraphNodeDetail, {
    props: { node },
    global: { plugins: [createPinia()] },
  })
}

describe('GraphNodeDetail', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders type name in panel header', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('document')
  })

  it('renders relation list', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('viewer')
    expect(wrapper.text()).toContain('editor')
  })

  it('emits close on X button click', async () => {
    const wrapper = mountPanel()
    await wrapper.find('button[aria-label="Close panel"]').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close on Escape key', async () => {
    const wrapper = mountPanel()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('hides aside when node is null', () => {
    const wrapper = mount(GraphNodeDetail, {
      props: { node: null },
      global: { plugins: [createPinia()] },
    })
    const aside = wrapper.find('aside')
    expect(aside.exists()).toBe(true)
    expect(aside.isVisible()).toBe(false)
  })
})
