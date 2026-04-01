import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '../../logger.js'

const _require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function runMigrations(databaseUrl: string): Promise<void> {
  // node-pg-migrate is a CJS module; dynamic require via createRequire
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const migrate = _require('node-pg-migrate') as any
  const migrationsDir = path.resolve(__dirname, '../migrations')

  // node-pg-migrate exports { runner } in v7+
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn: (opts: unknown) => Promise<void> = typeof migrate === 'function' ? migrate : (migrate.runner ?? migrate.default)
  try {
    await fn({
      databaseUrl,
      dir: migrationsDir,
      direction: 'up',
      migrationsTable: 'pgmigrations',
      log: (msg: string) => logger.debug({ msg }, 'migration'),
    })
    logger.info('Database migrations applied')
  } catch (err) {
    throw err
  }
}
