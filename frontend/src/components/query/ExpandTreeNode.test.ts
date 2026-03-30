import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ExpandTreeNode from './ExpandTreeNode.vue'

vi.stubGlobal('fetch', vi.fn())

let pinia: ReturnType<typeof createPinia>

const leafUsersNode = {
  name: 'document:roadmap#viewer',
  leaf: { users: { users: ['user:alice', 'user:bob'] } },
}

const unionNode = {
  name: 'document:roadmap#viewer',
  union: {
    nodes: [
      { name: 'document:roadmap#viewer', leaf: { users: { users: ['user:alice'] } } },
      { name: 'document:roadmap#viewer', leaf: { computed: { userset: 'team:backend#member' } } },
    ],
  },
}

describe('ExpandTreeNode', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders node name with TypeBadge', () => {
    const wrapper = mount(ExpandTreeNode, {
      props: { node: leafUsersNode },
      global: { plugins: [pinia] },
    })
    expect(wrapper.text()).toContain('document:roadmap#viewer')
    const badge = wrapper.findComponent({ name: 'TypeBadge' })
    expect(badge.exists()).toBe(true)
  })

  it('renders leaf users when node has leaf.users', () => {
    const wrapper = mount(ExpandTreeNode, {
      props: { node: leafUsersNode },
      global: { plugins: [pinia] },
    })
    expect(wrapper.text()).toContain('user:alice')
    expect(wrapper.text()).toContain('user:bob')
  })

  it('shows toggle button for union nodes', () => {
    const wrapper = mount(ExpandTreeNode, {
      props: { node: unionNode },
      global: { plugins: [pinia] },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('children are hidden by default when defaultExpanded is false', () => {
    const wrapper = mount(ExpandTreeNode, {
      props: { node: unionNode, defaultExpanded: false },
      global: { plugins: [pinia] },
    })
    // Children not visible before expanding
    expect(wrapper.text()).not.toContain('user:alice')
  })

  it('children are visible when defaultExpanded is true', () => {
    const wrapper = mount(ExpandTreeNode, {
      props: { node: unionNode, defaultExpanded: true },
      global: { plugins: [pinia] },
    })
    expect(wrapper.text()).toContain('user:alice')
  })

  it('toggles children visibility on button click', async () => {
    const wrapper = mount(ExpandTreeNode, {
      props: { node: unionNode, defaultExpanded: false },
      global: { plugins: [pinia] },
    })
    expect(wrapper.text()).not.toContain('user:alice')

    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('user:alice')
  })

  it('shows "(union)" label for union nodes', () => {
    const wrapper = mount(ExpandTreeNode, {
      props: { node: unionNode },
      global: { plugins: [pinia] },
    })
    expect(wrapper.text()).toContain('(union)')
  })

  it('renders computed userset leaf', () => {
    const computedNode = {
      name: 'document:roadmap#viewer',
      leaf: { computed: { userset: 'team:backend#member' } },
    }
    const wrapper = mount(ExpandTreeNode, {
      props: { node: computedNode },
      global: { plugins: [pinia] },
    })
    expect(wrapper.text()).toContain('team:backend#member')
    expect(wrapper.text()).toContain('(computed)')
  })
})
