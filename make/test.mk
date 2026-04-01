# ── Test — unit ────────────────────────────────────────────────────────────────

test: test-backend test-frontend

test-backend:
	npm --prefix backend test

test-frontend:
	npm --prefix frontend run test:unit -- --run

# ── Test — E2E ────────────────────────────────────────────────────────────────

# Offset ports so E2E and dev can run side-by-side
E2E_BASE_URL    ?= http://localhost:5174
E2E_BACKEND_URL ?= http://localhost:3010

e2e-up:
	docker compose -f docker-compose.e2e.yml up -d

e2e-down:
	docker compose -f docker-compose.e2e.yml down -v

test-smoke:
	npx playwright test e2e/smoke/

test-functional:
	npx playwright test e2e/functional/

test-e2e: e2e-up
	E2E_BASE_URL=$(E2E_BASE_URL) E2E_BACKEND_URL=$(E2E_BACKEND_URL) \
	npx playwright test; EXIT=$$?; $(MAKE) e2e-down; exit $$EXIT

test-e2e-list:
	npx playwright test --list

test-e2e-headed:
	E2E_BASE_URL=$(E2E_BASE_URL) E2E_BACKEND_URL=$(E2E_BACKEND_URL) \
	npx playwright test --headed

test-e2e-ui:
	E2E_BASE_URL=$(E2E_BASE_URL) E2E_BACKEND_URL=$(E2E_BACKEND_URL) \
	npx playwright test --ui
