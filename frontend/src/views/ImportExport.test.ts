import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ImportExport from './ImportExport.vue'
import { useConnectionStore } from '@/stores/connection'

// jsdom doesn't have DragEvent — polyfill it
if (typeof globalThis.DragEvent === 'undefined') {
  globalThis.DragEvent = class DragEvent extends MouseEvent {
    constructor(type: string, init?: MouseEventInit) {
      super(type, init)
    }
  } as unknown as typeof DragEvent
}

let fileReaderContent = ''

class MockFileReader {
  result: string | null = null
  onload: ((e: unknown) => void) | null = null
  readAsText() {
    this.result = fileReaderContent
    this.onload?.({ target: this })
  }
}

vi.stubGlobal('FileReader', MockFileReader)

vi.stubGlobal('ResizeObserver', class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
})

vi.mock('@/stores/importExport', () => ({
  useImportExportStore: vi.fn(),
}))

vi.mock('@/composables/useImport', () => ({
  useImport: vi.fn(),
}))

import { useImportExportStore } from '@/stores/importExport'
import { useImport } from '@/composables/useImport'

const mountOptions = {
  global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
}

let pinia: ReturnType<typeof createPinia>

function makeImportExportStore(overrides: { loading?: boolean; error?: string | null } = {}) {
  return {
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    exportStore: vi.fn().mockResolvedValue(undefined),
  }
}

function makeImportComposable() {
  return {
    importing: false,
    importError: null,
    importToNewStore: vi.fn().mockResolvedValue({}),
    importToCurrentStore: vi.fn().mockResolvedValue({}),
  }
}

function makeFile(content: string, name = 'test.json'): File {
  return new File([content], name, { type: 'application/json' })
}

async function dropFileOnDropzone(wrapper: ReturnType<typeof mount>, file: File) {
  const dropzone = wrapper.findComponent({ name: 'FileImportDropzone' })
  const dropEvent = new DragEvent('drop', { bubbles: true })
  Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } })
  await dropzone.find('div').element.dispatchEvent(dropEvent)
  await flushPromises()
}

describe('ImportExport.vue', () => {
  beforeEach(() => {
    fileReaderContent = ''
    pinia = createPinia()
    setActivePinia(pinia)
    vi.mocked(useImportExportStore).mockReturnValue(
      makeImportExportStore() as ReturnType<typeof useImportExportStore>,
    )
    vi.mocked(useImport).mockReturnValue(
      makeImportComposable() as ReturnType<typeof useImport>,
    )
  })

  function mountView(importExportLoading = false) {
    vi.mocked(useImportExportStore).mockReturnValue(
      makeImportExportStore({ loading: importExportLoading }) as ReturnType<typeof useImportExportStore>,
    )
    return mount(ImportExport, { global: { plugins: [pinia], ...mountOptions.global } })
  }

  it('renders EmptyState when no store is selected', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('No store selected')
  })

  it('renders Export button when a store is selected', () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-01')
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Export')
    expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(false)
  })

  it('renders FileImportDropzone in import section when store is selected', () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-01')
    const wrapper = mountView()
    expect(wrapper.findComponent({ name: 'FileImportDropzone' }).exists()).toBe(true)
  })

  it('Export button click calls importExportStore.exportStore', async () => {
    const mockStore = makeImportExportStore()
    vi.mocked(useImportExportStore).mockReturnValue(
      mockStore as ReturnType<typeof useImportExportStore>,
    )
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-01')
    const wrapper = mount(ImportExport, { global: { plugins: [pinia], ...mountOptions.global } })
    const buttons = wrapper.findAll('button')
    const exportBtn = buttons.find((b) => b.text().includes('Export'))
    await exportBtn!.trigger('click')
    expect(mockStore.exportStore).toHaveBeenCalledWith('store-01', expect.anything())
  })

  it('shows error message when importExportStore.error is set', () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-01')
    vi.mocked(useImportExportStore).mockReturnValue(
      makeImportExportStore({ error: 'Export failed: connection refused' }) as ReturnType<typeof useImportExportStore>,
    )
    const wrapper = mount(ImportExport, { global: { plugins: [pinia], ...mountOptions.global } })
    expect(wrapper.text()).toContain('Export failed: connection refused')
  })

  it('Export button is disabled while loading', () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-01')
    vi.mocked(useImportExportStore).mockReturnValue(
      makeImportExportStore({ loading: true }) as ReturnType<typeof useImportExportStore>,
    )
    const wrapper = mount(ImportExport, { global: { plugins: [pinia], ...mountOptions.global } })
    const buttons = wrapper.findAll('button')
    const exportBtn = buttons.find((b) => b.text().includes('Export'))
    expect(exportBtn!.attributes('disabled')).toBeDefined()
  })

  it('import action buttons are not rendered before a file is selected', () => {
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-01')
    const wrapper = mountView()
    const btns = wrapper.findAll('button')
    expect(btns.some((b) => b.text().includes('Import to New Store'))).toBe(false)
    expect(btns.some((b) => b.text().includes('Import to Current Store'))).toBe(false)
  })

  it('import action buttons appear after a valid file is dropped', async () => {
    fileReaderContent = JSON.stringify({ model: null, tuples: [{ user: 'user:alice', relation: 'viewer', object: 'doc:1' }] })
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-01')
    const wrapper = mountView()
    await dropFileOnDropzone(wrapper, makeFile('{}', 'backup.json'))
    const btns = wrapper.findAll('button')
    expect(btns.some((b) => b.text().includes('Import to New Store'))).toBe(true)
    expect(btns.some((b) => b.text().includes('Import to Current Store'))).toBe(true)
  })

  it('"Import to Current Store" opens ConfirmDialog', async () => {
    fileReaderContent = JSON.stringify({ model: null, tuples: [] })
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-01')
    const wrapper = mountView()
    await dropFileOnDropzone(wrapper, makeFile('{}', 'backup.json'))
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Import to Current Store'))
    await btn!.trigger('click')
    await wrapper.vm.$nextTick()
    const dialog = wrapper.findComponent({ name: 'ConfirmDialog' })
    expect(dialog.props('open')).toBe(true)
  })

  it('confirming import to current store calls importToCurrentStore', async () => {
    fileReaderContent = JSON.stringify({ model: null, tuples: [{ user: 'user:alice', relation: 'viewer', object: 'doc:1' }] })
    const importComposable = makeImportComposable()
    vi.mocked(useImport).mockReturnValue(importComposable as ReturnType<typeof useImport>)
    const connectionStore = useConnectionStore()
    connectionStore.selectStore('store-01')
    const wrapper = mount(ImportExport, { global: { plugins: [pinia], ...mountOptions.global } })
    await dropFileOnDropzone(wrapper, makeFile('{}', 'backup.json'))
    // Directly set parsedPayload to work around Vue's ref auto-unwrapping via template ref
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).parsedPayload = { model: null, tuples: [{ user: 'user:alice', relation: 'viewer', object: 'doc:1' }] }
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Import to Current Store'))
    await btn!.trigger('click')
    await wrapper.vm.$nextTick()
    const dialog = wrapper.findComponent({ name: 'ConfirmDialog' })
    await dialog.vm.$emit('confirm')
    await flushPromises()
    expect(importComposable.importToCurrentStore).toHaveBeenCalled()
  })
})
