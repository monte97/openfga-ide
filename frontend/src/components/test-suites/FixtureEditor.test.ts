import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import FixtureEditor from './FixtureEditor.vue'
import { useSuiteStore } from '@/stores/suites'
import { useConnectionStore } from '@/stores/connection'

vi.mock('@/stores/suites', () => ({
  useSuiteStore: vi.fn(),
}))

vi.mock('@/stores/connection', () => ({
  useConnectionStore: vi.fn(),
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
  lastRun: null,
  groupCount: 0,
  testCount: 0,
}

const sampleFixture = {
  model: { type_definitions: [] },
  tuples: [],
}

function makeSuiteStoreMock(overrides = {}) {
  return {
    activeSuite: null,
    updateFixture: vi.fn(),
    saveDefinition: vi.fn(),
    ...overrides,
  }
}

function makeConnectionStoreMock(overrides = {}) {
  return {
    storeId: 'store-1',
    ...overrides,
  }
}

const wrappers: ReturnType<typeof mount>[] = []

function mountFixtureEditor() {
  const wrapper = mount(FixtureEditor, {
    props: { suite: sampleSuite },
    attachTo: document.body,
    global: { plugins: [createPinia()] },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('FixtureEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(useSuiteStore).mockReturnValue(
      makeSuiteStoreMock() as unknown as ReturnType<typeof useSuiteStore>
    )
    vi.mocked(useConnectionStore).mockReturnValue(
      makeConnectionStoreMock() as unknown as ReturnType<typeof useConnectionStore>
    )
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    vi.restoreAllMocks()
  })

  it('shows empty state when no fixture', () => {
    const wrapper = mountFixtureEditor()
    expect(wrapper.find('[data-testid="fixture-empty-state"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'SuiteJsonEditor' }).exists()).toBe(false)
  })

  it('shows SuiteJsonEditor when fixture exists', () => {
    vi.mocked(useSuiteStore).mockReturnValue(
      makeSuiteStoreMock({
        activeSuite: { ...sampleSuite, definition: { groups: [], fixture: sampleFixture } },
      }) as unknown as ReturnType<typeof useSuiteStore>
    )
    const wrapper = mountFixtureEditor()
    expect(wrapper.find('[data-testid="fixture-empty-state"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'SuiteJsonEditor' }).exists()).toBe(true)
  })

  it('"Add empty fixture" calls updateFixture({}) and saveDefinition', async () => {
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [] } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mountFixtureEditor()

    await wrapper.find('[data-testid="add-empty-fixture-button"]').trigger('click')
    await nextTick()

    expect(mockStore.updateFixture).toHaveBeenCalledWith({})
    expect(mockStore.saveDefinition).toHaveBeenCalledWith('suite-1', expect.any(Object))
  })

  it('import button is disabled when no storeId', () => {
    vi.mocked(useConnectionStore).mockReturnValue(
      makeConnectionStoreMock({ storeId: '' }) as unknown as ReturnType<typeof useConnectionStore>
    )
    const wrapper = mountFixtureEditor()
    const btn = wrapper.find('[data-testid="import-fixture-button"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('import button is enabled when storeId is set', () => {
    const wrapper = mountFixtureEditor()
    const btn = wrapper.find('[data-testid="import-fixture-button"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('calls updateFixture immediately and saveDefinition after debounce', async () => {
    vi.useFakeTimers()
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [], fixture: sampleFixture } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mountFixtureEditor()

    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })
    await jsonEditor.vm.$emit('update:modelValue', JSON.stringify({ model: {}, tuples: [] }))
    await nextTick()

    // updateFixture is immediate
    expect(mockStore.updateFixture).toHaveBeenCalledWith({ model: {}, tuples: [] })
    // saveDefinition is debounced — not yet called
    expect(mockStore.saveDefinition).not.toHaveBeenCalled()

    vi.advanceTimersByTime(600)
    await nextTick()
    expect(mockStore.saveDefinition).toHaveBeenCalledWith('suite-1', expect.any(Object))

    vi.useRealTimers()
  })

  it('rapid JSON edits fire saveDefinition only once', async () => {
    vi.useFakeTimers()
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [], fixture: sampleFixture } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mountFixtureEditor()
    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })

    await jsonEditor.vm.$emit('update:modelValue', JSON.stringify({ tuples: [] }))
    await nextTick()
    vi.advanceTimersByTime(200)
    await jsonEditor.vm.$emit('update:modelValue', JSON.stringify({ tuples: [1] }))
    await nextTick()
    vi.advanceTimersByTime(200)
    await jsonEditor.vm.$emit('update:modelValue', JSON.stringify({ tuples: [1, 2] }))
    await nextTick()
    vi.advanceTimersByTime(600)
    await nextTick()

    expect(mockStore.saveDefinition).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('shows validation banner when tuples is not an array', async () => {
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [], fixture: sampleFixture } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mountFixtureEditor()

    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })
    await jsonEditor.vm.$emit('update:modelValue', JSON.stringify({ tuples: 'not-an-array' }))
    await nextTick()

    expect(wrapper.find('[data-testid="fixture-validation-banner"]').exists()).toBe(true)
    expect(mockStore.updateFixture).not.toHaveBeenCalled()
  })

  it('shows validation banner when root is not an object', async () => {
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [], fixture: sampleFixture } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mountFixtureEditor()

    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })
    await jsonEditor.vm.$emit('update:modelValue', JSON.stringify([1, 2, 3]))
    await nextTick()

    expect(wrapper.find('[data-testid="fixture-validation-banner"]').exists()).toBe(true)
    expect(mockStore.updateFixture).not.toHaveBeenCalled()
  })

  it('fetches export endpoint and calls updateFixture on import', async () => {
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [] } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: { type_definitions: [] },
        tuples: [],
        storeName: 'My Store',
        exportedAt: '2026-03-31T00:00:00Z',
      }),
      text: async () => '',
    }))

    const wrapper = mountFixtureEditor()
    await wrapper.find('[data-testid="import-fixture-button"]').trigger('click')
    await nextTick()
    await nextTick()

    const fetchMock = vi.mocked(global.fetch)
    expect(fetchMock).toHaveBeenCalledWith('/api/stores/store-1/export')
    expect(mockStore.updateFixture).toHaveBeenCalledWith({
      model: { type_definitions: [] },
      tuples: [],
    })
    expect(mockStore.saveDefinition).toHaveBeenCalledWith('suite-1', expect.any(Object))
  })

  it('clears validation banner when tab becomes active again after a switch', async () => {
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [], fixture: sampleFixture } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mount(FixtureEditor, {
      props: { suite: sampleSuite, active: true },
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    })
    wrappers.push(wrapper)

    // Trigger a structural validation error
    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })
    await jsonEditor.vm.$emit('update:modelValue', JSON.stringify({ tuples: 'not-an-array' }))
    await nextTick()
    expect(wrapper.find('[data-testid="fixture-validation-banner"]').exists()).toBe(true)

    // Switch away from fixture tab
    await wrapper.setProps({ active: false })
    await nextTick()

    // Switch back to fixture tab — banner must be gone
    await wrapper.setProps({ active: true })
    await nextTick()
    expect(wrapper.find('[data-testid="fixture-validation-banner"]').exists()).toBe(false)
  })

  it('clears validation banner when suite.id changes', async () => {
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [], fixture: sampleFixture } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mount(FixtureEditor, {
      props: { suite: sampleSuite },
      attachTo: document.body,
      global: { plugins: [createPinia()] },
    })
    wrappers.push(wrapper)

    // Trigger a validation error
    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })
    await jsonEditor.vm.$emit('update:modelValue', JSON.stringify({ tuples: 'not-an-array' }))
    await nextTick()
    expect(wrapper.find('[data-testid="fixture-validation-banner"]').exists()).toBe(true)

    // Switch to a different suite
    await wrapper.setProps({ suite: { ...sampleSuite, id: 'suite-2' } })
    await nextTick()
    expect(wrapper.find('[data-testid="fixture-validation-banner"]').exists()).toBe(false)
  })

  it('clears validation banner after valid JSON follows invalid JSON', async () => {
    const mockStore = makeSuiteStoreMock({
      activeSuite: { ...sampleSuite, definition: { groups: [], fixture: sampleFixture } },
    })
    vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
    const wrapper = mountFixtureEditor()

    const jsonEditor = wrapper.findComponent({ name: 'SuiteJsonEditor' })
    await jsonEditor.vm.$emit('update:modelValue', JSON.stringify({ tuples: 'not-an-array' }))
    await nextTick()
    expect(wrapper.find('[data-testid="fixture-validation-banner"]').exists()).toBe(true)

    await jsonEditor.vm.$emit('update:modelValue', JSON.stringify({ model: {}, tuples: [] }))
    await nextTick()
    expect(wrapper.find('[data-testid="fixture-validation-banner"]').exists()).toBe(false)
  })
})
