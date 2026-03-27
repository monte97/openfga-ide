import { logger } from './logger.js'
import syntaxTransformer from '@openfga/syntax-transformer'
import { createRequire } from 'node:module'

const { transformJSONStringToDSL } = (syntaxTransformer as unknown as {
  transformer: { transformJSONStringToDSL: (json: string) => string }
}).transformer

const _require = createRequire(import.meta.url)

const SMOKE_TEST_MODEL = JSON.stringify({
  schema_version: '1.1',
  type_definitions: [
    { type: 'user', relations: {}, metadata: null },
    { type: 'document', relations: {}, metadata: null },
  ],
})

export function validateTransformer(): void {
  try {
    transformJSONStringToDSL(SMOKE_TEST_MODEL)
    const pkg = _require('@openfga/syntax-transformer/package.json') as { version: string }
    logger.info({ version: pkg.version }, '@openfga/syntax-transformer loaded and validated')
  } catch (err) {
    logger.fatal({ err }, '@openfga/syntax-transformer smoke test failed — cannot start')
    process.exit(1)
  }
}
