CREATE TABLE IF NOT EXISTS run_results (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       UUID          NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  test_case    JSONB         NOT NULL,
  actual       BOOLEAN,
  passed       BOOLEAN       NOT NULL,
  duration_ms  INTEGER,
  error        TEXT
);

CREATE INDEX IF NOT EXISTS idx_run_results_run_id ON run_results (run_id);
