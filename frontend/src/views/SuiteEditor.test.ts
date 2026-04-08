import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, reactive } from 'vue'
import SuiteEditor from './SuiteEditor.vue'
import { useSuiteStore } from '@/stores/suites'
import { useSuiteEditorStore } from '@/stores/suiteEditor'
import { useRunStore } from '@/stores/runs'
import { useToast } from '@/composables/useToast'
import type { Run } from '@/stores/runs'

vi.mock('@/stores/suites', () => ({
  useSuiteStore: vi.fn(),
}))

vi.mock('@/stores/suiteEditor', () => ({
  useSuiteEditorStore: vi.fn(),
}))

vi.mock('@/stores/runs', () => ({
  useRunStore: vi.fn(),
}))

// FixtureEditor and SuiteJsonEditor — stub to avoid DOM/CodeMirror deps
vi.mock('@/components/test-suites/FixtureEditor.vue', () => ({
  default: {
    name: 'FixtureEditor',
    props: ['suite'],
    template: '<div data-testid="fixture-editor-stub" />',
  },
}))

vi.mock('@/components/test-suites/RunPhaseTimeline.vue', () => ({
  default: {
    name: 'RunPhaseTimeline',
    props: ['run', 'totalTestCases'],
    template: '<div data-testid="run-phase-timeline-stub" />',
  },
}))

vi.mock('@/components/test-suites/RunSummaryBadge.vue', () => ({
  default: {
    name: 'RunSummaryBadge',
    props: ['run'],
    template: '<span data-testid="run-summary-badge-stub" />',
  },
}))

vi.mock('@/components/test-suites/SuiteJsonEditor.vue', () => ({
  default: {
    name: 'SuiteJsonEditor',
    props: ['modelValue'],
    emits: ['update:modelValue', 'has-errors'],
    template: '<div data-testid="json-editor-stub" />',
  },
}))

vi.stubGlobal('ResizeObserver', class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
})

const sampleSuite = {
  id: 'suite-1',
  name: 'Auth Suite',
  description: null,
  tags: [],
  createdAt: '2026-03-31T10:00:00Z',
  updatedAt: '2026-03-31T10:00:00Z',
}

const sampleDefinition = {
  groups: [
    {
      id: 'group-1',
      name: 'Auth Group',
      testCases: [
        {
          id: 'test-1',
          user: 'user:alice',
          relation: 'viewer',
          object: 'document:budget',
          expected: true,
        },
      ],
    },
  ],
}

function makeSuiteStoreMock(overrides = {}) {
  return {
    activeSuite: null,
    loadingSuite: false,
    errorSuite: null,
    fetchSuite: vi.fn(),
    saveDefinition: vi.fn(),
    patchDefinition: vi.fn(),
    addGroup: vi.fn(),
    addTestCase: vi.fn().mockReturnValue({ id: 'new-test', user: '', relation: '', object: '', expected: true }),
    updateTestCase: vi.fn(),
    removeTestCase: vi.fn(),
    removeGroup: vi.fn(),
    ...overrides,
  }
}

function makeEditorStoreMock(overrides = {}) {
  return {
    selectedTestCaseId: null,
    expandedGroupIds: new Set<string>(),
    metadataExpanded: false,
    editorMode: 'form' as 'form' | 'json' | 'fixture',
    selectTestCase: vi.fn(),
    toggleGroup: vi.fn(),
    expandGroup: vi.fn(),
    collapseGroup: vi.fn(),
    clearExpandedGroups: vi.fn(),
    toggleMetadata: vi.fn(),
    setEditorMode: vi.fn(),
    ...overrides,
  }
}

function makeRunStoreMock(overrides: Record<string, unknown> = {}) {
  return {
    currentRun: null as Run | null,
    loading: false,
    error: null,
    pollInterval: null,
    consecutiveErrors: 0,
    pollingError: null as string | null,
    triggerRun: vi.fn().mockResolvedValue('run-1'),
    fetchRun: vi.fn(),
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    clearRun: vi.fn(),
    retryPolling: vi.fn(),
    ...overrides,
  }
}

const wrappers: ReturnType<typeof mount>[] = []

