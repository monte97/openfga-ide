# syntax=docker/dockerfile:1

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build-only

# ── Stage 2: production ───────────────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html

# nginx:alpine processes files in /etc/nginx/templates/ at startup via envsubst
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
