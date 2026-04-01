import { logger } from './logger.js'
import { config } from './config.js'
import app from './app.js'
import { validateTransformer } from './startup.js'
import { initPool, closePool } from './test-suites/db/pool.js'
import { runMigrations } from './test-suites/db/migrate.js'

validateTransformer()

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl) {
  try {
    await runMigrations(databaseUrl)
    await initPool()
  } catch {
    logger.warn('Migrations failed — test suite features disabled')
  }
}

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Backend listening')
})

async function shutdown(): Promise<void> {
  server.close()
  await closePool()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
