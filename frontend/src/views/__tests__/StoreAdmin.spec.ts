import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ref } from 'vue'

vi.stubGlobal('ResizeObserver', class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
})

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

const fetchStorsMock = vi.fn()
const createStoreMock = vi.fn()
const deleteStoreMock = vi.fn()
const selectStoreMock = vi.fn()

const storeListRef = ref<Array<{ id: string; name: string; created_at: string; updated_at: string }>>([])
const loadingRef = ref(false)
const errorRef = ref<string | null>(null)

vi.mock('@/stores/stores', () => ({
  useStoresStore: () => ({
    storeList: storeListRef.value,
    loading: loadingRef.value,
    error: errorRef.value,
    fetchStores: fetchStorsMock,
    createStore: createStoreMock,
    deleteStore: deleteStoreMock,
    selectStore: selectStoreMock,
  }),
}))

vi.mock('@/stores/connection', () => ({
  useConnectionStore: () => ({
    storeId: ref('').value,
  }),
}))

const exportStoreMock = vi.fn()
vi.mock('@/stores/importExport', () => ({
  useImportExportStore: () => ({
    exportStore: exportStoreMock,
  }),
}))

const importToStoreMock = vi.fn()
vi.mock('@/composables/useImport', () => ({
  useImport: () => ({
    importing: false,
    importToStore: importToStoreMock,
  }),
}))

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/store-admin', component: { template: '<div />' } },
  ],
})

