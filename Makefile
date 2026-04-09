.PHONY: help dev dev-local dev-detach stop openfga-start openfga-stop build build-backend build-frontend \
  test test-backend test-frontend \
  test-backend-watch test-frontend-watch \
  test-backend-routes test-backend-services test-backend-middleware test-backend-suites \
  test-frontend-stores test-frontend-components test-frontend-composables test-frontend-views \
  test-smoke test-functional test-e2e test-e2e-headed test-e2e-list test-e2e-ui e2e-up e2e-down \
  lint format type-check install clean

include make/test.mk

OPENFGA_CONTAINER = openfga-dev

# Default target
help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Dev"
	@echo "  dev            Start full stack via Docker (frontend + backend + OpenFGA)"
	@echo "  dev-local      Start backend + frontend locally + OpenFGA via Docker"
	@echo "  stop           Stop all containers (Docker stack + standalone OpenFGA)"
	@echo ""
	@echo "Build"
	@echo "  build          Build backend (tsc) and frontend (vite)"
	@echo "  build-backend  Build backend only"
	@echo "  build-frontend Build frontend only"
	@echo ""
	@echo "Test — bulk"
	@echo "  test                    Run all unit tests (backend + frontend)"
	@echo "  test-backend            Run all backend unit tests"
	@echo "  test-frontend           Run all frontend unit tests"
	@echo "  test-backend-watch      Backend tests in watch mode"
	@echo "  test-frontend-watch     Frontend tests in watch mode"
	@echo ""
	@echo "Test — backend by area"
	@echo "  test-backend-routes     Routes only"
	@echo "  test-backend-services   Services only"
	@echo "  test-backend-middleware Middleware only"
	@echo "  test-backend-suites     Test-suite module only"
	@echo ""
	@echo "Test — frontend by area"
	@echo "  test-frontend-stores      Pinia stores only"
	@echo "  test-frontend-components  Components only"
	@echo "  test-frontend-composables Composables only"
	@echo "  test-frontend-views       Views only"
	@echo ""
	@echo "Test — E2E"
	@echo "  test-smoke     Run E2E smoke tests against local dev (no Docker needed)"
	@echo "  test-functional Run E2E functional tests (requires running backend + DB)"
	@echo "  test-e2e       Start E2E environment, run all Playwright tests, tear down"
	@echo "  test-e2e-headed Run all E2E tests with visible browser"
	@echo "  test-e2e-list  List all E2E tests without running them"
	@echo "  test-e2e-ui    Open Playwright UI mode (e2e-up recommended first)"
	@echo "  e2e-up         Start E2E Docker environment (detached)"
	@echo "  e2e-down       Stop E2E Docker environment and remove volumes"
	@echo ""
	@echo "Quality"
	@echo "  lint           Lint frontend (oxlint + eslint)"
	@echo "  format         Format frontend with Prettier"
	@echo "  type-check     Vue type-check (frontend)"
	@echo ""
	@echo "Setup"
	@echo "  install        Install all dependencies"
	@echo "  clean          Remove dist folders"

# ── Dev ──────────────────────────────────────────────────────────────────────

dev:
	docker compose up

dev-detach:
	docker compose up -d

dev-local: openfga-start
	@echo "OpenFGA running at http://localhost:8080"
	@echo "Starting backend and frontend locally..."
	@npm --prefix backend run dev & npm --prefix frontend run dev

openfga-start:
	@if docker ps --format '{{.Names}}' | grep -q '^$(OPENFGA_CONTAINER)$$'; then \
		echo "OpenFGA already running"; \
	else \
		echo "Starting OpenFGA container..."; \
		docker run -d --name $(OPENFGA_CONTAINER) -p 8080:8080 -p 8081:8081 openfga/openfga:latest run; \
		echo "Waiting for OpenFGA to be ready..."; \
		sleep 3; \
	fi

openfga-stop:
	@docker rm -f $(OPENFGA_CONTAINER) 2>/dev/null || true

stop: openfga-stop
	docker compose down

# ── Build ────────────────────────────────────────────────────────────────────

build: build-backend build-frontend

build-backend:
	npm --prefix backend run build

build-frontend:
	npm --prefix frontend run build

# ── Quality ──────────────────────────────────────────────────────────────────

lint:
	npm --prefix frontend run lint

format:
	npm --prefix frontend run format

type-check:
	npm --prefix frontend run type-check

# ── Setup ────────────────────────────────────────────────────────────────────

install:
	npm install

clean:
	rm -rf backend/dist frontend/dist
