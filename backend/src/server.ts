import { logger } from './logger.js'
import { config } from './config.js'
import app from './app.js'
import { validateTransformer } from './startup.js'

validateTransformer()

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Backend listening')
})
