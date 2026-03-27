import { openfgaClient } from './openfga-client.js'
import { logger } from '../logger.js'
import type { AuthorizationModel, ListAuthorizationModelsResponse, ModelResponse } from '../types/openfga.js'

// CJS interop: @openfga/syntax-transformer exports nested namespaces
import syntaxTransformer from '@openfga/syntax-transformer'
const { transformJSONStringToDSL } = (syntaxTransformer as unknown as {
  transformer: { transformJSONStringToDSL: (json: string) => string }
}).transformer

export async function getModel(storeId: string): Promise<ModelResponse> {
  const data = await openfgaClient.get(
    `/stores/${storeId}/authorization-models?page_size=1`,
  ) as ListAuthorizationModelsResponse

  const models = data.authorization_models ?? []
  if (models.length === 0) {
    return { json: null, dsl: null, authorizationModelId: null }
  }

  const model: AuthorizationModel = models[0]

  let dsl: string | null = null
  try {
    dsl = transformJSONStringToDSL(JSON.stringify(model))
  } catch (err) {
    logger.warn({ err, modelId: model.id }, 'DSL conversion failed')
  }

  return { json: model, dsl, authorizationModelId: model.id }
}
