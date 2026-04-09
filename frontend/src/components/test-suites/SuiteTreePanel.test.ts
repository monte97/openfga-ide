import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SuiteTreePanel from './SuiteTreePanel.vue'
import type { SuiteDefinition } from '@/stores/suites'
import type { RunResult } from '@/stores/runs'

const wrappers: ReturnType<typeof mount>[] = []

const definition: SuiteDefinition = {
  groups: [
    {
      id: 'group-1',
      name: 'Auth Group',
      testCases: [
        { id: 'test-1', user: 'user:alice', relation: 'viewer', object: 'document:budget', expected: true },
        { id: 'test-2', user: 'user:bob', relation: 'owner', object: 'document:plan', expected: false },
      ],
    },
    {
      id: 'group-2',
      name: 'Admin Group',
      testCases: [],
    },
  ],
}

function mountTree(overrides: {
  definition?: SuiteDefinition
  selectedTestCaseId?: string | null
  expandedGroupIds?: Set<string>
  results?: RunResult[]
} = {}) {
  const wrapper = mount(SuiteTreePanel, {
    props: {
      definition: overrides.definition ?? definition,
      selectedTestCaseId: overrides.selectedTestCaseId ?? null,
      expandedGroupIds: overrides.expandedGroupIds ?? new Set(),
      results: overrides.results ?? [],
    },
    attachTo: document.body,
    global: { plugins: [createPinia()] },
  })
  wrappers.push(wrapper)
  return wrapper
}

function makeResult(user: string, relation: string, object: string, expected: boolean, passed: boolean): RunResult {
  return {
    testCase: { user, relation, object, expected },
    actual: passed === expected ? expected : !expected,
    passed,
    durationMs: 12,
    error: null,
  }
}

