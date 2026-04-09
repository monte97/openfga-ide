import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ImportPreview from './ImportPreview.vue'
import type { ImportSuitePayload } from '@/schemas/suite'

vi.mock('@/components/test-suites/ImportJsonEditor.vue', () => ({
  default: {
    name: 'ImportJsonEditor',
    props: ['modelValue'],
    emits: ['update:modelValue', 'validation-result'],
    template: '<div data-testid="import-json-editor-stub" />',
  },
}))

const validPayload: ImportSuitePayload = {
  name: 'Auth Suite',
  definition: {
    groups: [
      {
        name: 'Group 1',
        testCases: [
          { user: 'user:alice', relation: 'reader', object: 'doc:1', expected: true },
        ],
      },
    ],
    fixture: { tuples: [{}, {}] },
  },
}

const wrappers: ReturnType<typeof mount>[] = []

function mountPreview() {
  const wrapper = mount(ImportPreview, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}

/** Simulate loading a file via FileReader (class-based mock required for `new FileReader()`) */
function makeFileReaderClass(content: string) {
  return class MockFileReader {
    onload: ((e: ProgressEvent) => void) | null = null
    readAsText() {
      setTimeout(() => {
        this.onload?.({ target: { result: content } } as unknown as ProgressEvent)
      }, 0)
    }
  }
}

async function triggerFileLoad(wrapper: ReturnType<typeof mount>, content: string) {
  vi.stubGlobal('FileReader', makeFileReaderClass(content))
  const fileInput = wrapper.find('[data-testid="import-preview-file-input"]')
  const mockFile = new File([content], 'suite.json', { type: 'application/json' })
  Object.defineProperty(fileInput.element, 'files', { value: [mockFile], configurable: true })
  await fileInput.trigger('change')
  await nextTick()
  // Wait for the setTimeout(0) in the FileReader mock
  await new Promise((r) => setTimeout(r, 10))
  await nextTick()
}

describe('ImportPreview', () => {
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    vi.unstubAllGlobals()
  })

  it('renders dropzone when no file is loaded', () => {
    const wrapper = mountPreview()
    expect(wrapper.find('[data-testid="import-preview-dropzone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="import-json-editor-stub"]').exists()).toBe(false)
  })

  it('shows editor after loading a file via FileReader', async () => {
    const wrapper = mountPreview()
    await triggerFileLoad(wrapper, JSON.stringify(validPayload))
    expect(wrapper.find('[data-testid="import-json-editor-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="import-preview-dropzone"]').exists()).toBe(false)
  })

  describe('validation banner and button state', () => {
    async function mountWithEditor() {
      const wrapper = mountPreview()
      await triggerFileLoad(wrapper, '{}')
      return wrapper
    }

    it('Import button disabled when validation result is not yet valid', async () => {
      const wrapper = await mountWithEditor()
      const importBtn = wrapper.find('[data-testid="import-preview-confirm-btn"]')
      expect(importBtn.exists()).toBe(true)
      expect(importBtn.attributes('disabled')).toBeDefined()
    })

    it('Import button enabled after valid validation-result emitted', async () => {
      const wrapper = await mountWithEditor()
      const editor = wrapper.findComponent({ name: 'ImportJsonEditor' })
      await editor.vm.$emit('validation-result', { valid: true, errors: [], parsed: validPayload })
      await nextTick()

      const importBtn = wrapper.find('[data-testid="import-preview-confirm-btn"]')
      expect(importBtn.attributes('disabled')).toBeUndefined()
    })

    it('shows valid banner with suite name when valid', async () => {
      const wrapper = await mountWithEditor()
      const editor = wrapper.findComponent({ name: 'ImportJsonEditor' })
      await editor.vm.$emit('validation-result', { valid: true, errors: [], parsed: validPayload })
      await nextTick()

      expect(wrapper.find('[data-testid="import-preview-valid-banner"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Auth Suite')
      expect(wrapper.text()).toContain('1 groups')
      expect(wrapper.text()).toContain('1 tests')
      expect(wrapper.text()).toContain('fixture with 2 tuples')
    })

    it('shows error banner with count when Zod errors present', async () => {
      const wrapper = await mountWithEditor()
      const editor = wrapper.findComponent({ name: 'ImportJsonEditor' })
      const fakeErrors = [
        { path: ['name'], message: 'Suite name is required', code: 'too_small', origin: 'string', minimum: 1, inclusive: true },
        { path: ['definition', 'groups', 0, 'name'], message: 'Group name must be non-empty', code: 'too_small', origin: 'string', minimum: 1, inclusive: true },
      ]
      await editor.vm.$emit('validation-result', { valid: false, errors: fakeErrors, parsed: null })
      await nextTick()

      expect(wrapper.find('[data-testid="import-preview-error-banner"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('2 errors found')
      expect(wrapper.find('[data-testid="import-preview-confirm-btn"]').attributes('disabled')).toBeDefined()
    })

    it('Import button becomes enabled when errors are cleared', async () => {
      const wrapper = await mountWithEditor()
      const editor = wrapper.findComponent({ name: 'ImportJsonEditor' })
      const fakeError = [{ path: ['name'], message: 'Suite name is required', code: 'too_small', origin: 'string', minimum: 1, inclusive: true }]

      await editor.vm.$emit('validation-result', { valid: false, errors: fakeError, parsed: null })
      await nextTick()
      expect(wrapper.find('[data-testid="import-preview-confirm-btn"]').attributes('disabled')).toBeDefined()

      await editor.vm.$emit('validation-result', { valid: true, errors: [], parsed: validPayload })
      await nextTick()
      expect(wrapper.find('[data-testid="import-preview-confirm-btn"]').attributes('disabled')).toBeUndefined()
    })

    it('clicking Import emits confirm with parsed payload', async () => {
      const wrapper = await mountWithEditor()
      const editor = wrapper.findComponent({ name: 'ImportJsonEditor' })
      await editor.vm.$emit('validation-result', { valid: true, errors: [], parsed: validPayload })
      await nextTick()

      await wrapper.find('[data-testid="import-preview-confirm-btn"]').trigger('click')
      expect(wrapper.emitted('confirm')).toBeTruthy()
      expect(wrapper.emitted('confirm')![0]).toEqual([validPayload])
    })

    it('clicking Cancel emits cancel', async () => {
      const wrapper = await mountWithEditor()
      await wrapper.find('[data-testid="import-preview-cancel-btn"]').trigger('click')
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('aria-live region present in editor phase', async () => {
      const wrapper = await mountWithEditor()
      expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true)
    })
  })

  it('Cancel button also visible in dropzone phase', () => {
    const wrapper = mountPreview()
    expect(wrapper.find('[data-testid="import-preview-cancel-btn"]').exists()).toBe(true)
  })
})
