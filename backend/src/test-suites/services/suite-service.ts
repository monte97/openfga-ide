import * as suiteRepository from '../repositories/suite-repository.js'
import type { Suite, SuiteListItem } from '../types/suite.js'
import type { CreateSuiteBody, UpdateSuiteBody } from '../schemas/suite.js'

export async function listSuites(): Promise<SuiteListItem[]> {
  return suiteRepository.findAll()
}

export async function getSuite(id: string): Promise<Suite> {
  const suite = await suiteRepository.findById(id)
  if (!suite) {
    const err = new Error('Suite not found') as Error & { statusCode: number }
    err.statusCode = 404
    throw err
  }
  return suite
}

export async function createSuite(body: CreateSuiteBody): Promise<Suite> {
  return suiteRepository.create(body)
}

export async function updateSuite(id: string, body: UpdateSuiteBody): Promise<Suite> {
  const hasFields =
    body.name !== undefined ||
    body.description !== undefined ||
    body.tags !== undefined ||
    body.definition !== undefined
  if (!hasFields) {
    const err = new Error('No fields to update') as Error & { statusCode: number }
    err.statusCode = 400
    throw err
  }
  const suite = await suiteRepository.update(id, body)
  if (!suite) {
    const err = new Error('Suite not found') as Error & { statusCode: number }
    err.statusCode = 404
    throw err
  }
  return suite
}

export async function deleteSuite(id: string): Promise<void> {
  const deleted = await suiteRepository.remove(id)
  if (!deleted) {
    const err = new Error('Suite not found') as Error & { statusCode: number }
    err.statusCode = 404
    throw err
  }
}
