import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockPoolConnect, mockPoolEnd, mockClientRelease, MockPool } = vi.hoisted(() => {
  const mockPoolConnect = vi.fn()
  const mockPoolEnd = vi.fn()
  const mockClientRelease = vi.fn()
  const MockPool = vi.fn()
  return { mockPoolConnect, mockPoolEnd, mockClientRelease, MockPool }
})

vi.mock('pg', () => {
  return { default: { Pool: MockPool } }
})

vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}))

const { initPool, isAvailable, closePool } = await import('./pool.js')

describe('pool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPoolEnd.mockResolvedValue(undefined)
    mockClientRelease.mockReturnValue(undefined)
    // Vitest 4.x requires class-based mockImplementation for `new` usage
    MockPool.mockImplementation(class {
      connect = mockPoolConnect
      end = mockPoolEnd
    })
  })

  afterEach(async () => {
    await closePool()
  })

  it('isAvailable() returns false before initPool()', () => {
    expect(isAvailable()).toBe(false)
  })

  it('initPool() does nothing when DATABASE_URL is not set', async () => {
    const savedUrl = process.env.DATABASE_URL
    delete process.env.DATABASE_URL

    await initPool()
    expect(isAvailable()).toBe(false)
    expect(MockPool).not.toHaveBeenCalled()

    if (savedUrl !== undefined) process.env.DATABASE_URL = savedUrl
  })

  it('initPool() sets isAvailable to true when connection succeeds', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test'
    mockPoolConnect.mockResolvedValue({ release: mockClientRelease })

    await initPool()

    expect(isAvailable()).toBe(true)
    expect(mockClientRelease).toHaveBeenCalled()

    delete process.env.DATABASE_URL
  })

  it('initPool() leaves isAvailable false when connection fails', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test'
    mockPoolConnect.mockRejectedValue(new Error('Connection refused'))

    await initPool()

    expect(isAvailable()).toBe(false)
    expect(mockPoolEnd).toHaveBeenCalled()

    delete process.env.DATABASE_URL
  })
})
