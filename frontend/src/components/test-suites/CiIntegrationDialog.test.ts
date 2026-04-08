import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CiIntegrationDialog from './CiIntegrationDialog.vue'
import type { SuiteListItem } from '@/stores/suites'

vi.mock('@headlessui/vue', () => ({
  Dialog: { template: '<div v-if="open"><slot /></div>', props: ['open'] },
  DialogPanel: { template: '<div><slot /></div>' },
  DialogTitle: { template: '<h2><slot /></h2>' },
}))

const suite: SuiteListItem = {
  id: 'suite-42',
  name: 'Auth Suite',
  description: null,
  tags: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  lastRun: null,
  groupCount: 0,
  testCount: 0,
}

const wrappers: ReturnType<typeof mount>[] = []

function mountDialog(props: { open: boolean; suite: SuiteListItem | null }) {
  const wrapper = mount(CiIntegrationDialog, { props })
  wrappers.push(wrapper)
  return wrapper
}

describe('CiIntegrationDialog', () => {
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
  })

  it('is hidden when open=false', () => {
    const wrapper = mountDialog({ open: false, suite })
    expect(wrapper.html()).not.toContain('CI Integration')
  })

  it('is visible when open=true with suite prop', () => {
    const wrapper = mountDialog({ open: true, suite })
    expect(wrapper.text()).toContain('CI Integration')
    expect(wrapper.text()).toContain('Auth Suite')
  })

  it('snippet contains suite.id', () => {
    const wrapper = mountDialog({ open: true, suite })
    const pre = wrapper.find('[data-testid="ci-dialog-snippet"]')
    expect(pre.text()).toContain('suite-42')
  })

  it('Copy button calls navigator.clipboard.writeText with snippet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const wrapper = mountDialog({ open: true, suite })
    await wrapper.find('[data-testid="ci-dialog-copy-btn"]').trigger('click')
    expect(writeText).toHaveBeenCalledOnce()
    const calledWith = writeText.mock.calls[0][0] as string
    expect(calledWith).toContain('suite-42')
  })

  it('Close button emits close', async () => {
    const wrapper = mountDialog({ open: true, suite })
    const closeBtn = wrapper.findAll('button').find((b) => b.text() === 'Close')
    await closeBtn!.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
