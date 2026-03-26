import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TypeBadge from '../TypeBadge.vue'

describe('TypeBadge', () => {
  it('renders the typeName', () => {
    const wrapper = mount(TypeBadge, { props: { typeName: 'user' } })
    expect(wrapper.text()).toBe('user')
  })

  it('same typeName always produces the same color class', () => {
    const wrapper1 = mount(TypeBadge, { props: { typeName: 'document' } })
    const wrapper2 = mount(TypeBadge, { props: { typeName: 'document' } })
    expect(wrapper1.classes().join('')).toBe(wrapper2.classes().join(''))
  })

  it('different typeNames can produce different color classes', () => {
    // 'user' charcode sum = 117+115+101+114 = 447 → 447%8 = 7 → node-7
    // 'group' charcode sum = 103+114+111+117+112 = 557 → 557%8 = 5 → node-5
    const wrapper1 = mount(TypeBadge, { props: { typeName: 'user' } })
    const wrapper2 = mount(TypeBadge, { props: { typeName: 'group' } })
    const classes1 = wrapper1.classes().filter((c) => c.startsWith('bg-node-'))
    const classes2 = wrapper2.classes().filter((c) => c.startsWith('bg-node-'))
    expect(classes1[0]).not.toBe(classes2[0])
  })

  it('hash is deterministic (pure, no randomness)', () => {
    const results = new Set<string>()
    for (let i = 0; i < 5; i++) {
      const wrapper = mount(TypeBadge, { props: { typeName: 'document' } })
      results.add(wrapper.classes().filter((c) => c.startsWith('bg-node-'))[0])
    }
    expect(results.size).toBe(1)
  })

  it('applies font-mono class', () => {
    const wrapper = mount(TypeBadge, { props: { typeName: 'user' } })
    expect(wrapper.classes()).toContain('font-mono')
  })
})
