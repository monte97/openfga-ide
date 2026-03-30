.PHONY: help dev dev-local dev-detach stop openfga-start openfga-stop build build-backend build-frontend test test-backend test-frontend lint format type-check install clean

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
	@echo "Test"
	@echo "  test           Run all tests (backend + frontend)"
	@echo "  test-backend   Run backend tests"
	@echo "  test-frontend  Run frontend tests"
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

# ── Test ─────────────────────────────────────────────────────────────────────

test: test-backend test-frontend

test-backend:
	npm --prefix backend test

test-frontend:
	npm --prefix frontend run test:unit -- --run

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
