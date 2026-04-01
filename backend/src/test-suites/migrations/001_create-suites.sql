-- Migration: 001_create-suites
-- Creates the suites table for test suite management

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS suites (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255)  NOT NULL,
  description TEXT,
  tags        TEXT[]        NOT NULL DEFAULT '{}',
  definition  JSONB,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suites_updated_at ON suites (updated_at DESC);
