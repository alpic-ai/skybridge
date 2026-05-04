# syntax=docker/dockerfile:1

# Multi-stage Dockerfile for a Skybridge MCP server.
#
# Defaults to npm. If you scaffolded with yarn, pnpm, or bun, swap the
# install/build/prune commands and the lockfile in the COPY line below.

# ---- Build stage ----
FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

USER node

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

EXPOSE 3000

# Run the built server directly rather than via `npm start` / `skybridge start`.
# Each wrapper adds a process layer that can swallow SIGTERM, which makes
# graceful shutdowns time out on platforms like Cloud Run, Fly, and k8s.
CMD ["node", "dist/server.js"]
