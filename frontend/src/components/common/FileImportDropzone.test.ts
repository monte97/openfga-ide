import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import FileImportDropzone from './FileImportDropzone.vue'

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

const validPayload = {
  model: { schema_version: '1.1', type_definitions: [] },
  tuples: [{ user: 'user:alice', relation: 'viewer', object: 'doc:1' }],
}

function makeFile(content: string, name = 'test.json', type = 'application/json'): File {
  return new File([content], name, { type })
}

async function dropFile(wrapper: ReturnType<typeof mount>, file: File) {
  const dropEvent = new DragEvent('drop', { bubbles: true })
  Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } })
  await wrapper.find('div').element.dispatchEvent(dropEvent)
  await flushPromises()
}

describe('FileImportDropzone.vue', () => {
  beforeEach(() => {
    fileReaderContent = ''
  })

  it('renders default slot content with upload icon and label', () => {
    const wrapper = mount(FileImportDropzone)
    expect(wrapper.text()).toContain('Drop a JSON file here')
  })

  it('applies dragover classes when file is dragged over', async () => {
    const wrapper = mount(FileImportDropzone)
    await wrapper.find('div').trigger('dragover')
    expect(wrapper.find('div').classes()).toContain('border-info')
  })

  it('removes dragover classes on dragleave', async () => {
    const wrapper = mount(FileImportDropzone)
    await wrapper.find('div').trigger('dragover')
    await wrapper.find('div').trigger('dragleave')
    expect(wrapper.find('div').classes()).not.toContain('border-info')
  })

  it('emits validation-error for non-JSON files', async () => {
    const wrapper = mount(FileImportDropzone)
    const file = makeFile('{}', 'data.csv', 'text/csv')
    await dropFile(wrapper, file)
    expect(wrapper.emitted('validation-error')).toBeTruthy()
    expect((wrapper.emitted('validation-error')![0][0] as string)).toContain('JSON')
  })

  it('emits validation-error for invalid JSON content', async () => {
    fileReaderContent = 'not valid json {{{'
    const wrapper = mount(FileImportDropzone)
    const file = makeFile('bad', 'bad.json')
    await dropFile(wrapper, file)
    expect(wrapper.emitted('validation-error')).toBeTruthy()
    expect((wrapper.emitted('validation-error')![0][0] as string)).toContain('Invalid JSON')
  })

  it('emits validation-error when model key is missing', async () => {
    fileReaderContent = JSON.stringify({ tuples: [] })
    const wrapper = mount(FileImportDropzone)
    await dropFile(wrapper, makeFile('{}', 'missing-model.json'))
    expect(wrapper.emitted('validation-error')).toBeTruthy()
    expect((wrapper.emitted('validation-error')![0][0] as string)).toContain('"model"')
  })

  it('emits validation-error when tuples key is missing', async () => {
    fileReaderContent = JSON.stringify({ model: null })
    const wrapper = mount(FileImportDropzone)
    await dropFile(wrapper, makeFile('{}', 'missing-tuples.json'))
    expect(wrapper.emitted('validation-error')).toBeTruthy()
  })

  it('emits file-selected and exposes parsedData for valid JSON', async () => {
    fileReaderContent = JSON.stringify(validPayload)
    const wrapper = mount(FileImportDropzone)
    await dropFile(wrapper, makeFile('{}', 'backup.json'))
    expect(wrapper.emitted('file-selected')).toBeTruthy()
    const vm = wrapper.vm as { parsedData: typeof validPayload | null }
    expect(vm.parsedData?.tuples).toHaveLength(1)
  })

  it('clicking the dropzone triggers the file input click', async () => {
    const wrapper = mount(FileImportDropzone)
    const fileInput = wrapper.find('input[type="file"]')
    const clickSpy = vi.spyOn(fileInput.element, 'click').mockImplementation(() => {})
    await wrapper.find('div').trigger('click')
    expect(clickSpy).toHaveBeenCalled()
  })
})
