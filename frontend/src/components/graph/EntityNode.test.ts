import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EntityNode from './EntityNode.vue'

vi.mock('@vue-flow/core', () => ({
  Handle: { template: '<div class="vue-flow-handle" />' },
  Position: { Top: 'top', Bottom: 'bottom' },
}))

function mountNode(entityId: string, typeName: string, color: string) {
  return mount(EntityNode, {
    props: {
      id: entityId,
      type: 'entityNode',
      position: { x: 0, y: 0 },
      data: { entityId, typeName, color },
      label: entityId,
      dragging: false,
      resizing: false,
      selected: false,
      connectable: true,
      zIndex: 0,
      isValidTargetPos: () => true,
      isValidSourcePos: () => true,
      parentNode: undefined,
    },
  })
}

describe('EntityNode.vue', () => {
  it('renders the entityId instance part', () => {
    const wrapper = mountNode('user:alice', 'user', '#3b82f6')
    expect(wrapper.text()).toContain('alice')
  })

  it('renders the typeName prefix', () => {
    const wrapper = mountNode('user:alice', 'user', '#3b82f6')
    expect(wrapper.text()).toContain('user')
  })

  it('renders colored left border with data.color', () => {
    const wrapper = mountNode('user:alice', 'user', '#3b82f6')
    const accentBar = wrapper.find('[style*="background-color"]')
    expect(accentBar.exists()).toBe(true)
    // jsdom normalizes hex to rgb
    expect(accentBar.attributes('style')).toMatch(/background-color:\s*rgb\(59,\s*130,\s*246\)/)
  })

  it('has correct aria-label containing the entityId', () => {
    const wrapper = mountNode('document:roadmap', 'document', '#8b5cf6')
    expect(wrapper.attributes('aria-label')).toBe('Entity: document:roadmap')
  })

  it('has tabindex="0"', () => {
    const wrapper = mountNode('user:alice', 'user', '#3b82f6')
    expect(wrapper.attributes('tabindex')).toBe('0')
  })

  it('handles entityId without colon gracefully', () => {
    const wrapper = mountNode('alice', 'alice', '#3b82f6')
    expect(wrapper.text()).toContain('alice')
  })
})
