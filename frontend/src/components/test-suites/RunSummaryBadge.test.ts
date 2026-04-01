import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import RunSummaryBadge from './RunSummaryBadge.vue'
import type { Run } from '@/stores/runs'

vi.mock('@/components/common/LoadingSpinner.vue', () => ({
  default: {
    name: 'LoadingSpinner',
    props: ['size'],
    template: '<span data-testid="spinner" />',
  },
}))

const wrappers: ReturnType<typeof mount>[] = []

function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    id: 'run-1',
    suiteId: 'suite-1',
    status: 'completed',
    startedAt: '2026-01-01T12:00:00Z',
    completedAt: '2026-01-01T12:00:05Z',
    error: null,
    summary: { total: 10, passed: 8, failed: 2, errored: 0, durationMs: 5000 },
    createdAt: '2026-01-01T12:00:00Z',
    results: [],
    ...overrides,
  }
}

function mountBadge(run: Run | null) {
  const wrapper = mount(RunSummaryBadge, {
    props: { run },
    global: { plugins: [createPinia()] },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('RunSummaryBadge', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
  })

  describe('when run is null', () => {
    it('shows "Never run" label', () => {
      const wrapper = mountBadge(null)
      expect(wrapper.text()).toContain('Never run')
    })

    it('has aria-label "Never run"', () => {
      const wrapper = mountBadge(null)
      expect(wrapper.find('[data-testid="run-summary-badge"]').attributes('aria-label')).toBe('Never run')
    })

    it('shows no spinner', () => {
      const wrapper = mountBadge(null)
      expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(false)
    })
  })

  describe('when status is pending', () => {
    it('shows "Running…" label', () => {
      const wrapper = mountBadge(makeRun({ status: 'pending', summary: null }))
      expect(wrapper.text()).toContain('Running…')
    })

    it('has aria-label "Run in progress"', () => {
      const wrapper = mountBadge(makeRun({ status: 'pending', summary: null }))
      expect(wrapper.find('[data-testid="run-summary-badge"]').attributes('aria-label')).toBe('Run in progress')
    })

    it('shows spinner', () => {
      const wrapper = mountBadge(makeRun({ status: 'pending', summary: null }))
      expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true)
    })
  })

  describe('when status is provisioning', () => {
    it('shows "Running…" label with spinner', () => {
      const wrapper = mountBadge(makeRun({ status: 'provisioning', summary: null }))
      expect(wrapper.text()).toContain('Running…')
      expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true)
    })
  })

  describe('when status is running', () => {
    it('shows "Running…" label with spinner', () => {
      const wrapper = mountBadge(makeRun({ status: 'running', summary: null }))
      expect(wrapper.text()).toContain('Running…')
      expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true)
    })
  })

  describe('when status is completed', () => {
    it('shows passed/total label', () => {
      const wrapper = mountBadge(makeRun({ status: 'completed' }))
      expect(wrapper.text()).toContain('8/10 passed')
    })

    it('has correct aria-label', () => {
      const wrapper = mountBadge(makeRun({ status: 'completed' }))
      expect(wrapper.find('[data-testid="run-summary-badge"]').attributes('aria-label')).toBe(
        '8 of 10 tests passed',
      )
    })

    it('shows no spinner', () => {
      const wrapper = mountBadge(makeRun({ status: 'completed' }))
      expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(false)
    })
  })

  describe('when status is failed', () => {
    it('shows passed/total label from summary', () => {
      const wrapper = mountBadge(makeRun({ status: 'failed' }))
      expect(wrapper.text()).toContain('8/10 passed')
    })

    it('shows "Failed" when no summary', () => {
      const wrapper = mountBadge(makeRun({ status: 'failed', summary: null }))
      expect(wrapper.text()).toContain('Failed')
    })

    it('has aria-label "Run failed" when no summary', () => {
      const wrapper = mountBadge(makeRun({ status: 'failed', summary: null }))
      expect(wrapper.find('[data-testid="run-summary-badge"]').attributes('aria-label')).toBe('Run failed')
    })

    it('shows no spinner', () => {
      const wrapper = mountBadge(makeRun({ status: 'failed' }))
      expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(false)
    })
  })
})
