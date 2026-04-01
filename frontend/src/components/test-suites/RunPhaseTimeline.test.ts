import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import RunPhaseTimeline from './RunPhaseTimeline.vue'
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
    status: 'running',
    startedAt: '2026-01-01T12:00:00Z',
    completedAt: null,
    error: null,
    summary: null,
    createdAt: '2026-01-01T12:00:00Z',
    results: [],
    ...overrides,
  }
}

function mountTimeline(run: Run | null, totalTestCases = 5) {
  const wrapper = mount(RunPhaseTimeline, {
    props: { run, totalTestCases },
    global: { plugins: [createPinia()] },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('RunPhaseTimeline', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    vi.useRealTimers()
  })

  it('renders 4 phase items', () => {
    const wrapper = mountTimeline(null)
    expect(wrapper.findAll('li')).toHaveLength(4)
  })

  it('renders Provisioning, Loading fixtures, Running checks, Cleanup labels', () => {
    const wrapper = mountTimeline(null)
    const text = wrapper.text()
    expect(text).toContain('Provisioning')
    expect(text).toContain('Loading fixtures')
    expect(text).toContain('Running checks')
    expect(text).toContain('Cleanup')
  })

  describe('when run is null', () => {
    it('all phases have pending aria-label', () => {
      const wrapper = mountTimeline(null)
      const items = wrapper.findAll('li')
      items.forEach((item) => {
        expect(item.attributes('aria-label')).toContain('pending')
      })
    })

    it('shows no spinners', () => {
      const wrapper = mountTimeline(null)
      expect(wrapper.findAll('[data-testid="spinner"]')).toHaveLength(0)
    })
  })

  describe('when status is pending', () => {
    it('all phases are pending', () => {
      const wrapper = mountTimeline(makeRun({ status: 'pending' }))
      const items = wrapper.findAll('li')
      items.forEach((item) => {
        expect(item.attributes('aria-label')).toContain('pending')
      })
    })
  })

  describe('when status is provisioning', () => {
    it('phase 1 (Provisioning) is running', () => {
      const wrapper = mountTimeline(makeRun({ status: 'provisioning' }))
      const items = wrapper.findAll('li')
      expect(items[0].attributes('aria-label')).toContain('running')
    })

    it('phases 2, 3, 4 are pending', () => {
      const wrapper = mountTimeline(makeRun({ status: 'provisioning' }))
      const items = wrapper.findAll('li')
      expect(items[1].attributes('aria-label')).toContain('pending')
      expect(items[2].attributes('aria-label')).toContain('pending')
      expect(items[3].attributes('aria-label')).toContain('pending')
    })

    it('shows spinner for provisioning phase', () => {
      const wrapper = mountTimeline(makeRun({ status: 'provisioning' }))
      expect(wrapper.findAll('[data-testid="spinner"]')).toHaveLength(1)
    })
  })

  describe('when status is running', () => {
    it('phases 1 and 2 are completed', () => {
      const wrapper = mountTimeline(makeRun({ status: 'running' }))
      const items = wrapper.findAll('li')
      expect(items[0].attributes('aria-label')).toContain('completed')
      expect(items[1].attributes('aria-label')).toContain('completed')
    })

    it('phase 3 (Running checks) is running', () => {
      const wrapper = mountTimeline(makeRun({ status: 'running' }))
      const items = wrapper.findAll('li')
      expect(items[2].attributes('aria-label')).toContain('running')
    })

    it('phase 4 (Cleanup) is pending', () => {
      const wrapper = mountTimeline(makeRun({ status: 'running' }))
      const items = wrapper.findAll('li')
      expect(items[3].attributes('aria-label')).toContain('pending')
    })

    it('shows progress counter for Running checks phase', () => {
      const wrapper = mountTimeline(makeRun({ status: 'running', results: [] }), 10)
      const counter = wrapper.find('[data-testid="progress-counter"]')
      expect(counter.exists()).toBe(true)
      expect(counter.text()).toBe('0/10')
    })
  })

  describe('when status is completed', () => {
    it('all 4 phases are completed', () => {
      const wrapper = mountTimeline(
        makeRun({
          status: 'completed',
          completedAt: '2026-01-01T12:00:05Z',
          summary: { total: 5, passed: 5, failed: 0, errored: 0, durationMs: 5000 },
        }),
      )
      const items = wrapper.findAll('li')
      items.forEach((item) => {
        expect(item.attributes('aria-label')).toContain('completed')
      })
    })

    it('shows no spinners', () => {
      const wrapper = mountTimeline(makeRun({ status: 'completed' }))
      expect(wrapper.findAll('[data-testid="spinner"]')).toHaveLength(0)
    })
  })

  describe('when status is failed with no results', () => {
    it('phase 1 is failed, phases 2-4 are pending', () => {
      const wrapper = mountTimeline(makeRun({ status: 'failed', results: [] }))
      const items = wrapper.findAll('li')
      expect(items[0].attributes('aria-label')).toContain('failed')
      expect(items[1].attributes('aria-label')).toContain('pending')
      expect(items[2].attributes('aria-label')).toContain('pending')
      expect(items[3].attributes('aria-label')).toContain('pending')
    })
  })

  describe('when status is failed with results', () => {
    it('phases 1-2 are completed, phase 3 is failed, phase 4 is pending (cleanup did not run)', () => {
      const results = [
        {
          testCase: { user: 'user:alice', relation: 'reader', object: 'doc:1', expected: true },
          actual: false,
          passed: false,
          durationMs: 50,
          error: null,
        },
      ]
      const wrapper = mountTimeline(makeRun({ status: 'failed', results }))
      const items = wrapper.findAll('li')
      expect(items[0].attributes('aria-label')).toContain('completed')
      expect(items[1].attributes('aria-label')).toContain('completed')
      expect(items[2].attributes('aria-label')).toContain('failed')
      expect(items[3].attributes('aria-label')).toContain('pending')
    })
  })

  describe('elapsed timer', () => {
    it('shows elapsed timer for the running phase', () => {
      const wrapper = mountTimeline(makeRun({ status: 'provisioning', startedAt: new Date(Date.now() - 1500).toISOString() }))
      const timer = wrapper.find('[data-testid="elapsed-timer"]')
      expect(timer.exists()).toBe(true)
    })

    it('ticks the now ref every 100ms', async () => {
      mountTimeline(makeRun({ status: 'provisioning', startedAt: new Date(Date.now()).toISOString() }))
      const callsBefore = vi.getTimerCount()
      expect(callsBefore).toBeGreaterThan(0) // interval is registered
    })

    it('stops ticker when run reaches completed state', async () => {
      const wrapper = mountTimeline(makeRun({ status: 'running' }))
      expect(vi.getTimerCount()).toBeGreaterThan(0)
      await wrapper.setProps({
        run: makeRun({ status: 'completed', summary: { total: 5, passed: 5, failed: 0, errored: 0, durationMs: 100 } }),
      })
      await nextTick()
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
