import express from 'express'
import connectionRoutes from './routes/connection.js'
import storesRoutes from './routes/stores.js'
import modelRouter from './routes/model.js'
import { errorHandler } from './middleware/error-handler.js'

const app = express()

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use(connectionRoutes)
app.use(storesRoutes)
app.use('/api/stores/:storeId/model', modelRouter)

app.use(errorHandler)

export default app
