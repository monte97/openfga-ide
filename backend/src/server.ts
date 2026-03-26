import { config } from './config.js'
import app from './app.js'

app.listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`)
})
