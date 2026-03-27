import 'dotenv/config'

export const config = {
  port: (() => {
    const p = parseInt(process.env.PORT || '3000', 10)
    if (isNaN(p)) throw new Error(`Invalid PORT env var: "${process.env.PORT}"`)
    return p
  })(),
  openfga: {
    url: process.env.OPENFGA_URL || 'http://localhost:8080',
    apiKey: process.env.OPENFGA_API_KEY || '',
    storeId: process.env.OPENFGA_STORE_ID || '',
  },
}
