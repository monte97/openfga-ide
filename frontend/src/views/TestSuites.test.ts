import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { nextTick } from 'vue'
import TestSuites from './TestSuites.vue'
import { useSuiteStore } from '@/stores/suites'

vi.mock('@/stores/suites', () => ({
  useSuiteStore: vi.fn(),
}))

// SuiteEditor uses its own stores — stub the component to isolate TestSuites tests
vi.mock('./SuiteEditor.vue', () => ({
  default: { name: 'SuiteEditor', template: '<div data-testid="suite-editor">SuiteEditor</div>' },
}))

vi.mock('@/components/test-suites/ImportPreview.vue', () => ({
  default: {
    name: 'ImportPreview',
    emits: ['confirm', 'cancel'],
    template: '<div data-testid="import-preview-stub" />',
  },
}))

// Headless UI Dialog uses ResizeObserver — stub for jsdom
vi.stubGlobal('ResizeObserver', class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
})

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }],
})

const wrappers: ReturnType<typeof mount>[] = []

const sampleSuite = {
  id: 'suite-1',
  name: 'Auth Suite',
  description: 'Auth tests',
  tags: ['auth'],
  createdAt: '2026-03-31T10:00:00Z',
  updatedAt: '2026-03-31T10:00:00Z',
  lastRun: null,
  groupCount: 0,
  testCount: 0,
}

function makeStoreMock(overrides = {}) {
  return {
    suites: [],
    loading: false,
    error: null,
    activeSuite: null,
    loadingSuite: false,
    fetchSuites: vi.fn(),
    fetchSuite: vi.fn(),
    createSuite: vi.fn(),
    deleteSuite: vi.fn(),
    saveDefinition: vi.fn(),
    addGroup: vi.fn(),
    addTestCase: vi.fn(),
    updateTestCase: vi.fn(),
    removeTestCase: vi.fn(),
    removeGroup: vi.fn(),
    importSuite: vi.fn(),
    exportSuite: vi.fn(),
    ...overrides,
  }
}

