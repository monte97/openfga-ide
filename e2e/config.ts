/**
 * Shared E2E configuration.
 *
 * Defaults point to the local dev server (ports 5173 / 3000).
 * Override via environment variables when running against the
 * isolated Docker Compose environment (ports 5174 / 3001).
 */

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
export const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:3000'
