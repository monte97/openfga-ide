import * as suiteService from './suite-service.js'
import * as runRepository from '../repositories/run-repository.js'
import { executeRun } from './execution-engine.js'
import type { Run } from '../types/run.js'

export async function triggerRun(suiteId: string, testCaseId?: string): Promise<{ runId: string }> {
  const suite = await suiteService.getSuite(suiteId)

  if (!suite.definition?.fixture) {
    const err = new Error('Suite has no fixture') as Error & { statusCode: number }
    err.statusCode = 400
    throw err
  }

  const testCaseCount = suite.definition.groups.reduce((sum, g) => sum + g.testCases.length, 0)
  if (testCaseCount === 0) {
    const err = new Error('Suite has no test cases') as Error & { statusCode: number }
    err.statusCode = 400
    throw err
  }

  if (testCaseId) {
    const exists = suite.definition.groups.some((g) => g.testCases.some((tc) => tc.id === testCaseId))
    if (!exists) {
      const err = new Error('Test case not found') as Error & { statusCode: number }
      err.statusCode = 404
      throw err
    }
  }

  const run = await runRepository.createRun(suiteId)

  // Fire-and-forget — do NOT await (AR5)
  executeRun(run.id, suite, testCaseId).catch(() => {
    // Errors are handled inside executeRun; this catch prevents unhandled rejection warnings
  })

  return { runId: run.id }
}

export async function getRun(runId: string): Promise<Run> {
  const run = await runRepository.findById(runId)
  if (!run) {
    const err = new Error('Run not found') as Error & { statusCode: number }
    err.statusCode = 404
    throw err
  }
  return run
}
