import { getPool } from '../db/pool.js'
import type { Suite, SuiteListItem, CreateSuiteInput, UpdateSuiteInput } from '../types/suite.js'
import type { RunSummary } from '../types/run.js'

function mapRowToSuiteListItem(row: Record<string, unknown>): SuiteListItem {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    lastRun: row.last_run_status
      ? { status: row.last_run_status as string, summary: (row.last_run_summary as RunSummary | null) ?? null }
      : null,
    groupCount: (row.group_count as number) ?? 0,
    testCount: (row.test_count as number) ?? 0,
  }
}

function mapRowToSuite(row: Record<string, unknown>): Suite {
  return {
    ...mapRowToSuiteListItem(row),
    definition: row.definition as Suite['definition'],
  }
}

export async function findAll(): Promise<SuiteListItem[]> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT
       s.id, s.name, s.description, s.tags, s.created_at, s.updated_at,
       lr.status AS last_run_status,
       lr.summary AS last_run_summary,
       jsonb_array_length(COALESCE(s.definition->'groups', '[]'::jsonb)) AS group_count,
       (
         SELECT COALESCE(SUM(jsonb_array_length(g->'testCases')), 0)
         FROM jsonb_array_elements(COALESCE(s.definition->'groups', '[]'::jsonb)) AS g
       ) AS test_count
     FROM suites s
     LEFT JOIN LATERAL (
       SELECT status, summary
       FROM runs
       WHERE suite_id = s.id
       ORDER BY created_at DESC
       LIMIT 1
     ) lr ON true
     ORDER BY s.updated_at DESC`,
  )
  return rows.map(mapRowToSuiteListItem)
}

export async function findById(id: string): Promise<Suite | null> {
  const pool = getPool()
  const { rows } = await pool.query(
    'SELECT id, name, description, tags, definition, created_at, updated_at FROM suites WHERE id = $1',
    [id],
  )
  if (rows.length === 0) return null
  return mapRowToSuite(rows[0])
}

export async function create(input: CreateSuiteInput): Promise<Suite> {
  const pool = getPool()
  const { rows } = await pool.query(
    `INSERT INTO suites (name, description, tags, definition)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, description, tags, definition, created_at, updated_at`,
    [
      input.name,
      input.description ?? null,
      input.tags ?? [],
      input.definition ? JSON.stringify(input.definition) : null,
    ],
  )
  return mapRowToSuite(rows[0])
}

export async function update(id: string, input: UpdateSuiteInput): Promise<Suite | null> {
  const pool = getPool()

  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (input.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`)
    values.push(input.name)
  }
  if (input.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`)
    values.push(input.description)
  }
  if (input.tags !== undefined) {
    setClauses.push(`tags = $${paramIndex++}`)
    values.push(input.tags)
  }
  if (input.definition !== undefined) {
    setClauses.push(`definition = $${paramIndex++}`)
    values.push(JSON.stringify(input.definition))
  }

  if (setClauses.length === 0) {
    return findById(id)
  }

  setClauses.push(`updated_at = NOW()`)
  values.push(id)

  const { rows } = await pool.query(
    `UPDATE suites SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, name, description, tags, definition, created_at, updated_at`,
    values,
  )
  if (rows.length === 0) return null
  return mapRowToSuite(rows[0])
}

export async function remove(id: string): Promise<boolean> {
  const pool = getPool()
  const { rowCount } = await pool.query('DELETE FROM suites WHERE id = $1', [id])
  return (rowCount ?? 0) > 0
}
