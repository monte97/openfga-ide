import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SentenceView from './SentenceView.vue'

const wrappers: ReturnType<typeof mount>[] = []

function mountSentence(props: {
  user?: string
  relation?: string
  object?: string
  expected?: boolean
  result?: { passed: boolean; actual: boolean | null; durationMs?: number | null } | null
}) {
  const wrapper = mount(SentenceView, {
    props: {
      user: props.user ?? 'user:alice',
      relation: props.relation ?? 'viewer',
      object: props.object ?? 'document:budget',
      expected: props.expected ?? true,
      result: props.result,
    },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('SentenceView', () => {
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
  })

  describe('without result prop (default behavior)', () => {
    it('shows "Allowed" when expected is true', () => {
      const wrapper = mountSentence({ expected: true })
      expect(wrapper.text()).toContain('Allowed')
    })

    it('shows "Denied" when expected is false', () => {
      const wrapper = mountSentence({ expected: false })
      expect(wrapper.text()).toContain('Denied')
    })

    it('uses default background/border when no result', () => {
      const wrapper = mountSentence({})
      const el = wrapper.find('[aria-label="Sentence preview"]')
      expect(el.classes().join(' ')).toContain('bg-surface-card')
      expect(el.classes().join(' ')).not.toContain('bg-error/5')
    })
  })

  describe('with passing result', () => {
    it('shows "Yes ✓" for expected=true pass', () => {
      const wrapper = mountSentence({ expected: true, result: { passed: true, actual: true } })
      expect(wrapper.text()).toContain('Yes ✓')
    })

    it('shows "No ✓" for expected=false pass', () => {
      const wrapper = mountSentence({ expected: false, result: { passed: true, actual: false } })
      expect(wrapper.text()).toContain('No ✓')
    })

    it('does not apply error background for passing result', () => {
      const wrapper = mountSentence({ result: { passed: true, actual: true } })
      const el = wrapper.find('[aria-label="Sentence preview"]')
      expect(el.classes().join(' ')).not.toContain('bg-error/5')
    })
  })

  describe('with failing result', () => {
    it('shows "Expected: Yes, Got: No" for expected=true actual=false', () => {
      const wrapper = mountSentence({ expected: true, result: { passed: false, actual: false } })
      expect(wrapper.text()).toContain('Expected: Yes, Got:')
      expect(wrapper.text()).toContain('No')
    })

    it('shows "Expected: No, Got: Yes" for expected=false actual=true', () => {
      const wrapper = mountSentence({ expected: false, result: { passed: false, actual: true } })
      expect(wrapper.text()).toContain('Expected: No, Got:')
      expect(wrapper.text()).toContain('Yes')
    })

    it('applies error background class for failing result', () => {
      const wrapper = mountSentence({ result: { passed: false, actual: false } })
      const el = wrapper.find('[aria-label="Sentence preview"]')
      expect(el.classes().join(' ')).toContain('bg-error/5')
    })

    it('shows "Error" when actual is null (check threw an exception)', () => {
      const wrapper = mountSentence({ result: { passed: false, actual: null } })
      expect(wrapper.text()).toContain('Error')
      expect(wrapper.text()).not.toContain('Got:')
    })

    it('"Expected:" label is styled as text-error', () => {
      const wrapper = mountSentence({ expected: true, result: { passed: false, actual: false } })
      const expectedSpan = wrapper.findAll('span').find((s) => s.text().includes('Expected:'))
      expect(expectedSpan?.classes().join(' ')).toContain('text-error')
    })
  })

  describe('duration badge', () => {
    it('shows duration when durationMs is provided', () => {
      const wrapper = mountSentence({ result: { passed: true, actual: true, durationMs: 42 } })
      expect(wrapper.text()).toContain('42ms')
    })

    it('does not show duration when durationMs is null', () => {
      const wrapper = mountSentence({ result: { passed: true, actual: true, durationMs: null } })
      expect(wrapper.text()).not.toContain('ms')
    })

    it('does not show duration when result prop is absent', () => {
      const wrapper = mountSentence({})
      expect(wrapper.text()).not.toContain('ms')
    })
  })
})
