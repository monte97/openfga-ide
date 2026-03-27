import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ModelTypeNode from './ModelTypeNode.vue'

// Vue Flow Handle uses SVG/DOM APIs not available in jsdom — stub it
vi.mock('@vue-flow/core', () => ({
  Handle: { template: '<div />' },
  Position: { Left: 'left', Right: 'right' },
}))

const baseData = {
  typeName: 'document',
  color: '#3b82f6',
  relations: ['viewer', 'editor', 'owner'],
  directlyAssignableTypes: [],
  referencedByTypes: [],
}

function mountNode(data = baseData) {
  return mount(ModelTypeNode, { props: { data } })
}

describe('ModelTypeNode', () => {
  it('renders typeName from props.data.typeName', () => {
    const wrapper = mountNode()
    expect(wrapper.text()).toContain('document')
  })

  it('renders relation list from props.data.relations', () => {
    const wrapper = mountNode()
    expect(wrapper.text()).toContain('viewer')
    expect(wrapper.text()).toContain('editor')
    expect(wrapper.text()).toContain('owner')
  })

  it('aria-label contains the type name', () => {
    const wrapper = mountNode()
    expect(wrapper.attributes('aria-label')).toBe('Type: document')
  })

  it('shows +N more when relations exceed MAX_VISIBLE_RELATIONS (3)', () => {
    const data = {
      ...baseData,
      relations: ['viewer', 'editor', 'owner', 'admin'],
    }
    const wrapper = mountNode(data)
    expect(wrapper.text()).toContain('+1 more')
  })

  it('applies the color as background of header', () => {
    const wrapper = mountNode()
    const header = wrapper.find('[style]')
    // jsdom normalizes hex → rgb
    const style = header.attributes('style') ?? ''
    expect(style).toMatch(/background-color:\s*rgb\(59,\s*130,\s*246\)/);
  })
})
