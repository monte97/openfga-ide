import { describe, it, expect } from 'vitest'
import { highlightDsl } from './useShiki'

describe('useShiki', () => {
  it('returns an HTML string containing <pre> and <code>', async () => {
    const result = await highlightDsl('model\n  schema 1.1')
    expect(result).toContain('<pre')
    expect(result).toContain('<code')
  })

  it('returns consistent output for the same input (singleton)', async () => {
    const first = await highlightDsl('type user')
    const second = await highlightDsl('type user')
    expect(first).toBe(second)
  })

  it('handles empty string input without throwing', async () => {
    const result = await highlightDsl('')
    expect(typeof result).toBe('string')
  })
})