function mountEditor() {
  const wrapper = mount(SuiteEditor, {
    props: { suite: sampleSuite },
    attachTo: document.body,
    global: { plugins: [createPinia()] },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('SuiteEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(useSuiteStore).mockReturnValue(
      makeSuiteStoreMock() as unknown as ReturnType<typeof useSuiteStore>
    )
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      makeEditorStoreMock() as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    vi.mocked(useRunStore).mockReturnValue(
      reactive(makeRunStoreMock()) as unknown as ReturnType<typeof useRunStore>
    )
    // Clear any stale toasts
    const { toasts, dismiss } = useToast()
    ;[...toasts].forEach((t) => dismiss(t.id))
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
  })

  it('renders suite editor container with aria-label', () => {
    const wrapper = mountEditor()
    expect(wrapper.find('[aria-label="Suite editor"]').exists()).toBe(true)
  })

  it('renders tree panel with aria-label', () => {
    const wrapper = mountEditor()
    expect(wrapper.find('[aria-label="Suite tree panel"]').exists()).toBe(true)
  })

  it('tree panel is 280px wide', () => {
    const wrapper = mountEditor()
    const panel = wrapper.find('[aria-label="Suite tree panel"]')
    expect(panel.attributes('style')).toContain('280px')
  })

  it('calls fetchSuite on mount', () => {
    const mockStore = makeSuiteStoreMock()
    vi.mocked(useSuiteStore).mockReturnValue(
      mockStore as unknown as ReturnType<typeof useSuiteStore>
    )
    mountEditor()
    expect(mockStore.fetchSuite).toHaveBeenCalledWith('suite-1')
  })

  it('shows "No test case selected" when no selection', () => {
    const wrapper = mountEditor()
    expect(wrapper.text()).toContain('No test case selected')
  })

  it('shows loading state when loadingSuite is true', () => {
    vi.mocked(useSuiteStore).mockReturnValue(
      makeSuiteStoreMock({ loadingSuite: true }) as unknown as ReturnType<typeof useSuiteStore>
    )
    const wrapper = mountEditor()
    expect(wrapper.text()).toContain('Loading suite...')
  })

  it('shows suite name in tree panel header', () => {
    const wrapper = mountEditor()
    expect(wrapper.text()).toContain('Auth Suite')
  })

  it('shows TestCaseForm when a test case is selected', () => {
    vi.mocked(useSuiteStore).mockReturnValue(
      makeSuiteStoreMock({
        activeSuite: { ...sampleSuite, definition: sampleDefinition },
      }) as unknown as ReturnType<typeof useSuiteStore>
    )
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      makeEditorStoreMock({
        selectedTestCaseId: 'test-1',
        expandedGroupIds: new Set(['group-1']),
      }) as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    const wrapper = mountEditor()
    expect(wrapper.findComponent({ name: 'TestCaseForm' }).exists()).toBe(true)
  })

  it('adds a group and saves definition when onAddGroup is called', async () => {
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [] } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(
      mockStore as unknown as ReturnType<typeof useSuiteStore>
    )
    const wrapper = mountEditor()

    const treePanel = wrapper.findComponent({ name: 'SuiteTreePanel' })
    await treePanel.vm.$emit('add-group')
    await nextTick()

    expect(mockStore.addGroup).toHaveBeenCalledOnce()
    expect(mockStore.saveDefinition).toHaveBeenCalledWith(
      'suite-1',
      expect.any(Object)
    )
  })

  it('removes group and deselects if selected test was in group', async () => {
    const mockEditorStore = makeEditorStoreMock({ selectedTestCaseId: 'test-1' })
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      mockEditorStore as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: sampleDefinition },
    })
    vi.mocked(useSuiteStore).mockReturnValue(
      mockStore as unknown as ReturnType<typeof useSuiteStore>
    )
    const wrapper = mountEditor()

    const treePanel = wrapper.findComponent({ name: 'SuiteTreePanel' })
    await treePanel.vm.$emit('remove-group', 'group-1')
    await nextTick()

    expect(mockEditorStore.selectTestCase).toHaveBeenCalledWith(null)
    expect(mockStore.removeGroup).toHaveBeenCalledWith('group-1')
  })

  it('SuiteJsonEditor is always mounted (v-show)', () => {
    const wrapper = mountEditor()
    expect(wrapper.findComponent({ name: 'SuiteJsonEditor' }).exists()).toBe(true)
  })

  it('SuiteJsonEditor is hidden in Form mode', () => {
    const wrapper = mountEditor()
    expect(wrapper.findComponent({ name: 'SuiteJsonEditor' }).isVisible()).toBe(false)
  })

  it('SuiteJsonEditor is visible in JSON mode', () => {
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      makeEditorStoreMock({ editorMode: 'json' }) as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    const wrapper = mountEditor()
    expect(wrapper.findComponent({ name: 'SuiteJsonEditor' }).isVisible()).toBe(true)
  })

  it('shows JSON synced indicator in Form mode when no errors', () => {
    const wrapper = mountEditor()
    expect(wrapper.find('[data-testid="json-synced"]').exists()).toBe(true)
  })

  it('shows json-errors-banner in Form mode after SuiteJsonEditor emits has-errors: true', async () => {
    const wrapper = mountEditor()
    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })
    expect(jsonEditor.exists()).toBe(true)

    await jsonEditor.vm.$emit('has-errors', true)
    await nextTick()

    expect(wrapper.find('[data-testid="json-errors-banner"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="json-synced"]').exists()).toBe(false)
  })

  it('hides json-errors-banner and shows synced indicator after has-errors: false', async () => {
    const wrapper = mountEditor()
    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })

    await jsonEditor.vm.$emit('has-errors', true)
    await nextTick()
    expect(wrapper.find('[data-testid="json-errors-banner"]').exists()).toBe(true)

    await jsonEditor.vm.$emit('has-errors', false)
    await nextTick()
    expect(wrapper.find('[data-testid="json-errors-banner"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="json-synced"]').exists()).toBe(true)
  })

  it('re-fetches, deselects, and resets editorMode to form when suite.id changes', async () => {
    const mockStore = makeSuiteStoreMock()
    const mockEditorStore = makeEditorStoreMock({ editorMode: 'json' })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    vi.mocked(useSuiteEditorStore).mockReturnValue(mockEditorStore as unknown as ReturnType<typeof useSuiteEditorStore>)
    const wrapper = mount(SuiteEditor, {
      props: { suite: sampleSuite },
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    })
    wrappers.push(wrapper)

    await wrapper.setProps({ suite: { ...sampleSuite, id: 'suite-2' } })
    await nextTick()

    expect(mockEditorStore.selectTestCase).toHaveBeenCalledWith(null)
    expect(mockEditorStore.setEditorMode).toHaveBeenCalledWith('form')
    expect(mockEditorStore.clearExpandedGroups).toHaveBeenCalled()
    expect(mockStore.fetchSuite).toHaveBeenCalledWith('suite-2')
  })

  it('calls updateTestCase and saveDefinition when TestCaseForm emits update', async () => {
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: sampleDefinition },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      makeEditorStoreMock({
        selectedTestCaseId: 'test-1',
        expandedGroupIds: new Set(['group-1']),
      }) as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    const wrapper = mountEditor()

    const form = wrapper.findComponent({ name: 'TestCaseForm' })
    await form.vm.$emit('update', 'group-1', 'test-1', { expected: false })
    await nextTick()

    expect(mockStore.updateTestCase).toHaveBeenCalledWith('group-1', 'test-1', { expected: false })
    expect(mockStore.saveDefinition).toHaveBeenCalledWith('suite-1', expect.any(Object))
  })

  it('onJsonChange: in-memory update is immediate, saveDefinition is debounced', async () => {
    vi.useFakeTimers()
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [] } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mountEditor()

    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })
    const newDef = JSON.stringify({ groups: [{ id: 'g1', name: 'G', testCases: [] }] })
    await jsonEditor.vm.$emit('update:modelValue', newDef)
    await nextTick()

    // patchDefinition called immediately (in-memory update)
    expect(mockStore.patchDefinition).toHaveBeenCalledOnce()
    // saveDefinition not yet called
    expect(mockStore.saveDefinition).not.toHaveBeenCalled()

    vi.advanceTimersByTime(600)
    await nextTick()
    expect(mockStore.saveDefinition).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('onJsonChange: rapid edits coalesce into a single saveDefinition call', async () => {
    vi.useFakeTimers()
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [] } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mountEditor()
    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })

    for (let i = 0; i < 5; i++) {
      await jsonEditor.vm.$emit('update:modelValue', JSON.stringify({ groups: [], _i: i }))
      await nextTick()
      vi.advanceTimersByTime(100)
    }
    vi.advanceTimersByTime(600)
    await nextTick()

    expect(mockStore.saveDefinition).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('renders Fixture tab button', () => {
    const wrapper = mountEditor()
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.some((t) => t.text() === 'Fixture')).toBe(true)
  })

  it('FixtureEditor is mounted in v-show panel', () => {
    const wrapper = mountEditor()
    expect(wrapper.findComponent({ name: 'FixtureEditor' }).exists()).toBe(true)
  })

  it('FixtureEditor is hidden in Form mode', () => {
    const wrapper = mountEditor()
    expect(wrapper.findComponent({ name: 'FixtureEditor' }).isVisible()).toBe(false)
  })

  it('FixtureEditor is visible in Fixture mode', () => {
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      makeEditorStoreMock({ editorMode: 'fixture' }) as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    const wrapper = mountEditor()
    expect(wrapper.findComponent({ name: 'FixtureEditor' }).isVisible()).toBe(true)
  })

  it('removes test case and deselects if it was selected', async () => {
    const mockEditorStore = makeEditorStoreMock({ selectedTestCaseId: 'test-1' })
    vi.mocked(useSuiteEditorStore).mockReturnValue(mockEditorStore as unknown as ReturnType<typeof useSuiteEditorStore>)
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: sampleDefinition },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mountEditor()

    const treePanel = wrapper.findComponent({ name: 'SuiteTreePanel' })
    await treePanel.vm.$emit('remove-test-case', 'group-1', 'test-1')
    await nextTick()

    expect(mockEditorStore.selectTestCase).toHaveBeenCalledWith(null)
    expect(mockStore.removeTestCase).toHaveBeenCalledWith('group-1', 'test-1')
  })

  it('Run Suite button is visible in editor header', () => {
    const wrapper = mountEditor()
    expect(wrapper.find('[data-testid="run-suite-button"]').exists()).toBe(true)
  })

  it('Run Suite button is disabled when no fixture defined', () => {
    vi.mocked(useSuiteStore).mockReturnValue(
      makeSuiteStoreMock({
        activeSuite: { ...sampleSuite, definition: { groups: [] } },
      }) as unknown as ReturnType<typeof useSuiteStore>
    )
    const wrapper = mountEditor()
    const btn = wrapper.find('[data-testid="run-suite-button"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('Run Suite button click calls runsStore.triggerRun when fixture is available', async () => {
    const mockRunStore = reactive(makeRunStoreMock())
    vi.mocked(useRunStore).mockReturnValue(mockRunStore as unknown as ReturnType<typeof useRunStore>)
    vi.mocked(useSuiteStore).mockReturnValue(
      makeSuiteStoreMock({
        activeSuite: {
          ...sampleSuite,
          definition: { groups: [], fixture: { model: '', tuples: [] } },
        },
      }) as unknown as ReturnType<typeof useSuiteStore>
    )
    const wrapper = mountEditor()

    await wrapper.find('[data-testid="run-suite-button"]').trigger('click')
    await nextTick()

    expect(mockRunStore.triggerRun).toHaveBeenCalledWith('suite-1')
  })

  it('Ctrl+Enter triggers runSuite when fixture is available', async () => {
    const mockRunStore = reactive(makeRunStoreMock())
    vi.mocked(useRunStore).mockReturnValue(mockRunStore as unknown as ReturnType<typeof useRunStore>)
    vi.mocked(useSuiteStore).mockReturnValue(
      makeSuiteStoreMock({
        activeSuite: {
          ...sampleSuite,
          definition: { groups: [], fixture: { model: '', tuples: [] } },
        },
      }) as unknown as ReturnType<typeof useSuiteStore>
    )
    mountEditor()
    await nextTick() // wait for onMounted async to complete and addEventListener to run

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }))
    await nextTick()

    expect(mockRunStore.triggerRun).toHaveBeenCalledWith('suite-1')
  })

  it('onUnmounted does NOT call runsStore.stopPolling (polling survives tab navigation per AC4)', () => {
    const mockRunStore = reactive(makeRunStoreMock())
    vi.mocked(useRunStore).mockReturnValue(mockRunStore as unknown as ReturnType<typeof useRunStore>)
    const wrapper = mountEditor()
    wrapper.unmount()
    expect(mockRunStore.stopPolling).not.toHaveBeenCalled()
  })

  it('shows success toast when run status transitions to completed', async () => {
    const runRef = reactive(makeRunStoreMock({ currentRun: { ...makeRunStoreMock().currentRun, status: 'running' } as Run | null }))
    vi.mocked(useRunStore).mockReturnValue(runRef as unknown as ReturnType<typeof useRunStore>)
    mountEditor()
    await nextTick()

    ;(runRef as ReturnType<typeof makeRunStoreMock>).currentRun = {
      id: 'run-1',
      suiteId: 'suite-1',
      status: 'completed',
      startedAt: '2026-01-01T12:00:00Z',
      completedAt: '2026-01-01T12:00:05Z',
      error: null,
      summary: { total: 3, passed: 3, failed: 0, errored: 0, durationMs: 500 },
      createdAt: '2026-01-01T12:00:00Z',
      results: [],
    }
    await nextTick()
    await nextTick()

    const { toasts } = useToast()
    expect(toasts.some((t) => t.type === 'success' && t.message.includes('passed'))).toBe(true)
  })

  it('shows error toast when run status transitions to failed', async () => {
    const runRef = reactive(makeRunStoreMock({ currentRun: { id: 'run-1', suiteId: 'suite-1', status: 'running', startedAt: '2026-01-01T12:00:00Z', completedAt: null, error: null, summary: null, createdAt: '2026-01-01T12:00:00Z', results: [] } as Run | null }))
    vi.mocked(useRunStore).mockReturnValue(runRef as unknown as ReturnType<typeof useRunStore>)
    mountEditor()
    await nextTick()

    ;(runRef as ReturnType<typeof makeRunStoreMock>).currentRun = {
      id: 'run-1',
      suiteId: 'suite-1',
      status: 'failed',
      startedAt: '2026-01-01T12:00:00Z',
      completedAt: '2026-01-01T12:00:05Z',
      error: 'check failed',
      summary: { total: 3, passed: 1, failed: 2, errored: 0, durationMs: 500 },
      createdAt: '2026-01-01T12:00:00Z',
      results: [],
    }
    await nextTick()
    await nextTick()

    const { toasts } = useToast()
    expect(toasts.some((t) => t.type === 'error' && t.message.includes('failures'))).toBe(true)
  })

  it('clearRun is called when suite.id changes', async () => {
    const mockRunStore = reactive(makeRunStoreMock())
    vi.mocked(useRunStore).mockReturnValue(mockRunStore as unknown as ReturnType<typeof useRunStore>)
    const wrapper = mount(SuiteEditor, {
      props: { suite: sampleSuite },
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    })
    wrappers.push(wrapper)

    await wrapper.setProps({ suite: { ...sampleSuite, id: 'suite-2' } })
    await nextTick()

    expect(mockRunStore.clearRun).toHaveBeenCalled()
  })

  it('RunPhaseTimeline container is not rendered when currentRun is null', () => {
    const wrapper = mountEditor()
    expect(wrapper.find('[data-testid="phase-timeline-container"]').exists()).toBe(false)
  })

  it('RunPhaseTimeline container is rendered when currentRun is not null', () => {
    vi.mocked(useRunStore).mockReturnValue(
      reactive(makeRunStoreMock({
        currentRun: {
          id: 'run-1',
          suiteId: 'suite-1',
          status: 'running',
          startedAt: '2026-01-01T12:00:00Z',
          completedAt: null,
          error: null,
          summary: null,
          createdAt: '2026-01-01T12:00:00Z',
          results: [],
        } as Run,
      })) as unknown as ReturnType<typeof useRunStore>
    )
    const wrapper = mountEditor()
    expect(wrapper.find('[data-testid="phase-timeline-container"]').exists()).toBe(true)
  })

  it('results from currentRun are passed to SuiteTreePanel', () => {
    const results = [
      { testCase: { user: 'user:alice', relation: 'viewer', object: 'document:budget', expected: true }, actual: true, passed: true, durationMs: 10, error: null },
    ]
    vi.mocked(useRunStore).mockReturnValue(
      reactive(makeRunStoreMock({
        currentRun: {
          id: 'run-1',
          suiteId: 'suite-1',
          status: 'completed',
          startedAt: '2026-01-01T12:00:00Z',
          completedAt: '2026-01-01T12:00:05Z',
          error: null,
          summary: { total: 1, passed: 1, failed: 0, errored: 0, durationMs: 10 },
          createdAt: '2026-01-01T12:00:00Z',
          results,
        } as Run,
      })) as unknown as ReturnType<typeof useRunStore>
    )
    const wrapper = mountEditor()
    const treePanel = wrapper.findComponent({ name: 'SuiteTreePanel' })
    expect(treePanel.props('results')).toEqual(results)
  })

  it('clears jsonSaveTimer when suite.id changes', async () => {
    vi.useFakeTimers()
    const mockSuiteStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: sampleDefinition },
      fetchSuite: vi.fn().mockResolvedValue(undefined),
      saveDefinition: vi.fn().mockResolvedValue(undefined),
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockSuiteStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mountEditor()

    // Trigger a debounced save by emitting JSON change
    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })
    await jsonEditor.vm.$emit('update:modelValue', JSON.stringify(sampleDefinition))
    // Timer is pending but not fired yet
    expect(mockSuiteStore.saveDefinition).not.toHaveBeenCalled()

    // Change the suite — watcher should clear the timer
    await wrapper.setProps({ suite: { ...sampleSuite, id: 'suite-2' } })
    await nextTick()

    // Advance timers — save should NOT fire (timer was cleared)
    vi.runAllTimers()
    await nextTick()
    expect(mockSuiteStore.saveDefinition).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('shows polling error banner and Retry button when pollingError is set', async () => {
    vi.mocked(useRunStore).mockReturnValue(
      reactive(makeRunStoreMock({
        pollingError: 'Polling stopped after repeated failures. Check network and retry.',
        retryPolling: vi.fn(),
      })) as unknown as ReturnType<typeof useRunStore>
    )
    const wrapper = mountEditor()
    await nextTick()

    const banner = wrapper.find('[data-testid="polling-error-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('Polling stopped')
    expect(wrapper.find('[data-testid="polling-retry-button"]').exists()).toBe(true)
  })

  it('calls retryPolling when Retry button is clicked', async () => {
    const mockRetry = vi.fn()
    vi.mocked(useRunStore).mockReturnValue(
      reactive(makeRunStoreMock({
        pollingError: 'Polling stopped after repeated failures. Check network and retry.',
        retryPolling: mockRetry,
      })) as unknown as ReturnType<typeof useRunStore>
    )
    const wrapper = mountEditor()
    await nextTick()

    await wrapper.find('[data-testid="polling-retry-button"]').trigger('click')
    expect(mockRetry).toHaveBeenCalledTimes(1)
  })

  it('run-test-case event from SuiteTreePanel calls triggerRun with testCaseId', async () => {
    const mockRunStore = reactive(makeRunStoreMock())
    vi.mocked(useRunStore).mockReturnValue(mockRunStore as unknown as ReturnType<typeof useRunStore>)
    vi.mocked(useSuiteStore).mockReturnValue(
      makeSuiteStoreMock({
        activeSuite: {
          ...sampleSuite,
          definition: { groups: [], fixture: { model: '', tuples: [] } },
        },
      }) as unknown as ReturnType<typeof useSuiteStore>
    )
    const wrapper = mountEditor()

    const treePanel = wrapper.findComponent({ name: 'SuiteTreePanel' })
    await treePanel.vm.$emit('run-test-case', 'group-1', 'test-1')
    await nextTick()

    expect(mockRunStore.triggerRun).toHaveBeenCalledWith('suite-1', 'test-1')
  })
})