async function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const { default: StoreAdmin } = await import('../StoreAdmin.vue')
  const wrapper = mount(StoreAdmin, {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return wrapper
}

describe('StoreAdmin', () => {
  beforeEach(async () => {
    fileReaderContent = ''
    fetchStorsMock.mockReset().mockResolvedValue(undefined)
    createStoreMock.mockReset()
    deleteStoreMock.mockReset()
    selectStoreMock.mockReset()
    exportStoreMock.mockReset()
    importToStoreMock.mockReset()
    storeListRef.value = []
    loadingRef.value = false
    errorRef.value = null
    await router.push('/')
  })

  it('calls fetchStores on mount', async () => {
    await mountView()
    expect(fetchStorsMock).toHaveBeenCalledOnce()
  })

  it('shows empty state when no stores', async () => {
    storeListRef.value = []
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('No stores on this instance')
  })

  it('shows store list when stores exist', async () => {
    storeListRef.value = [
      { id: 'store-1', name: 'Alpha', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: 'store-2', name: 'Beta', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('Beta')
  })

  it('shows Create Store button and opens form on click', async () => {
    const wrapper = await mountView()
    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('Create Store'))
    expect(createBtn).toBeTruthy()
    await createBtn!.trigger('click')
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('calls createStore with trimmed name on form submit', async () => {
    createStoreMock.mockResolvedValue({ id: 'new-1', name: 'New', created_at: '', updated_at: '' })
    const wrapper = await mountView()

    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('Create Store'))
    await createBtn!.trigger('click')

    const input = wrapper.find('input')
    await input.setValue('  New Store  ')

    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()

    expect(createStoreMock).toHaveBeenCalledWith('New Store')
  })

  it('does not submit when name is empty', async () => {
    const wrapper = await mountView()
    const createBtn = wrapper.findAll('button').find((b) => b.text().includes('Create Store'))
    await createBtn!.trigger('click')

    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()

    expect(createStoreMock).not.toHaveBeenCalled()
  })

  it('shows ConfirmDialog when delete is triggered from StoreCard', async () => {
    storeListRef.value = [
      { id: 'store-1', name: 'My Store', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()

    const storeCard = wrapper.findComponent({ name: 'StoreCard' })
    await storeCard.vm.$emit('delete')
    await wrapper.vm.$nextTick()

    const dialog = wrapper.findComponent({ name: 'ConfirmDialog' })
    expect(dialog.props('open')).toBe(true)
    expect(dialog.props('message')).toContain("My Store")
  })

  it('calls deleteStore when confirm dialog confirmed', async () => {
    deleteStoreMock.mockResolvedValue(undefined)
    storeListRef.value = [
      { id: 'store-1', name: 'My Store', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()

    const storeCard = wrapper.findComponent({ name: 'StoreCard' })
    await storeCard.vm.$emit('delete')
    await wrapper.vm.$nextTick()

    const dialog = wrapper.findComponent({ name: 'ConfirmDialog' })
    await dialog.vm.$emit('confirm')
    await flushPromises()

    expect(deleteStoreMock).toHaveBeenCalledWith('store-1')
  })

  it('calls selectStore when StoreCard select is emitted', async () => {
    storeListRef.value = [
      { id: 'store-1', name: 'Alpha', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()

    const storeCard = wrapper.findComponent({ name: 'StoreCard' })
    await storeCard.vm.$emit('select')

    expect(selectStoreMock).toHaveBeenCalledWith('store-1')
  })

  it('shows error message when fetchStores fails', async () => {
    errorRef.value = 'Connection refused'
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('Connection refused')
  })

  it('calls exportStore with "Backup" label when StoreCard backup is emitted', async () => {
    exportStoreMock.mockResolvedValue(undefined)
    storeListRef.value = [
      { id: 'store-1', name: 'My Store', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()

    const storeCard = wrapper.findComponent({ name: 'StoreCard' })
    await storeCard.vm.$emit('backup', 'store-1')
    await flushPromises()

    expect(exportStoreMock).toHaveBeenCalledWith('store-1', 'My Store', 'Backup')
  })

  it('opens restore dialog when StoreCard restore is emitted', async () => {
    storeListRef.value = [
      { id: 'store-1', name: 'My Store', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()

    const storeCard = wrapper.findComponent({ name: 'StoreCard' })
    await storeCard.vm.$emit('restore', 'store-1')
    await wrapper.vm.$nextTick()

    // Find Dialog components — one should be open (the restore dialog)
    const dialogs = wrapper.findAllComponents({ name: 'Dialog' })
    const openDialog = dialogs.find((d) => d.props('open') === true)
    expect(openDialog).toBeTruthy()
  })

  it('Restore button is disabled before a file is selected in the dialog', async () => {
    storeListRef.value = [
      { id: 'store-1', name: 'My Store', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()

    const storeCard = wrapper.findComponent({ name: 'StoreCard' })
    await storeCard.vm.$emit('restore', 'store-1')
    await wrapper.vm.$nextTick()

    // Find the dialog's Restore AppButton (last one, disabled when no file selected)
    const appButtons = wrapper.findAllComponents({ name: 'AppButton' })
    const restoreBtn = appButtons.findLast((b) => b.text().includes('Restore') && !b.text().includes('Cancel'))
    expect(restoreBtn).toBeTruthy()
    expect(restoreBtn!.props('disabled')).toBe(true)
  })

  it('clicking Restore after file selected opens ConfirmDialog', async () => {
    fileReaderContent = JSON.stringify({ model: null, tuples: [] })
    storeListRef.value = [
      { id: 'store-1', name: 'My Store', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()

    const storeCard = wrapper.findComponent({ name: 'StoreCard' })
    await storeCard.vm.$emit('restore', 'store-1')
    await wrapper.vm.$nextTick()

    // Simulate dropping a file in the restore dropzone
    const dropzone = wrapper.findComponent({ name: 'FileImportDropzone' })
    const dropEvent = new DragEvent('drop', { bubbles: true })
    const file = new File(['{}'], 'backup.json', { type: 'application/json' })
    Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } })
    await dropzone.find('div').element.dispatchEvent(dropEvent)
    await flushPromises()

    // Restore button should now be enabled — click it (last Restore button = dialog's)
    const appButtons = wrapper.findAllComponents({ name: 'AppButton' })
    const restoreBtn = appButtons.findLast((b) => b.text().includes('Restore') && !b.text().includes('Cancel'))
    await restoreBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // ConfirmDialog for overwrite should be open
    const dialogs = wrapper.findAllComponents({ name: 'ConfirmDialog' })
    const confirmDialog = dialogs.find((d) => d.props('title') === 'Overwrite Store')
    expect(confirmDialog).toBeTruthy()
    expect(confirmDialog!.props('open')).toBe(true)
  })

  it('confirming restore calls importToStore with correct storeId and payload', async () => {
    fileReaderContent = JSON.stringify({ model: { schema_version: '1.1', type_definitions: [] }, tuples: [{ user: 'user:alice', relation: 'viewer', object: 'doc:1' }] })
    importToStoreMock.mockResolvedValue({ storeId: 'store-1', storeName: 'My Store', modelWritten: true, tuplesImported: 1 })
    storeListRef.value = [
      { id: 'store-1', name: 'My Store', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ]
    const wrapper = await mountView()

    const storeCard = wrapper.findComponent({ name: 'StoreCard' })
    await storeCard.vm.$emit('restore', 'store-1')
    await wrapper.vm.$nextTick()

    // Drop a file
    const dropzone = wrapper.findComponent({ name: 'FileImportDropzone' })
    const dropEvent = new DragEvent('drop', { bubbles: true })
    const file = new File(['{}'], 'backup.json', { type: 'application/json' })
    Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } })
    await dropzone.find('div').element.dispatchEvent(dropEvent)
    await flushPromises()
    // Directly set restorePayload to work around Vue's ref auto-unwrapping via template ref
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).restorePayload = { model: { schema_version: '1.1', type_definitions: [] }, tuples: [{ user: 'user:alice', relation: 'viewer', object: 'doc:1' }] }

    // Click Restore button (last one = dialog's Restore)
    const appButtons = wrapper.findAllComponents({ name: 'AppButton' })
    const restoreBtn = appButtons.findLast((b) => b.text().includes('Restore') && !b.text().includes('Cancel'))
    await restoreBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    // Confirm the overwrite
    const dialogs = wrapper.findAllComponents({ name: 'ConfirmDialog' })
    const confirmDialog = dialogs.find((d) => d.props('title') === 'Overwrite Store')
    await confirmDialog!.vm.$emit('confirm')
    await flushPromises()

    expect(importToStoreMock).toHaveBeenCalledWith(
      'store-1',
      expect.objectContaining({ tuples: expect.arrayContaining([expect.objectContaining({ user: 'user:alice' })]) }),
    )
  })
})