function mountView() {
  const wrapper = mount(TestSuites, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router] },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('TestSuites', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(useSuiteStore).mockReturnValue(makeStoreMock() as unknown as ReturnType<typeof useSuiteStore>)
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
  })

  describe('tab navigation', () => {
    it('renders Suites and Editor tabs', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Suites')
      expect(wrapper.text()).toContain('Editor')
    })

    it('shows Suites tab content by default', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Test Suites')
    })
  })

  describe('onMounted', () => {
    it('calls fetchSuites on mount', () => {
      const mockStore = makeStoreMock()
      vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)
      mountView()
      expect(mockStore.fetchSuites).toHaveBeenCalledOnce()
    })
  })

  describe('error state', () => {
    it('shows error banner when suiteStore.error is set', () => {
      vi.mocked(useSuiteStore).mockReturnValue(
        makeStoreMock({ error: 'Failed to load suites' }) as unknown as ReturnType<typeof useSuiteStore>,
      )
      const wrapper = mountView()
      const banner = wrapper.find('[role="alert"]')
      expect(banner.exists()).toBe(true)
      expect(banner.text()).toContain('Failed to load suites')
    })

    it('does not show error banner when error is null', () => {
      const wrapper = mountView()
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })
  })

  describe('empty state', () => {
    it('shows guided empty state with 3 steps when no suites', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Get started with Test Suites')
      expect(wrapper.text()).toContain('Name your suite')
      expect(wrapper.text()).toContain('Import a fixture')
      expect(wrapper.text()).toContain('Add your first test case')
    })

    it('shows "Create your first suite" CTA in empty state', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Create your first suite')
    })
  })

  describe('suite list', () => {
    it('shows New Suite button when suites exist', () => {
      vi.mocked(useSuiteStore).mockReturnValue(
        makeStoreMock({ suites: [sampleSuite] }) as unknown as ReturnType<typeof useSuiteStore>,
      )
      const wrapper = mountView()
      expect(wrapper.text()).toContain('New Suite')
    })

    it('renders suite cards', () => {
      vi.mocked(useSuiteStore).mockReturnValue(
        makeStoreMock({ suites: [sampleSuite] }) as unknown as ReturnType<typeof useSuiteStore>,
      )
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Auth Suite')
    })
  })

  describe('create form', () => {
    it('shows create form when "Create your first suite" is clicked', async () => {
      const wrapper = mountView()
      const cta = wrapper.findAll('button').find((b) => b.text().includes('Create your first suite'))
      await cta!.trigger('click')
      expect(wrapper.find('[aria-label="Create suite form"]').exists()).toBe(true)
    })

    it('shows validation error when submitting without name', async () => {
      const wrapper = mountView()
      const cta = wrapper.findAll('button').find((b) => b.text().includes('Create your first suite'))
      await cta!.trigger('click')
      const createBtn = wrapper.findAll('button').find((b) => b.text() === 'Create')
      await createBtn!.trigger('click')
      await nextTick()
      expect(wrapper.text()).toContain('Name is required')
    })

    it('calls createSuite and closes form on success', async () => {
      const mockStore = makeStoreMock()
      mockStore.createSuite.mockResolvedValue(sampleSuite)
      vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)

      const wrapper = mountView()
      const cta = wrapper.findAll('button').find((b) => b.text().includes('Create your first suite'))
      await cta!.trigger('click')

      await wrapper.find('#suite-name').setValue('New Suite')
      const createBtn = wrapper.findAll('button').find((b) => b.text() === 'Create')
      await createBtn!.trigger('click')
      await nextTick()

      expect(mockStore.createSuite).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Suite' }),
      )
      await nextTick() // wait for async submitCreate to complete
      expect(wrapper.find('[aria-label="Create suite form"]').exists()).toBe(false)
    })

    it('cancels form without creating', async () => {
      const mockStore = makeStoreMock()
      vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)

      const wrapper = mountView()
      const cta = wrapper.findAll('button').find((b) => b.text().includes('Create your first suite'))
      await cta!.trigger('click')
      const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel')
      await cancelBtn!.trigger('click')
      await nextTick()

      expect(wrapper.find('[aria-label="Create suite form"]').exists()).toBe(false)
      expect(mockStore.createSuite).not.toHaveBeenCalled()
    })
  })

  describe('delete dialog', () => {
    it('opens ConfirmDialog with correct title when delete is requested', async () => {
      vi.mocked(useSuiteStore).mockReturnValue(
        makeStoreMock({ suites: [sampleSuite] }) as unknown as ReturnType<typeof useSuiteStore>,
      )
      const wrapper = mountView()

      // Emit delete event directly from SuiteCard
      const card = wrapper.findComponent({ name: 'SuiteCard' })
      await card.vm.$emit('delete', sampleSuite)
      await nextTick()

      const dialog = wrapper.findComponent({ name: 'ConfirmDialog' })
      expect(dialog.props('open')).toBe(true)
      expect(dialog.props('title')).toContain('Auth Suite')
    })

    it('calls deleteSuite when ConfirmDialog emits confirm', async () => {
      const mockStore = makeStoreMock({ suites: [sampleSuite] })
      mockStore.deleteSuite.mockResolvedValue(undefined)
      vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)

      const wrapper = mountView()
      const card = wrapper.findComponent({ name: 'SuiteCard' })
      await card.vm.$emit('delete', sampleSuite)
      await nextTick()

      const dialog = wrapper.findComponent({ name: 'ConfirmDialog' })
      await dialog.vm.$emit('confirm')
      await nextTick()

      expect(mockStore.deleteSuite).toHaveBeenCalledWith('suite-1')
    })

    it('does not call deleteSuite when ConfirmDialog emits cancel', async () => {
      const mockStore = makeStoreMock({ suites: [sampleSuite] })
      vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)

      const wrapper = mountView()
      const card = wrapper.findComponent({ name: 'SuiteCard' })
      await card.vm.$emit('delete', sampleSuite)
      await nextTick()

      const dialog = wrapper.findComponent({ name: 'ConfirmDialog' })
      await dialog.vm.$emit('cancel')
      await nextTick()

      expect(mockStore.deleteSuite).not.toHaveBeenCalled()
      expect(dialog.props('open')).toBe(false)
    })
  })

  describe('import flow', () => {
    it('shows "Import Suite" button in suites tab', () => {
      const wrapper = mountView()
      expect(wrapper.text()).toContain('Import Suite')
    })

    it('shows ImportPreview when "Import Suite" is clicked', async () => {
      const wrapper = mountView()
      const importBtn = wrapper.findAll('button').find((b) => b.text() === 'Import Suite')
      await importBtn!.trigger('click')
      await nextTick()
      expect(wrapper.find('[data-testid="import-preview-stub"]').exists()).toBe(true)
    })

    it('hides ImportPreview and calls importSuite when confirm emitted', async () => {
      const mockStore = makeStoreMock()
      const importedSuite = { ...sampleSuite, id: 'suite-imported' }
      mockStore.importSuite.mockResolvedValue(importedSuite)
      vi.mocked(useSuiteStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useSuiteStore>)

      const wrapper = mountView()
      const importBtn = wrapper.findAll('button').find((b) => b.text() === 'Import Suite')
      await importBtn!.trigger('click')
      await nextTick()

      const preview = wrapper.findComponent({ name: 'ImportPreview' })
      await preview.vm.$emit('confirm', { name: 'Auth Suite' })
      await nextTick()
      await nextTick()

      expect(mockStore.importSuite).toHaveBeenCalledWith({ name: 'Auth Suite' })
      expect(wrapper.find('[data-testid="import-preview-stub"]').exists()).toBe(false)
    })

    it('hides ImportPreview when cancel is emitted without importing', async () => {
      const wrapper = mountView()
      const importBtn = wrapper.findAll('button').find((b) => b.text() === 'Import Suite')
      await importBtn!.trigger('click')
      await nextTick()

      const preview = wrapper.findComponent({ name: 'ImportPreview' })
      await preview.vm.$emit('cancel')
      await nextTick()

      expect(wrapper.find('[data-testid="import-preview-stub"]').exists()).toBe(false)
    })
  })

  describe('editor tab', () => {
    it('switches to Editor tab and shows SuiteEditor when card is clicked', async () => {
      vi.mocked(useSuiteStore).mockReturnValue(
        makeStoreMock({ suites: [sampleSuite] }) as unknown as ReturnType<typeof useSuiteStore>,
      )
      const wrapper = mountView()

      await wrapper.find('[role="article"]').trigger('click')
      await nextTick()

      // Switch to Editor tab
      const editorTab = wrapper.findAll('button').find((b) => b.text() === 'Editor')
      await editorTab!.trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="suite-editor"]').exists()).toBe(true)
    })

    it('shows fallback text when no suite is selected in Editor tab', async () => {
      const wrapper = mountView()

      const editorTab = wrapper.findAll('button').find((b) => b.text() === 'Editor')
      await editorTab!.trigger('click')
      await nextTick()

      expect(wrapper.text()).toContain('Select a suite from the Suites tab')
    })
  })
})
