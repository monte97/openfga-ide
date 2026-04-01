CREATE TABLE IF NOT EXISTS runs (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id     UUID          NOT NULL REFERENCES suites(id) ON DELETE CASCADE,
  status       VARCHAR(20)   NOT NULL DEFAULT 'pending',
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error        TEXT,
  summary      JSONB,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_suite_id ON runs (suite_id);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs (created_at DESC);
