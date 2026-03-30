import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ResolutionPath from './ResolutionPath.vue'

vi.stubGlobal('fetch', vi.fn())

const testRouter = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }],
})

let pinia: ReturnType<typeof createPinia>

const treeWithUsers = {
  root: {
    name: 'document:roadmap#viewer',
    leaf: { users: { users: ['user:alice', 'user:marco'] } },
  },
}

const treeWithOneUser = {
  root: {
    name: 'document:roadmap#viewer',
    leaf: { users: { users: ['user:alice'] } },
  },
}

describe('ResolutionPath', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    testRouter.replace('/')
  })

  it('renders hop chain: leaf users followed by root relation as final node', () => {
    const wrapper = mount(ResolutionPath, {
      props: { expandTree: treeWithUsers, allowed: true },
      global: { plugins: [pinia, testRouter] },
    })
    const badges = wrapper.findAllComponents({ name: 'TypeBadge' })
    // 2 leaf users + root relation = 3 nodes
    expect(badges.length).toBe(3)
    expect(badges[0].props('typeName')).toBe('user:alice')
    expect(badges[1].props('typeName')).toBe('user:marco')
    expect(badges[2].props('typeName')).toBe('document:roadmap#viewer')
  })

  it('renders computed userset hop followed by root relation', () => {
    const treeWithComputedHop = {
      root: {
        name: 'document:roadmap#viewer',
        leaf: { computed: { userset: 'team:backend#member' } },
      },
    }
    const wrapper = mount(ResolutionPath, {
      props: { expandTree: treeWithComputedHop, allowed: true },
      global: { plugins: [pinia, testRouter] },
    })
    const badges = wrapper.findAllComponents({ name: 'TypeBadge' })
    expect(badges.length).toBe(2)
    expect(badges[0].props('typeName')).toBe('team:backend#member')
    expect(badges[1].props('typeName')).toBe('document:roadmap#viewer')
  })

  it('shows arrow separators between nodes', () => {
    const wrapper = mount(ResolutionPath, {
      props: { expandTree: treeWithUsers, allowed: true },
      global: { plugins: [pinia, testRouter] },
    })
    // 2 nodes → 1 ArrowRight svg
    const svgs = wrapper.findAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(1)
  })

  it('shows denied indicator for denied results', () => {
    const wrapper = mount(ResolutionPath, {
      props: { expandTree: treeWithOneUser, allowed: false },
      global: { plugins: [pinia, testRouter] },
    })
    expect(wrapper.text()).toContain('denied')
  })

  it('does not show denied indicator for allowed results', () => {
    const wrapper = mount(ResolutionPath, {
      props: { expandTree: treeWithOneUser, allowed: true },
      global: { plugins: [pinia, testRouter] },
    })
    expect(wrapper.text()).not.toContain('denied')
  })

  it('clickable TypeBadge navigates to relationship graph', async () => {
    const pushSpy = vi.spyOn(testRouter, 'push')

    const wrapper = mount(ResolutionPath, {
      props: { expandTree: treeWithOneUser, allowed: true },
      global: { plugins: [pinia, testRouter] },
    })

    await wrapper.find('button').trigger('click')

    expect(pushSpy).toHaveBeenCalledWith('/relationship-graph?entity=user%3Aalice')
  })
})
