import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SuiteJsonEditor from './SuiteJsonEditor.vue'

// Mock all CodeMirror modules — not testable in jsdom
vi.mock('@codemirror/view', () => ({
  EditorView: class {
    static theme(_spec: unknown) {
      return {}
    }
    static lineWrapping = {}
    static updateListener = { of(_fn: unknown) { return {} } }
    constructor(_config: unknown) {}
    destroy() {}
    dispatch(_tr: unknown) {}
    state = { doc: { length: 0, toString: () => '' } }
  },
}))

vi.mock('@codemirror/state', () => ({
  EditorState: { create: (_config: unknown) => ({}) },
}))

vi.mock('@codemirror/lang-json', () => ({
  json: () => ({}),
  jsonParseLinter: () => () => [],
}))

vi.mock('@codemirror/lint', () => ({
  lintGutter: () => ({}),
  linter: () => ({}),
}))

const wrappers: ReturnType<typeof mount>[] = []

function mountEditor(modelValue: string) {
  const wrapper = mount(SuiteJsonEditor, {
    props: { modelValue },
    attachTo: document.body,
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('SuiteJsonEditor', () => {
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    vi.restoreAllMocks()
  })

  it('renders the editor container', () => {
    const wrapper = mountEditor('{}')
    expect(wrapper.find('[data-testid="json-editor"]').exists()).toBe(true)
  })

  it('shows "Valid JSON" status when modelValue is valid JSON', () => {
    const wrapper = mountEditor('{"groups":[]}')
    expect(wrapper.find('[data-testid="json-valid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="json-error-count"]').exists()).toBe(false)
  })

  it('shows error count when modelValue is invalid JSON', () => {
    const wrapper = mountEditor('{invalid json}')
    expect(wrapper.find('[data-testid="json-error-count"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="json-valid"]').exists()).toBe(false)
  })

  it('emits has-errors: false on mount with valid JSON', () => {
    const wrapper = mountEditor('{"groups":[]}')
    expect(wrapper.emitted('has-errors')).toBeTruthy()
    expect(wrapper.emitted('has-errors')![0]).toEqual([false])
  })

  it('emits has-errors: true on mount with invalid JSON', () => {
    const wrapper = mountEditor('{not valid}')
    expect(wrapper.emitted('has-errors')).toBeTruthy()
    expect(wrapper.emitted('has-errors')![0]).toEqual([true])
  })

  it('shows error for empty string (invalid JSON)', () => {
    const wrapper = mountEditor('')
    expect(wrapper.find('[data-testid="json-error-count"]').exists()).toBe(true)
  })

  it('destroys EditorView on unmount', async () => {
    const { EditorView } = await import('@codemirror/view')
    const destroySpy = vi.spyOn(EditorView.prototype, 'destroy')
    const wrapper = mountEditor('{}')
    wrapper.unmount()
    expect(destroySpy).toHaveBeenCalled()
  })
})
