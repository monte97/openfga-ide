import { openfgaClient } from '../../services/openfga-client.js'
import * as runRepository from '../repositories/run-repository.js'
import { logger } from '../../logger.js'
import type { Suite } from '../types/suite.js'
import type { RunResult } from '../types/run.js'

const TUPLE_BATCH_SIZE = 100

export async function executeRun(runId: string, suite: Suite, testCaseId?: string): Promise<void> {
  let ephemeralStoreId: string | null = null
  try {
    // Phase 1: Provisioning
    await runRepository.updateStatus(runId, 'provisioning')
    const fixture = suite.definition!.fixture!

    const store = (await openfgaClient.post('/stores', { name: `test-run-${runId}` })) as { id: string }
    ephemeralStoreId = store.id

    if (fixture.model) {
      await openfgaClient.post(`/stores/${ephemeralStoreId}/authorization-models`, fixture.model)
    }

    if (fixture.tuples && fixture.tuples.length > 0) {
      for (let i = 0; i < fixture.tuples.length; i += TUPLE_BATCH_SIZE) {
        const batch = fixture.tuples.slice(i, i + TUPLE_BATCH_SIZE)
        await openfgaClient.post(`/stores/${ephemeralStoreId}/write`, {
          writes: { tuple_keys: batch },
        })
      }
    }

    // Phase 2: Running checks
    await runRepository.updateStatus(runId, 'running')
    const startedAt = Date.now()
    const results: RunResult[] = []

    const groups = testCaseId
      ? suite.definition!.groups
          .map((g) => ({ ...g, testCases: g.testCases.filter((tc) => tc.id === testCaseId) }))
          .filter((g) => g.testCases.length > 0)
      : suite.definition!.groups

    const allTestCases = groups.flatMap((g) => g.testCases)

    for (const tc of allTestCases) {
      const tcStart = Date.now()
      try {
        const checkResult = (await openfgaClient.post(`/stores/${ephemeralStoreId}/check`, {
          tuple_key: { user: tc.user, relation: tc.relation, object: tc.object },
        })) as { allowed: boolean }

        results.push({
          testCase: { user: tc.user, relation: tc.relation, object: tc.object, expected: tc.expected },
          actual: checkResult.allowed,
          passed: checkResult.allowed === tc.expected,
          durationMs: Date.now() - tcStart,
          error: null,
        })
      } catch (err) {
        results.push({
          testCase: { user: tc.user, relation: tc.relation, object: tc.object, expected: tc.expected },
          actual: null,
          passed: false,
          durationMs: Date.now() - tcStart,
          error: (err as Error).message,
        })
      }
    }

    // Phase 3: Persist results BEFORE cleanup (NFR17)
    await runRepository.saveResults(runId, results)

    const summary = {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed && r.actual !== null).length,
      errored: results.filter((r) => r.error !== null).length,
      durationMs: Date.now() - startedAt,
    }
    await runRepository.saveSummary(runId, summary)

    const hasFailures = summary.failed > 0 || summary.errored > 0
    await runRepository.updateStatus(runId, hasFailures ? 'failed' : 'completed')
  } catch (err) {
    await runRepository
      .updateStatus(runId, 'failed', (err as Error).message)
      .catch((e) => logger.error({ err: e }, 'Failed to update run status after error'))
  } finally {
    // Phase 4: Cleanup — guaranteed even on errors (NFR15)
    if (ephemeralStoreId) {
      try {
        await openfgaClient.delete(`/stores/${ephemeralStoreId}`)
      } catch (cleanupErr) {
        logger.error({ err: cleanupErr, runId, ephemeralStoreId }, 'Failed to cleanup ephemeral store')
      }
    }
  }
}