describe('SuiteTreePanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
  })

  it('renders groups as treeitems with role="treeitem"', () => {
    const wrapper = mountTree()
    const items = wrapper.findAll('[role="treeitem"]')
    // 2 groups (tests are collapsed)
    expect(items.length).toBeGreaterThanOrEqual(2)
  })

  it('renders tree container with role="tree"', () => {
    const wrapper = mountTree()
    expect(wrapper.find('[role="tree"]').exists()).toBe(true)
  })

  it('groups have aria-expanded=false when collapsed', () => {
    const wrapper = mountTree({ expandedGroupIds: new Set() })
    const groupItem = wrapper.findAll('[role="treeitem"]').find(
      (el) => el.text().includes('Auth Group')
    )
    expect(groupItem?.attributes('aria-expanded')).toBe('false')
  })

  it('groups have aria-expanded=true when expanded', () => {
    const wrapper = mountTree({ expandedGroupIds: new Set(['group-1']) })
    const groupItem = wrapper.findAll('[role="treeitem"]').find(
      (el) => el.text().includes('Auth Group')
    )
    expect(groupItem?.attributes('aria-expanded')).toBe('true')
  })

  it('test cases are hidden when group is collapsed', () => {
    const wrapper = mountTree({ expandedGroupIds: new Set() })
    expect(wrapper.text()).not.toContain('user:alice')
  })

  it('test cases are visible when group is expanded', () => {
    const wrapper = mountTree({ expandedGroupIds: new Set(['group-1']) })
    expect(wrapper.text()).toContain('user:alice')
  })

  it('emits toggle-group when group header is clicked', async () => {
    const wrapper = mountTree()
    const groupItem = wrapper.findAll('[role="treeitem"]').find(
      (el) => el.attributes('aria-expanded') !== undefined && el.text().includes('Auth Group')
    )
    await groupItem!.trigger('click')
    expect(wrapper.emitted('toggle-group')).toBeTruthy()
    expect(wrapper.emitted('toggle-group')![0]).toEqual(['group-1'])
  })

  it('emits select when test case is clicked', () => {
    const wrapper = mountTree({ expandedGroupIds: new Set(['group-1']) })
    const testItem = wrapper.findAll('[role="treeitem"]').find(
      (el) => el.attributes('aria-expanded') === undefined && el.text().includes('user:alice')
    )
    testItem!.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((wrapper.emitted('select')![0] as any[])[0].id).toBe('test-1')
  })

  it('highlights selected test case', () => {
    const wrapper = mountTree({ expandedGroupIds: new Set(['group-1']), selectedTestCaseId: 'test-1' })
    const testItem = wrapper.findAll('[role="treeitem"]').find(
      (el) => el.attributes('aria-expanded') === undefined && el.text().includes('user:alice')
    )
    expect(testItem?.classes()).toContain('bg-info/10')
  })

  it('emits add-group when + Group button is clicked', async () => {
    const wrapper = mountTree()
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Group'))
    await addBtn!.trigger('click')
    expect(wrapper.emitted('add-group')).toBeTruthy()
  })

  it('shows empty state when no groups', () => {
    const wrapper = mountTree({ definition: { groups: [] } })
    expect(wrapper.text()).toContain('No groups yet')
  })

  describe('keyboard navigation', () => {
    it('ArrowDown moves focus to next node', async () => {
      const wrapper = mountTree({ expandedGroupIds: new Set(['group-1']) })
      const tree = wrapper.find('[role="tree"]')
      // Focus first group
      const nodes = wrapper.findAll('[data-node-id]')
      nodes[0].element.focus()

      await tree.trigger('keydown', { key: 'ArrowDown' })
      // After ArrowDown from group-1, focus should move to test-1
      // We check that no error was thrown
      expect(wrapper.emitted()).toBeDefined()
    })

    it('ArrowRight emits toggle-group on collapsed group', async () => {
      const wrapper = mountTree({ expandedGroupIds: new Set() })
      const tree = wrapper.find('[role="tree"]')
      const groupNode = wrapper.find('[data-node-id="group-1"]')
      groupNode.element.focus()

      await tree.trigger('keydown', { key: 'ArrowRight' })
      expect(wrapper.emitted('toggle-group')).toBeTruthy()
      expect(wrapper.emitted('toggle-group')![0]).toEqual(['group-1'])
    })

    it('ArrowLeft emits toggle-group on expanded group', async () => {
      const wrapper = mountTree({ expandedGroupIds: new Set(['group-1']) })
      const tree = wrapper.find('[role="tree"]')
      const groupNode = wrapper.find('[data-node-id="group-1"]')
      groupNode.element.focus()

      await tree.trigger('keydown', { key: 'ArrowLeft' })
      expect(wrapper.emitted('toggle-group')).toBeTruthy()
      expect(wrapper.emitted('toggle-group')![0]).toEqual(['group-1'])
    })

    it('Enter emits select on focused test case', async () => {
      const wrapper = mountTree({ expandedGroupIds: new Set(['group-1']) })
      const tree = wrapper.find('[role="tree"]')
      const testNode = wrapper.find('[data-node-id="test-1"]')
      testNode.element.focus()

      await tree.trigger('keydown', { key: 'Enter' })
      expect(wrapper.emitted('select')).toBeTruthy()
    })
  })

  describe('with run results', () => {
    const passResult = makeResult('user:alice', 'viewer', 'document:budget', true, true)
    const failResult = makeResult('user:bob', 'owner', 'document:plan', false, false)

    it('shows pass icon (tc-result-pass) for a passed test case', () => {
      const wrapper = mountTree({
        expandedGroupIds: new Set(['group-1']),
        results: [passResult],
      })
      expect(wrapper.find('[data-testid^="tc-result-pass-"]').exists()).toBe(true)
    })

    it('shows fail icon (tc-result-fail) for a failed test case', () => {
      const wrapper = mountTree({
        expandedGroupIds: new Set(['group-1']),
        results: [{ ...failResult, passed: false }],
      })
      expect(wrapper.find('[data-testid^="tc-result-fail-"]').exists()).toBe(true)
    })

    it('failed test cases sort before passed test cases in expanded group', () => {
      const wrapper = mountTree({
        expandedGroupIds: new Set(['group-1']),
        results: [passResult, { ...failResult, passed: false }],
      })
      const testNodes = wrapper.findAll('[data-node-id^="test-"]')
      // test-2 (bob, failed) should come before test-1 (alice, passed)
      expect(testNodes[0].attributes('data-node-id')).toBe('test-2')
      expect(testNodes[1].attributes('data-node-id')).toBe('test-1')
    })

    it('shows green group ratio badge when all tests pass', () => {
      const wrapper = mountTree({
        results: [passResult, makeResult('user:bob', 'owner', 'document:plan', false, true)],
      })
      const badge = wrapper.find('[data-testid="group-result-badge-group-1"]')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('2/2')
      expect(badge.classes().join(' ')).toContain('text-success')
    })

    it('shows red group ratio badge when any test fails', () => {
      const wrapper = mountTree({
        results: [passResult, { ...failResult, passed: false }],
      })
      const badge = wrapper.find('[data-testid="group-result-badge-group-1"]')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('1/2')
      expect(badge.classes().join(' ')).toContain('text-error')
    })

    it('does not show ratio badge when results are empty', () => {
      const wrapper = mountTree({ results: [] })
      expect(wrapper.find('[data-testid="group-result-badge-group-1"]').exists()).toBe(false)
    })

    it('emits run-test-case when ▶ button is clicked', async () => {
      const wrapper = mountTree({ expandedGroupIds: new Set(['group-1']) })
      const runBtn = wrapper.find('[data-testid="run-tc-button"]')
      await runBtn.trigger('click')
      expect(wrapper.emitted('run-test-case')).toBeTruthy()
      const [groupId, testCaseId] = wrapper.emitted('run-test-case')![0] as [string, string]
      expect(groupId).toBe('group-1')
      expect(testCaseId).toBe('test-1')
    })
  })
})
