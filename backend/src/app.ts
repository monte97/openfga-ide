import express from 'express'
import connectionRoutes from './routes/connection.js'
import storesRoutes from './routes/stores.js'
import modelRouter from './routes/model.js'
import tupleRouter from './routes/tuples.js'
import queryRouter from './routes/queries.js'
import exportRouter from './routes/export.js'
import { importRouter, storeImportRouter } from './routes/import.js'
import { errorHandler } from './middleware/error-handler.js'
import { isAvailable } from './test-suites/db/pool.js'
import suitesRouter from './test-suites/routes/suites.js'
import runsRouter from './test-suites/routes/runs.js'

const app = express()

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use(connectionRoutes)
app.use(storesRoutes)
app.use('/api/stores/:storeId/model', modelRouter)
app.use('/api/stores/:storeId/tuples', tupleRouter)
app.use('/api/stores/:storeId/query', queryRouter)
app.use('/api/stores/:storeId/export', exportRouter)
app.use('/api/import', importRouter)
app.use('/api/stores/:storeId/import', storeImportRouter)

// Test suite routes — available only when PostgreSQL is configured
app.use('/api/suites', (_req, res, next) => {
  if (!isAvailable()) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  next()
})
app.use(suitesRouter)

// Runs routes — same DB availability guard
app.use('/api/suites/:suiteId/run', (_req, res, next) => {
  if (!isAvailable()) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  next()
})
app.use('/api/runs', (_req, res, next) => {
  if (!isAvailable()) {
    res.status(503).json({ error: 'Database not configured' })
    return
  }
  next()
})
app.use(runsRouter)

app.use(errorHandler)

export default app
