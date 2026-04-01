import { getPool } from '../db/pool.js'
import type { Run, RunResult, RunStatus, RunSummary } from '../types/run.js'

function mapRowToRun(row: Record<string, unknown>, results: RunResult[] = []): Run {
  return {
    id: row.id as string,
    suiteId: row.suite_id as string,
    status: row.status as RunStatus,
    startedAt: row.started_at ? (row.started_at as Date).toISOString() : null,
    completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : null,
    error: (row.error as string | null) ?? null,
    summary: (row.summary as RunSummary | null) ?? null,
    createdAt: (row.created_at as Date).toISOString(),
    results,
  }
}

function mapRowToRunResult(row: Record<string, unknown>): RunResult {
  return {
    testCase: row.test_case as RunResult['testCase'],
    actual: row.actual as boolean | null,
    passed: row.passed as boolean,
    durationMs: (row.duration_ms as number | null) ?? 0,
    error: (row.error as string | null) ?? null,
  }
}

export async function createRun(suiteId: string): Promise<{ id: string; status: RunStatus }> {
  const pool = getPool()
  const { rows } = await pool.query(
    `INSERT INTO runs (suite_id) VALUES ($1) RETURNING id, status`,
    [suiteId],
  )
  return { id: rows[0].id as string, status: rows[0].status as RunStatus }
}

export async function updateStatus(runId: string, status: RunStatus, error?: string): Promise<void> {
  const pool = getPool()

  if (status === 'provisioning') {
    await pool.query(
      `UPDATE runs SET status = $1, started_at = NOW(), error = $3 WHERE id = $2`,
      [status, runId, error ?? null],
    )
  } else if (status === 'completed' || status === 'failed') {
    await pool.query(
      `UPDATE runs SET status = $1, completed_at = NOW(), error = $3 WHERE id = $2`,
      [status, runId, error ?? null],
    )
  } else {
    await pool.query(
      `UPDATE runs SET status = $1, error = $3 WHERE id = $2`,
      [status, runId, error ?? null],
    )
  }
}

export async function saveSummary(runId: string, summary: RunSummary): Promise<void> {
  const pool = getPool()
  await pool.query('UPDATE runs SET summary = $1 WHERE id = $2', [JSON.stringify(summary), runId])
}

export async function saveResults(runId: string, results: RunResult[]): Promise<void> {
  if (results.length === 0) return
  const pool = getPool()

  const values: unknown[] = []
  const placeholders: string[] = []

  results.forEach((r, i) => {
    const o = i * 6
    placeholders.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6})`)
    values.push(runId, JSON.stringify(r.testCase), r.actual, r.passed, r.durationMs, r.error)
  })

  await pool.query(
    `INSERT INTO run_results (run_id, test_case, actual, passed, duration_ms, error) VALUES ${placeholders.join(', ')}`,
    values,
  )
}

export async function findById(runId: string): Promise<Run | null> {
  const pool = getPool()

  const { rows: runRows } = await pool.query(
    `SELECT id, suite_id, status, started_at, completed_at, error, summary, created_at
     FROM runs WHERE id = $1`,
    [runId],
  )
  if (runRows.length === 0) return null

  const { rows: resultRows } = await pool.query(
    `SELECT test_case, actual, passed, duration_ms, error
     FROM run_results WHERE run_id = $1`,
    [runId],
  )

  return mapRowToRun(runRows[0], resultRows.map(mapRowToRunResult))
}
