import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import TestCaseForm from './TestCaseForm.vue'
import type { TestCase } from '@/stores/suites'

vi.mock('@/stores/suiteEditor', () => ({
  useSuiteEditorStore: vi.fn(),
}))

vi.mock('@/composables/useAutocompleteOptions', () => ({
  useAutocompleteOptions: vi.fn(),
}))

vi.stubGlobal('ResizeObserver', class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
})

import { useSuiteEditorStore } from '@/stores/suiteEditor'
import { useAutocompleteOptions } from '@/composables/useAutocompleteOptions'

const sampleTestCase: TestCase = {
  id: 'test-1',
  user: 'user:alice',
  relation: 'viewer',
  object: 'document:budget',
  expected: true,
}

function makeEditorStoreMock(overrides = {}) {
  return {
    metadataExpanded: false,
    toggleMetadata: vi.fn(),
    ...overrides,
  }
}

function makeAutocompleteOptions(overrides = {}) {
  return {
    userOptions: [{ value: 'user:alice', label: 'user:alice' }],
    relationOptions: [{ value: 'viewer', label: 'viewer' }],
    objectOptions: [{ value: 'document:budget', label: 'document:budget' }],
    ...overrides,
  }
}

const wrappers: ReturnType<typeof mount>[] = []

function mountForm(tc: TestCase = sampleTestCase) {
  const wrapper = mount(TestCaseForm, {
    props: { testCase: tc, groupId: 'group-1' },
    attachTo: document.body,
    global: { plugins: [createPinia()] },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('TestCaseForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      makeEditorStoreMock() as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    vi.mocked(useAutocompleteOptions).mockReturnValue(
      makeAutocompleteOptions() as unknown as ReturnType<typeof useAutocompleteOptions>
    )
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
  })

  it('renders with aria-label "Test case form"', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[aria-label="Test case form"]').exists()).toBe(true)
  })

  it('renders User, Relation, Object SearchableSelect fields', () => {
    const wrapper = mountForm()
    expect(wrapper.text()).toContain('User')
    expect(wrapper.text()).toContain('Relation')
    expect(wrapper.text()).toContain('Object')
  })

  it('renders Expected toggle button', () => {
    const wrapper = mountForm()
    const btn = wrapper.find('[aria-label="Toggle expected result"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('Allowed')
  })

  it('toggleExpected emits update with deny when current is allow', async () => {
    const wrapper = mountForm()
    await wrapper.find('[aria-label="Toggle expected result"]').trigger('click')
    const emitted = wrapper.emitted('update')
    expect(emitted).toBeTruthy()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((emitted![0] as any[])[2]).toMatchObject({ expected: false })
  })

  it('toggleExpected emits update with allow when current is deny', async () => {
    const wrapper = mountForm({ ...sampleTestCase, expected: false })
    await wrapper.find('[aria-label="Toggle expected result"]').trigger('click')
    const emitted = wrapper.emitted('update')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((emitted![0] as any[])[2]).toMatchObject({ expected: true })
  })

  it('shows SentenceView preview', () => {
    const wrapper = mountForm()
    expect(wrapper.find('[aria-label="Sentence preview"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('user:alice')
    expect(wrapper.text()).toContain('viewer')
    expect(wrapper.text()).toContain('Allowed')
  })

  it('metadata section is hidden by default', () => {
    const wrapper = mountForm()
    // v-show hides it but element exists
    expect(wrapper.text()).toContain('Show metadata')
  })

  it('calls toggleMetadata when Show metadata button is clicked', async () => {
    const mockStore = makeEditorStoreMock()
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      mockStore as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    const wrapper = mountForm()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('metadata'))
    await btn!.trigger('click')
    expect(mockStore.toggleMetadata).toHaveBeenCalledOnce()
  })

  it('shows metadata fields when metadataExpanded is true', async () => {
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      makeEditorStoreMock({ metadataExpanded: true }) as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    const wrapper = mountForm()
    await nextTick()
    expect(wrapper.text()).toContain('Description')
    expect(wrapper.text()).toContain('Tags')
    expect(wrapper.text()).toContain('Severity')
  })

  it('emits update with user on SearchableSelect update', async () => {
    const wrapper = mountForm()
    const select = wrapper.findAllComponents({ name: 'SearchableSelect' })[0]
    await select.vm.$emit('update:modelValue', 'user:carol')
    await select.vm.$emit('blur')
    const emitted = wrapper.emitted('update')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch = (emitted!.at(-1) as any[])[2]
    expect(patch).toMatchObject({ user: 'user:carol' })
  })

  it('onDescriptionBlur does NOT emit when value is unchanged', async () => {
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      makeEditorStoreMock({ metadataExpanded: true }) as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    const wrapper = mountForm({ ...sampleTestCase, description: 'hello' })
    await nextTick()
    const textarea = wrapper.find('textarea')
    // value already matches prop — blur without changing
    await textarea.trigger('blur')
    expect(wrapper.emitted('update')).toBeFalsy()
  })

  it('onDescriptionBlur emits when value has changed', async () => {
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      makeEditorStoreMock({ metadataExpanded: true }) as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    const wrapper = mountForm({ ...sampleTestCase, description: 'old' })
    await nextTick()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('new description')
    await textarea.trigger('blur')
    const emitted = wrapper.emitted('update')
    expect(emitted).toBeTruthy()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((emitted!.at(-1) as any[])[2]).toMatchObject({ description: 'new description' })
  })

  it('onTagsBlur does NOT emit when tags are unchanged', async () => {
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      makeEditorStoreMock({ metadataExpanded: true }) as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    const wrapper = mountForm({ ...sampleTestCase, tags: ['auth', 'critical'] })
    await nextTick()
    const tagInput = wrapper.find('input[placeholder="e.g. auth, critical"]')
    // localTags is pre-filled with 'auth, critical' — blur without changing
    await tagInput.trigger('blur')
    expect(wrapper.emitted('update')).toBeFalsy()
  })

  it('onTagsBlur emits when tags have changed', async () => {
    vi.mocked(useSuiteEditorStore).mockReturnValue(
      makeEditorStoreMock({ metadataExpanded: true }) as unknown as ReturnType<typeof useSuiteEditorStore>
    )
    const wrapper = mountForm({ ...sampleTestCase, tags: ['auth'] })
    await nextTick()
    const tagInput = wrapper.find('input[placeholder="e.g. auth, critical"]')
    await tagInput.setValue('auth, new-tag')
    await tagInput.trigger('blur')
    const emitted = wrapper.emitted('update')
    expect(emitted).toBeTruthy()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((emitted!.at(-1) as any[])[2]).toMatchObject({ tags: ['auth', 'new-tag'] })
  })

  it('emits update with correct groupId and testCaseId', async () => {
    const wrapper = mountForm()
    await wrapper.find('[aria-label="Toggle expected result"]').trigger('click')
    const emitted = wrapper.emitted('update')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((emitted![0] as any[])[0]).toBe('group-1')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((emitted![0] as any[])[1]).toBe('test-1')
  })
})
