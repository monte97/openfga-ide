import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import SuiteCard from './SuiteCard.vue'
import type { SuiteListItem } from '@/stores/suites'

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div/>' } }],
})

const suite: SuiteListItem = {
  id: 'suite-1',
  name: 'My Auth Suite',
  description: 'Verifies auth policies',
  tags: ['auth', 'critical'],
  createdAt: '2026-03-31T10:00:00Z',
  updatedAt: '2026-03-31T10:00:00Z',
  lastRun: null,
}

const wrappers: ReturnType<typeof mount>[] = []

function mountCard(props = { suite }) {
  const wrapper = mount(SuiteCard, {
    props,
    attachTo: document.body,
    global: { plugins: [createPinia(), router] },
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('SuiteCard', () => {
  beforeEach(() => setActivePinia(createPinia()))

  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
  })

  it('renders suite name and description', () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('My Auth Suite')
    expect(wrapper.text()).toContain('Verifies auth policies')
  })

  it('renders tags', () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('auth')
    expect(wrapper.text()).toContain('critical')
  })

  it('renders Never run badge', () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('Never run')
  })

  it('emits open event when card is clicked', async () => {
    const wrapper = mountCard()
    await wrapper.find('[role="article"]').trigger('click')
    expect(wrapper.emitted('open')).toBeTruthy()
    expect(wrapper.emitted('open')![0]).toEqual([suite])
  })

  it('does not emit open when three-dot button is clicked', async () => {
    const wrapper = mountCard()
    await wrapper.find('[aria-label^="Menu for suite"]').trigger('click')
    expect(wrapper.emitted('open')).toBeFalsy()
  })

  it('shows Delete option when three-dot menu is opened', async () => {
    const wrapper = mountCard()
    expect(wrapper.find('[role="menu"]').isVisible()).toBe(false)
    await wrapper.find('[aria-expanded]').trigger('click')
    expect(wrapper.find('[role="menu"]').isVisible()).toBe(true)
    const items = wrapper.findAll('[role="menuitem"]')
    expect(items[items.length - 1].text()).toBe('Delete')
  })

  it('emits delete event when Delete is clicked in menu', async () => {
    const wrapper = mountCard()
    await wrapper.find('[aria-expanded]').trigger('click')
    const items = wrapper.findAll('[role="menuitem"]')
    await items[items.length - 1].trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual([suite])
  })

  it('closes menu after Delete is clicked', async () => {
    const wrapper = mountCard()
    await wrapper.find('[aria-expanded]').trigger('click')
    const items = wrapper.findAll('[role="menuitem"]')
    await items[items.length - 1].trigger('click')
    expect(wrapper.find('[role="menu"]').isVisible()).toBe(false)
  })

  describe('context menu actions', () => {
    it('shows Export item in menu', async () => {
      const wrapper = mountCard()
      await wrapper.find('[aria-expanded]').trigger('click')
      expect(wrapper.find('[data-testid="suite-menu-export"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="suite-menu-export"]').text()).toBe('Export')
    })

    it('emits export event with suite when Export clicked', async () => {
      const wrapper = mountCard()
      await wrapper.find('[aria-expanded]').trigger('click')
      await wrapper.find('[data-testid="suite-menu-export"]').trigger('click')
      expect(wrapper.emitted('export')).toBeTruthy()
      expect(wrapper.emitted('export')![0]).toEqual([suite])
    })

    it('shows CI Integration item in menu', async () => {
      const wrapper = mountCard()
      await wrapper.find('[aria-expanded]').trigger('click')
      expect(wrapper.find('[data-testid="suite-menu-ci"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="suite-menu-ci"]').text()).toBe('CI Integration')
    })

    it('emits ci-integration event with suite when CI Integration clicked', async () => {
      const wrapper = mountCard()
      await wrapper.find('[aria-expanded]').trigger('click')
      await wrapper.find('[data-testid="suite-menu-ci"]').trigger('click')
      expect(wrapper.emitted('ci-integration')).toBeTruthy()
      expect(wrapper.emitted('ci-integration')![0]).toEqual([suite])
    })

    it('closes menu after clicking Export', async () => {
      const wrapper = mountCard()
      await wrapper.find('[aria-expanded]').trigger('click')
      await wrapper.find('[data-testid="suite-menu-export"]').trigger('click')
      expect(wrapper.find('[role="menu"]').isVisible()).toBe(false)
    })
  })

  it('closes menu when clicking outside [data-suite-menu]', async () => {
    const wrapper = mountCard()
    await wrapper.find('[aria-expanded]').trigger('click')
    expect(wrapper.find('[role="menu"]').isVisible()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await nextTick()

    expect(wrapper.find('[role="menu"]').isVisible()).toBe(false)
  })

  it('renders suite without description gracefully', () => {
    const noDesc = { ...suite, description: null }
    const wrapper = mountCard({ suite: noDesc })
    expect(wrapper.text()).toContain('My Auth Suite')
    expect(wrapper.text()).not.toContain('Verifies auth policies')
  })

  it('renders suite without tags gracefully', () => {
    const noTags = { ...suite, tags: [] }
    const wrapper = mountCard({ suite: noTags })
    expect(wrapper.find('.flex.flex-wrap').exists()).toBe(false)
  })

  describe('lastRun badge', () => {
    it('shows "Never run" badge when lastRun is null', () => {
      const wrapper = mountCard()
      const badge = wrapper.find('[data-testid="suite-card-last-run-badge"]')
      expect(badge.text()).toBe('Never run')
    })

    it('shows green "3/3 passed" badge when all tests pass', () => {
      const withRun = { ...suite, lastRun: { status: 'completed', summary: { total: 3, passed: 3, failed: 0, errored: 0, durationMs: 100 } } }
      const wrapper = mountCard({ suite: withRun })
      const badge = wrapper.find('[data-testid="suite-card-last-run-badge"]')
      expect(badge.text()).toBe('3/3 passed')
      expect(badge.classes().join(' ')).toContain('text-success')
    })

    it('shows red "1/3 passed" badge when failures exist', () => {
      const withFails = { ...suite, lastRun: { status: 'failed', summary: { total: 3, passed: 1, failed: 2, errored: 0, durationMs: 100 } } }
      const wrapper = mountCard({ suite: withFails })
      const badge = wrapper.find('[data-testid="suite-card-last-run-badge"]')
      expect(badge.text()).toBe('1/3 passed')
      expect(badge.classes().join(' ')).toContain('text-error')
    })

    it('shows "Failed" badge when lastRun.status=failed with no summary', () => {
      const withFailed = { ...suite, lastRun: { status: 'failed', summary: null } }
      const wrapper = mountCard({ suite: withFailed })
      const badge = wrapper.find('[data-testid="suite-card-last-run-badge"]')
      expect(badge.text()).toBe('Failed')
    })

    it('applies red border accent when failures exist', () => {
      const withFails = { ...suite, lastRun: { status: 'failed', summary: { total: 3, passed: 1, failed: 2, errored: 0, durationMs: 100 } } }
      const wrapper = mountCard({ suite: withFails })
      const card = wrapper.find('[role="article"]')
      expect(card.classes().join(' ')).toContain('border-error/40')
    })

    it('applies red border when lastRun.status=failed with no summary (provisioning error)', () => {
      const withFailed = { ...suite, lastRun: { status: 'failed', summary: null } }
      const wrapper = mountCard({ suite: withFailed })
      const card = wrapper.find('[role="article"]')
      expect(card.classes().join(' ')).toContain('border-error/40')
    })

    it('does not apply red border when all tests pass', () => {
      const withPassed = { ...suite, lastRun: { status: 'completed', summary: { total: 3, passed: 3, failed: 0, errored: 0, durationMs: 100 } } }
      const wrapper = mountCard({ suite: withPassed })
      const card = wrapper.find('[role="article"]')
      expect(card.classes().join(' ')).not.toContain('border-error/40')
    })

    it('shows "Running..." badge for in-progress run', () => {
      const running = { ...suite, lastRun: { status: 'running', summary: null } }
      const wrapper = mountCard({ suite: running })
      const badge = wrapper.find('[data-testid="suite-card-last-run-badge"]')
      expect(badge.text()).toBe('Running…')
    })

    it('shows red badge when errored>0 and failed=0', () => {
      const errored = { ...suite, lastRun: { status: 'failed', summary: { total: 3, passed: 2, failed: 0, errored: 1, durationMs: 100 } } }
      const wrapper = mountCard({ suite: errored })
      const badge = wrapper.find('[data-testid="suite-card-last-run-badge"]')
      expect(badge.classes().join(' ')).toContain('text-error')
    })
  })
})
