import { describe, it, expect } from 'vitest'
import { createSuiteSchema, updateSuiteSchema } from '../suite.js'

describe('suite schema whitespace rejection via .trim()', () => {
  it('createSuiteSchema rejects whitespace-only name', () => {
    expect(createSuiteSchema.safeParse({ name: '   ' }).success).toBe(false)
  })

  it('createSuiteSchema trims and accepts padded name', () => {
    const result = createSuiteSchema.safeParse({ name: '  My Suite  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('My Suite')
  })

  it('updateSuiteSchema rejects whitespace-only name', () => {
    expect(updateSuiteSchema.safeParse({ name: '   ' }).success).toBe(false)
  })

  it('rejects whitespace-only user in nested test case', () => {
    const payload = {
      name: 'Suite',
      definition: {
        groups: [{
          name: 'Group',
          testCases: [{
            user: '   ',
            relation: 'viewer',
            object: 'doc:1',
            expected: true,
          }],
        }],
      },
    }
    expect(createSuiteSchema.safeParse(payload).success).toBe(false)
  })
})
