import pg from 'pg'
import { logger } from '../../logger.js'

const { Pool } = pg

let _pool: InstanceType<typeof Pool> | null = null
let _available = false
let _initPromise: Promise<void> | null = null

export function getPool(): InstanceType<typeof Pool> {
  if (!_pool) {
    throw new Error('Database pool not initialized')
  }
  return _pool
}

export function isAvailable(): boolean {
  return _available
}

export function initPool(): Promise<void> {
  if (_initPromise !== null) return _initPromise
  _initPromise = (async () => {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      logger.info('DATABASE_URL not set — test suite features disabled')
      return
    }

    _pool = new Pool({ connectionString: databaseUrl })

    try {
      const client = await _pool.connect()
      client.release()
      _available = true
      logger.info('PostgreSQL pool connected')
    } catch (err) {
      logger.warn({ err }, 'PostgreSQL unavailable — test suite features disabled')
      await _pool.end().catch(() => undefined)
      _pool = null
      _available = false
    }
  })()
  return _initPromise
}

export async function closePool(): Promise<void> {
  if (_pool) {
    _available = false // mark unavailable immediately so in-flight requests get 503 on next check
    await _pool.end()
    _pool = null
    _initPromise = null // allow re-init if pool is restarted
  }
}
